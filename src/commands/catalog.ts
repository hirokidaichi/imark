import { Command, EnumType } from "@cliffy/command";
import { walk } from "@std/fs/walk";
import { LANGUAGE_DESCRIPTIONS, SupportedLanguage } from "../lang.ts";
import { getApiKey } from "../utils/config.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";

export interface CatalogOptions {
  lang: SupportedLanguage;
  format: "markdown" | "json";
  context?: string;
  output?: string;
}

export interface ProcessResult {
  file: string;
  caption: string;
}

export async function loadContext(contextPath?: string): Promise<string | undefined> {
  if (!contextPath) return undefined;

  if (contextPath.endsWith(".md")) {
    try {
      return await Deno.readTextFile(contextPath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Markdownファイルの読み込みに失敗しました: ${error.message}`);
      }
      throw new Error("Markdownファイルの読み込みに失敗しました");
    }
  }
  return contextPath;
}

async function processImages(
  dirPath: string,
  options: { lang: SupportedLanguage; context?: string },
): Promise<ProcessResult[]> {
  const apiKey = await getApiKey();
  const client = new GeminiClient(apiKey);
  const results: ProcessResult[] = [];

  for await (
    const entry of walk(dirPath, {
      includeDirs: false,
      exts: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"],
    })
  ) {
    try {
      const imageData = await readImageFile(entry.path);
      const caption = await client.generateCaption(imageData, {
        lang: options.lang,
        context: options.context,
      });
      results.push({ file: entry.path, caption });
      console.error(`処理完了: ${entry.path}`);
    } catch (error) {
      console.error(`警告: ${entry.path}の処理に失敗しました:`, error);
    }
  }

  return results;
}

export function formatMarkdownEntry(result: ProcessResult): string {
  return `---\n\n# ${result.file}\n\n${result.caption}\n![](./${result.file})\n\n`;
}

export async function outputResults(
  results: ProcessResult[],
  options: { format: "markdown" | "json"; output?: string },
): Promise<void> {
  const content = options.format === "json"
    ? JSON.stringify(results, null, 2)
    : results.map(formatMarkdownEntry).join("");

  if (options.output) {
    await Deno.writeTextFile(options.output, content);
  } else {
    console.log(content);
  }
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
  .option(
    "-o, --output <output:string>",
    "出力ファイルのパス",
  )
  .action(async (options, dirPath) => {
    try {
      const typedOptions = options as CatalogOptions;
      const context = await loadContext(typedOptions.context);
      const results = await processImages(dirPath, {
        lang: typedOptions.lang,
        context,
      });
      await outputResults(results, {
        format: typedOptions.format,
        output: typedOptions.output,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("エラー:", error.message);
      } else {
        console.error("不明なエラーが発生しました");
      }
      Deno.exit(1);
    }
  });
