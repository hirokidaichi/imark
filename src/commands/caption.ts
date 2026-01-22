import * as fs from "node:fs/promises";
import { Command } from "commander";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../lang.js";
import { getApiKey } from "../utils/config.js";
import { GeminiClient } from "../utils/gemini.js";
import { readImageFile } from "../utils/image.js";

interface CaptionOptions {
  lang: string;
  format: "markdown" | "json";
  context?: string;
}

export function captionCommand(): Command {
  return new Command("caption")
    .description("指定した画像のキャプションを生成")
    .argument("<image>", "画像ファイルのパス")
    .option(
      "-l, --lang <lang>",
      `出力言語 (${Object.entries(LANGUAGE_DESCRIPTIONS)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")})`,
      "ja"
    )
    .option("-f, --format <format>", "出力フォーマット (markdown または json)", "markdown")
    .option("-c, --context <context>", "コンテキスト情報（.mdファイルパスまたはテキスト）")
    .action(async (imagePath: string, options: CaptionOptions) => {
      try {
        const apiKey = await getApiKey();
        const client = new GeminiClient(apiKey);
        const imageData = await readImageFile(imagePath);

        // 言語バリデーション
        const validLanguages = Object.keys(LANGUAGE_DESCRIPTIONS) as SupportedLanguage[];
        const lang: SupportedLanguage = validLanguages.includes(options.lang as SupportedLanguage)
          ? (options.lang as SupportedLanguage)
          : "ja";

        // フォーマットバリデーション
        const format: "markdown" | "json" =
          options.format === "markdown" || options.format === "json" ? options.format : "markdown";

        let context: string | undefined;
        if (options.context) {
          if (options.context.endsWith(".md")) {
            try {
              context = await fs.readFile(options.context, "utf-8");
            } catch (error: unknown) {
              if (error instanceof Error) {
                throw new Error(`Markdownファイルの読み込みに失敗しました: ${error.message}`);
              }
              throw new Error("Markdownファイルの読み込みに失敗しました");
            }
          } else {
            context = options.context;
          }
        }

        const caption = await client.generateCaption(imageData, {
          lang,
          context,
        });

        if (format === "json") {
          console.log(JSON.stringify({ file: imagePath, caption }, null, 2));
        } else {
          console.log(`# ${imagePath}\n\n${caption}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("エラー:", error.message);
        } else {
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });
}
