import { join } from "../../../deps.ts";
import { z } from "../../../deps.ts";
import { saveFileWithUniqueNameIfExists } from "../../../utils/file.ts";
import { GeminiClient } from "../../../utils/gemini.ts";
import { AspectRatio, ImageFXClient, ImageType, SizePreset } from "../../../utils/imagefx.ts";
import { Logger } from "../../../utils/logger.ts";

export const generateTool = {
  name: "generate",
  schema: {
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
  handler: async (
    {
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
    },
    { geminiClient, imagefxClient }: { geminiClient: GeminiClient; imagefxClient: ImageFXClient },
  ) => {
    const logger = Logger.getInstance({ name: "generate" });
    logger.debug("画像生成ツールが呼び出されました", {
      rootdir,
      theme,
      type,
      size,
      aspectRatio,
      outputDir,
    });
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
        content: [{
          type: "text" as const,
          text: finalOutputPath,
        }],
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.error("画像生成に失敗しました", { error: error.message });
        return {
          content: [{
            type: "text" as const,
            text: `エラー: ${error.message}`,
          }],
          isError: true,
        };
      }
      throw error;
    }
  },
};
