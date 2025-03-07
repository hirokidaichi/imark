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
  .option("--debug", "デバッグモードで実行します", {
    default: false,
  })
  .action(async ({ debug }) => {
    // MCPサーバー用のロガーを初期化（ファイルにログを出力）
    const logger = Logger.getInstance({
      name: "mcp",
      destination: LogDestination.FILE,
      minLevel: debug ? LogLevel.DEBUG : LogLevel.INFO,
    });

    const workingDir = Deno.cwd();
    logger.info("MCPサーバーを起動します", { workingDir, debug });

    const apiKey = await getApiKey();
    const geminiClient = new GeminiClient(apiKey);
    const imagefxClient = new ImageFXClient(apiKey);

    try {
      const server = new McpServer({
        name: "imark",
        version: "0.1.0",
      });

      // キャプション生成ツール
      server.tool(
        "caption",
        {
          rootdir: z.string().describe(
            "Working directory path to use as base for relative paths",
          ),
          image: z.string().describe(
            "Path to the image file for which to generate a caption (relative or absolute path)",
          ),
          lang: z.enum(["ja", "en"]).optional().describe(
            "Language for the generated caption (ja: Japanese, en: English)",
          ),
        },
        async (
          { rootdir, image, lang = "ja" }: {
            rootdir: string;
            image: string;
            lang?: SupportedLanguage;
          },
        ) => {
          try {
            logger.debug("キャプション生成を開始します", { rootdir, image, lang });
            const imageData = await readImageFile(join(rootdir, image));
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
          rootdir: z.string().describe(
            "Working directory path to use as base for relative paths",
          ),
          theme: z.string().describe("Theme or content description for the image to be generated"),
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
          ]).optional().describe("Style or type of the image to be generated"),
          size: z.enum(["hd", "fullhd", "2k", "4k"]).optional().describe("Image size preset"),
          aspectRatio: z.enum(["16:9", "4:3", "1:1", "9:16", "3:4"]).optional().describe(
            "Aspect ratio of the generated image",
          ),
          outputDir: z.string().optional().describe(
            "Directory to save the image (uses current working directory if not specified)",
          ),
        },
        async ({
          rootdir,
          theme,
          type = "realistic",
          size = "fullhd",
          aspectRatio = "16:9",
          outputDir = "",
        }: {
          rootdir: string;
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
            const fullOutputDir = outputDir ? join(rootdir, outputDir) : rootdir;
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
    }
  });
