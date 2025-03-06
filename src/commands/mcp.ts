import { Command } from "@cliffy/command";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "@std/path";
import { z } from "zod";
import { SupportedLanguage } from "../lang.ts";
import { getApiKey } from "../utils/config.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";
import { ImageType } from "../utils/image_type.ts";
import { AspectRatio, ImageFXClient, SizePreset } from "../utils/imagefx.ts";

export const mcpCommand = new Command()
  .description("MCPサーバーを起動します")
  .option("--dir <directory:string>", "作業ディレクトリを指定します", {
    default: Deno.cwd(),
  })
  .action(async ({ dir }) => {
    const apiKey = await getApiKey();
    const geminiClient = new GeminiClient(apiKey);
    const imagefxClient = new ImageFXClient(apiKey);
    console.error("hello", dir);
    // プロセスの作業ディレクトリを変更
    const originalCwd = Deno.cwd();
    try {
      //console.error("hello2", Deno.cwd());
      const server = new McpServer({
        name: "imark",
        version: "0.1.0",
        workingDirectory: dir,
      });

      // キャプション生成ツール
      server.tool(
        "caption",
        {
          image: z.string(),
          lang: z.enum(["ja", "en"]).optional(),
        },
        async ({ image, lang = "ja" }: { image: string; lang?: SupportedLanguage }) => {
          try {
            const imageData = await readImageFile(join(dir, image));
            const caption = await geminiClient.generateCaption(imageData, { lang });
            return {
              content: [{ type: "text", text: caption }],
            };
          } catch (error) {
            if (error instanceof Error) {
              console.error(`画像読み込みに失敗しました。パス: ${image}`);
              return {
                content: [{ type: "text", text: `エラー: ${error.message}` }],
                isError: true,
              };
            }
            throw error;
          }
        },
      );

      // 画像生成ツール
      server.tool(
        "generate",
        {
          theme: z.string(),
          type: z.enum([
            "realistic",
            "illustration",
            "flat",
            "anime",
            "watercolor",
            "oil-painting",
            "pixel-art",
            "sketch",
            "3d-render",
            "corporate",
            "minimal",
            "pop-art",
          ]).optional(),
          size: z.enum(["hd", "fullhd", "2k", "4k"]).optional(),
          aspectRatio: z.enum(["16:9", "4:3", "1:1", "9:16", "3:4"]).optional(),
          outputDir: z.string().optional(),
        },
        async ({
          theme,
          type = "realistic",
          size = "fullhd",
          aspectRatio = "16:9",
          outputDir = "",
        }: {
          theme: string;
          type?: ImageType;
          size?: SizePreset;
          aspectRatio?: AspectRatio;
          outputDir?: string;
        }) => {
          try {
            const prompt = await geminiClient.generatePrompt(theme, "", { type });
            const imageData = await imagefxClient.generateImage(prompt, {
              size,
              aspectRatio,
              type,
            });

            // ファイル名を生成
            const fileName = await geminiClient.generateFileName(theme, {
              maxLength: 40,
              includeRandomNumber: false,
            });

            // 出力ディレクトリの作成（指定がある場合）
            const fullOutputDir = outputDir ? join(dir, outputDir) : dir;
            try {
              await Deno.mkdir(fullOutputDir, { recursive: true });
            } catch (error) {
              if (!(error instanceof Deno.errors.AlreadyExists)) {
                throw error;
              }
            }

            const outputPath = join(fullOutputDir, `${fileName}.png`);

            // ファイルが存在する場合、乱数を追加して再試行
            let finalOutputPath = outputPath;
            while (true) {
              try {
                await Deno.stat(finalOutputPath);
                // ファイルが存在する場合、乱数を追加
                const baseName = finalOutputPath.slice(0, finalOutputPath.lastIndexOf("."));
                const ext = finalOutputPath.slice(finalOutputPath.lastIndexOf("."));
                const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
                finalOutputPath = `${baseName}-${randomNum}${ext}`;
              } catch (error) {
                if (error instanceof Deno.errors.NotFound) {
                  // ファイルが存在しない場合、このパスを使用
                  break;
                }
                throw error;
              }
            }

            // 画像を保存
            await Deno.writeFile(finalOutputPath, imageData);

            return {
              content: [{ type: "text", text: finalOutputPath }],
            };
          } catch (error) {
            if (error instanceof Error) {
              return {
                content: [{ type: "text", text: `エラー: ${error.message}` }],
                isError: true,
              };
            }
            throw error;
          }
        },
      );

      //console.log("MCPサーバーを起動しました");
      const transport = new StdioServerTransport();
      await server.connect(transport);
    } finally {
      // 作業ディレクトリを元に戻す
      Deno.chdir(originalCwd);
    }
  });
