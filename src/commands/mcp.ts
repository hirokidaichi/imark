import { Command } from "@cliffy/command";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "jsr:@std/path@^1.0.0";
import { z } from "zod";
import { SupportedLanguage } from "../lang.ts";
import { getApiKey } from "../utils/config.ts";
import { saveFileWithUniqueNameIfExists } from "../utils/file.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";
import { ImageType } from "../utils/image_type.ts";
import { AspectRatio, ImageFXClient, SizePreset } from "../utils/imagefx.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";

export const mcpCommand = new Command()
  .description("MCPサーバーを起動します")
  .option("--dir <directory:string>", "作業ディレクトリを指定します", {
    default: Deno.cwd(),
  })
  .option("--debug", "デバッグモードで実行します", {
    default: false,
  })
  .action(async ({ dir, debug }) => {
    // MCPサーバー用のロガーを初期化（ファイルにログを出力）
    const logger = Logger.getInstance({
      name: "mcp",
      destination: LogDestination.FILE,
      minLevel: debug ? LogLevel.DEBUG : LogLevel.INFO,
    });

    logger.info("MCPサーバーを起動します", { dir, debug });

    const apiKey = await getApiKey();
    const geminiClient = new GeminiClient(apiKey);
    const imagefxClient = new ImageFXClient(apiKey);
    // プロセスの作業ディレクトリを変更
    const originalCwd = Deno.cwd();
    try {
      logger.debug("作業ディレクトリを変更します", { from: originalCwd, to: dir });

      const server = new McpServer({
        name: "imark",
        version: "0.1.0",
        workingDirectory: dir,
      });

      // キャプション生成ツール
      server.tool(
        "caption",
        {
          image: z.string().describe(
            "キャプションを生成したい画像ファイルのパス（相対パスまたは絶対パス）",
          ),
          lang: z.enum(["ja", "en"]).optional().describe(
            "生成するキャプションの言語（ja: 日本語、en: 英語）",
          ),
        },
        async ({ image, lang = "ja" }: { image: string; lang?: SupportedLanguage }) => {
          try {
            logger.debug("キャプション生成を開始します", { image, lang });
            const imageData = await readImageFile(join(dir, image));
            const caption = await geminiClient.generateCaption(imageData, { lang });
            logger.debug("キャプション生成が完了しました");
            return {
              content: [{ type: "text", text: caption }],
            };
          } catch (error) {
            if (error instanceof Error) {
              const errorMessage = `画像読み込みに失敗しました。パス: ${image}`;
              logger.error(errorMessage, { error: error.message });
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
          theme: z.string().describe("生成したい画像のテーマや内容を表すテキスト"),
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
          ]).optional().describe("生成する画像のスタイルやタイプ"),
          size: z.enum(["hd", "fullhd", "2k", "4k"]).optional().describe("画像サイズのプリセット"),
          aspectRatio: z.enum(["16:9", "4:3", "1:1", "9:16", "3:4"]).optional().describe(
            "画像のアスペクト比",
          ),
          outputDir: z.string().optional().describe(
            "画像を保存するディレクトリ（指定しない場合は現在の作業ディレクトリ）",
          ),
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
            logger.debug("画像生成を開始します", { theme, type, size, aspectRatio, outputDir });

            const prompt = await geminiClient.generatePrompt(theme, "", { type });
            logger.debug("プロンプト生成が完了しました", { prompt });

            const imageData = await imagefxClient.generateImage(prompt, {
              size,
              aspectRatio,
              type,
            });
            logger.debug("画像生成が完了しました");

            // ファイル名を生成
            const fileName = await geminiClient.generateFileName(theme, {
              maxLength: 40,
              includeRandomNumber: false,
            });
            logger.debug("ファイル名を生成しました", { fileName });

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
            logger.debug("出力パスを生成しました", { outputPath });

            // 画像を保存（ファイルが存在する場合は一意の名前で保存）
            const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, imageData);
            logger.info("画像を保存しました", { path: finalOutputPath });

            return {
              content: [{ type: "text", text: finalOutputPath }],
            };
          } catch (error) {
            if (error instanceof Error) {
              logger.error("画像生成に失敗しました", { error: error.message });
              return {
                content: [{ type: "text", text: `エラー: ${error.message}` }],
                isError: true,
              };
            }
            throw error;
          }
        },
      );

      logger.info("MCPサーバーの準備が完了しました");
      const transport = new StdioServerTransport();
      await server.connect(transport);
    } catch (error) {
      logger.error("MCPサーバーでエラーが発生しました", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // 作業ディレクトリを元に戻す
      logger.debug("作業ディレクトリを元に戻します", { to: originalCwd });
      Deno.chdir(originalCwd);
    }
  });
