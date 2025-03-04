import { Command } from "@cliffy/command";
import { LANGUAGE_DESCRIPTIONS, SupportedLanguage } from "../lang.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";

export const captionCommand = new Command()
  .description("指定した画像のキャプションを生成")
  .arguments("<image:string>")
  .option(
    "-l, --lang <lang:string>",
    `出力言語 (${Object.entries(LANGUAGE_DESCRIPTIONS).map(([k, v]) => `${k}: ${v}`).join(", ")})`,
    {
      default: "ja",
    },
  )
  .option("-f, --format <format:string>", "出力フォーマット (markdown または json)", {
    default: "markdown",
  })
  .option(
    "-c, --context <context:string>",
    "コンテキスト情報（.mdファイルパスまたはテキスト）",
  )
  .action(async (options, imagePath) => {
    try {
      const apiKey = Deno.env.get("GOOGLE_API_KEY");
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEYが設定されていません");
      }
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
        lang: options.lang as SupportedLanguage,
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
