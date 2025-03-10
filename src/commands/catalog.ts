import { Command, EnumType } from "../deps.ts";
import { walk } from "../deps.ts";
import { dirname, relative } from "../deps.ts";
import { LANGUAGE_DESCRIPTIONS, SupportedLanguage } from "../lang.ts";
import { getApiKey } from "../utils/config.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { readImageFile } from "../utils/image.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";

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

export async function loadContext(
  contextPath?: string,
): Promise<string | undefined> {
  if (!contextPath) return undefined;

  if (contextPath.endsWith(".md")) {
    try {
      return await Deno.readTextFile(contextPath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `Markdownファイルの読み込みに失敗しました: ${error.message}`,
        );
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
  const processPromises: Promise<ProcessResult | null>[] = [];

  for await (
    const entry of walk(dirPath, {
      includeDirs: false,
      exts: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"],
    })
  ) {
    processPromises.push(
      (async () => {
        try {
          const imageData = await readImageFile(entry.path);
          const caption = await client.generateCaption(imageData, {
            lang: options.lang,
            context: options.context,
          });
          await Logger.info("画像を処理しました", { path: entry.path });
          return { file: entry.path, caption };
        } catch (error: unknown) {
          await Logger.error(`${entry.path}の処理に失敗しました`, {
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })(),
    );
  }

  const results = await Promise.all(processPromises);
  return results.filter((result): result is ProcessResult => result !== null);
}

export function formatMarkdownEntry(
  result: ProcessResult,
  outputPath?: string,
): string {
  const imagePath = outputPath ? relative(dirname(outputPath), result.file) : result.file;
  return `---\n\n# ${result.file}\n\n${result.caption}\n![](${imagePath})\n\n`;
}

export async function outputResults(
  results: ProcessResult[],
  options: { format: "markdown" | "json"; output?: string },
): Promise<void> {
  const content = options.format === "json"
    ? JSON.stringify(results, null, 2)
    : results.map((r) => formatMarkdownEntry(r, options.output)).join("");

  if (options.output) {
    await Deno.writeTextFile(options.output, content);
    await Logger.info("ファイルを生成しました", { path: options.output });
  } else {
    console.log(content);
  }
}

const formatType = new EnumType(["markdown", "json"]);

interface CommandOptions {
  lang?: string;
  format?: "markdown" | "json";
  context?: string;
  output?: string;
}

export const catalogCommand = new Command()
  .description("ディレクトリ内の画像を一括でキャプション生成")
  .type("format", formatType)
  .arguments("<dir:string>")
  .option(
    "-l, --lang <lang:string>",
    `出力言語 (${
      Object.entries(LANGUAGE_DESCRIPTIONS).map(([k, v]) => `${k}: ${v}`).join(
        ", ",
      )
    })`,
    {
      default: "ja",
    },
  )
  .option(
    "-f, --format <format:format>",
    "出力フォーマット (markdown または json)",
    {
      default: "markdown",
    },
  )
  .option(
    "-c, --context <context:string>",
    "コンテキスト情報（.mdファイルパスまたはテキスト）",
  )
  .option(
    "-o, --output <output:string>",
    "出力ファイルのパス",
  )
  .action(async (options: CommandOptions, dirPath: string) => {
    // グローバルなロガー設定を初期化
    Logger.setGlobalConfig({
      destination: LogDestination.BOTH,
      minLevel: LogLevel.INFO,
    });
    Logger.setContext("catalog");

    try {
      const typedOptions: CatalogOptions = {
        lang: options.lang as SupportedLanguage,
        format: options.format === "json" ? "json" : "markdown",
        context: options.context,
        output: options.output,
      };
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
        await Logger.error("エラーが発生しました", { error });
      } else {
        await Logger.error("不明なエラーが発生しました");
      }
      Deno.exit(1);
    }
  });
