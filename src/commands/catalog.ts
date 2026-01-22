import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command } from "commander";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../lang.js";
import { getApiKey } from "../utils/config.js";
import { GeminiClient } from "../utils/gemini.js";
import { readImageFile } from "../utils/image.js";
import { LogDestination, Logger, LogLevel } from "../utils/logger.js";

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

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"];

export async function loadContext(contextPath?: string): Promise<string | undefined> {
  if (!contextPath) return undefined;

  if (contextPath.endsWith(".md")) {
    try {
      return await fs.readFile(contextPath, "utf-8");
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Markdownファイルの読み込みに失敗しました: ${error.message}`);
      }
      throw new Error("Markdownファイルの読み込みに失敗しました");
    }
  }
  return contextPath;
}

async function* walkDir(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        yield fullPath;
      }
    }
  }
}

async function processImages(
  dirPath: string,
  options: { lang: SupportedLanguage; context?: string }
): Promise<ProcessResult[]> {
  const apiKey = await getApiKey();
  const client = new GeminiClient(apiKey);
  const processPromises: Promise<ProcessResult | null>[] = [];

  for await (const filePath of walkDir(dirPath)) {
    processPromises.push(
      (async () => {
        try {
          const imageData = await readImageFile(filePath);
          const caption = await client.generateCaption(imageData, {
            lang: options.lang,
            context: options.context,
          });
          await Logger.info("画像を処理しました", { path: filePath });
          return { file: filePath, caption };
        } catch (error: unknown) {
          await Logger.error(`${filePath}の処理に失敗しました`, {
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })()
    );
  }

  const results = await Promise.all(processPromises);
  return results.filter((result): result is ProcessResult => result !== null);
}

export function formatMarkdownEntry(result: ProcessResult, outputPath?: string): string {
  const imagePath = outputPath ? path.relative(path.dirname(outputPath), result.file) : result.file;
  return `---\n\n# ${result.file}\n\n${result.caption}\n![](${imagePath})\n\n`;
}

export async function outputResults(
  results: ProcessResult[],
  options: { format: "markdown" | "json"; output?: string }
): Promise<void> {
  const content =
    options.format === "json"
      ? JSON.stringify(results, null, 2)
      : results.map((r) => formatMarkdownEntry(r, options.output)).join("");

  if (options.output) {
    await fs.writeFile(options.output, content);
    await Logger.info("ファイルを生成しました", { path: options.output });
  } else {
    console.log(content);
  }
}

interface CommandOptions {
  lang?: string;
  format?: string;
  context?: string;
  output?: string;
}

export function catalogCommand(): Command {
  return new Command("catalog")
    .description("ディレクトリ内の画像を一括でキャプション生成")
    .argument("<dir>", "画像ディレクトリのパス")
    .option(
      "-l, --lang <lang>",
      `出力言語 (${Object.entries(LANGUAGE_DESCRIPTIONS)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")})`,
      "ja"
    )
    .option("-f, --format <format>", "出力フォーマット (markdown または json)", "markdown")
    .option("-c, --context <context>", "コンテキスト情報（.mdファイルパスまたはテキスト）")
    .option("-o, --output <output>", "出力ファイルのパス")
    .action(async (dirPath: string, options: CommandOptions) => {
      // グローバルなロガー設定を初期化
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: LogLevel.INFO,
      });
      Logger.setContext("catalog");

      try {
        const typedOptions: CatalogOptions = {
          lang: (options.lang as SupportedLanguage) || "ja",
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
        process.exit(1);
      }
    });
}
