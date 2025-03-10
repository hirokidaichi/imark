import { join } from "../../../deps.ts";
import { z } from "../../../deps.ts";
import { SupportedLanguage } from "../../../lang.ts";
import { GeminiClient } from "../../../utils/gemini.ts";
import { readImageFile } from "../../../utils/image.ts";
import { Logger } from "../../../utils/logger.ts";

export const captionTool = {
  name: "caption",
  schema: {
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
  handler: async (
    { rootdir, image, lang = "ja" }: {
      rootdir: string;
      image: string;
      lang?: SupportedLanguage;
    },
    { geminiClient }: { geminiClient: GeminiClient },
  ) => {
    const logger = Logger.getInstance({ name: "caption" });
    logger.debug("キャプションツールが呼び出されました", { rootdir, image, lang });
    try {
      logger.debug("キャプション生成を開始します", { rootdir, image, lang });
      const imageData = await readImageFile(join(rootdir, image));
      const caption = await geminiClient.generateCaption(imageData, { lang });
      logger.debug("キャプション生成が完了しました");
      return {
        content: [{
          type: "text" as const,
          text: caption,
        }],
      };
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = `画像読み込みに失敗しました。パス: ${image}`;
        logger.error(errorMessage, { error: error.message });
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
