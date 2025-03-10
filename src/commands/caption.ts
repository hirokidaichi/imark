import { Command } from "../deps.ts";
import { LANGUAGE_DESCRIPTIONS, SupportedLanguage } from "../lang.ts";
import { getApiKey } from "../utils/config.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";

export const captionCommand = new Command()
  .description("指定した画像のキャプションを生成")
  .arguments("<image:file>")
  .option(
    "-l, --lang <lang:string>",
    `出力言語 (${Object.entries(LANGUAGE_DESCRIPTIONS).map(([k, v]) => `${k}: ${v}`).join(", ")})`,
    {
      default: "ja",
      value: (value: string): SupportedLanguage => {
        const validLanguages = Object.keys(LANGUAGE_DESCRIPTIONS) as SupportedLanguage[];
        if (validLanguages.includes(value as SupportedLanguage)) {
          return value as SupportedLanguage;
        }
        return "ja";
      },
    },
  )
  .option("-f, --format <format:string>", "出力フォーマット (markdown または json)", {
    default: "markdown",
    value: (value: string): "markdown" | "json" => {
      if (value === "markdown" || value === "json") {
        return value;
      }
      return "markdown";
    },
  })
  .option(
    "-c, --context <context:file>",
    "コンテキスト情報（.mdファイルパスまたはテキスト）",
  )
  .action(async (options, imagePath) => {
    try {
      const apiKey = await getApiKey();
      const client = new GeminiClient(apiKey);
      const imageData = await readImageFile(imagePath);

      let context: string | undefined;
      if (options.context) {
        if (options.context.endsWith(".md")) {
          try {
            context = await Deno.readTextFile(options.context);
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
        lang: options.lang,
        context,
      });

      if (options.format === "json") {
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
      Deno.exit(1);
    }
  });
