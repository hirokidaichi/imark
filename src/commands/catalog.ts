import { Command, EnumType } from "@cliffy/command";
import { walk } from "@std/fs/walk";
import { LANGUAGE_DESCRIPTIONS, SupportedLanguage } from "../lang.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";

interface CatalogOptions {
  lang: SupportedLanguage;
  format: "markdown" | "json";
  context?: string;
}

const formatType = new EnumType(["markdown", "json"]);

export const catalogCommand = new Command()
  .description("ディレクトリ内の画像を一括でキャプション生成")
  .type("format", formatType)
  .arguments("<dir:string>")
  .option(
    "-l, --lang <lang:string>",
    `出力言語 (${Object.entries(LANGUAGE_DESCRIPTIONS).map(([k, v]) => `${k}: ${v}`).join(", ")})`,
    {
      default: "ja",
    },
  )
  .option("-f, --format <format:format>", "出力フォーマット (markdown または json)", {
    default: "markdown",
  })
  .option(
    "-c, --context <context:string>",
    "コンテキスト情報（.mdファイルパスまたはテキスト）",
  )
  .action(async (options, dirPath) => {
    try {
      const client = new GeminiClient();
      const results = [];
      const typedOptions = options as CatalogOptions;

      // コンテキストの読み込み
      let context: string | undefined;
      if (typedOptions.context) {
        if (typedOptions.context.endsWith(".md")) {
          try {
            context = await Deno.readTextFile(typedOptions.context);
          } catch (error: unknown) {
            if (error instanceof Error) {
              throw new Error(`Markdownファイルの読み込みに失敗しました: ${error.message}`);
            }
            throw new Error("Markdownファイルの読み込みに失敗しました");
          }
        } else {
          context = typedOptions.context;
        }
      }

      for await (
        const entry of walk(dirPath, {
          includeDirs: false,
          exts: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"],
        })
      ) {
        try {
          const imageData = await readImageFile(entry.path);
          const caption = await client.generateCaption(imageData, {
            lang: typedOptions.lang as SupportedLanguage,
            context,
          });
          results.push({ file: entry.path, caption });

          // 進捗表示
          console.error(`処理完了: ${entry.path}`);
        } catch (error) {
          console.error(`警告: ${entry.path}の処理に失敗しました:`, error);
          continue;
        }
      }

      if (typedOptions.format === "json") {
        console.log(JSON.stringify(results, null, 2));
      } else {
        for (const result of results) {
          console.log(`# ${result.file}\n\n${result.caption}\n![](./${result.file})\n\n`);
        }
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
