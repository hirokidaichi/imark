import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command } from "commander";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../../lang.js";
import { getApiKey, loadConfig } from "../../utils/config.js";
import { GeminiClient } from "../../utils/gemini.js";

/**
 * 画像データ
 */
interface ImageData {
  data: string;
  mimeType: string;
}

/**
 * explainコマンドのオプション
 */
interface ExplainOptions {
  lang: string;
  format: "markdown" | "json";
  context?: string;
  output?: string;
}

/**
 * ファイル拡張子からMIMEタイプを取得
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1);

  const imageFormats: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };

  if (imageFormats[ext]) {
    return imageFormats[ext];
  }

  throw new Error(
    `サポートされていないファイル形式です: .${ext}\n` +
      `対応形式: ${Object.keys(imageFormats).join(", ")}`
  );
}

/**
 * 画像ファイルを読み込む
 */
async function readImageFile(filePath: string): Promise<ImageData> {
  try {
    await fs.access(filePath);

    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString("base64");
    const mimeType = getMimeType(filePath);

    return {
      data: base64Data,
      mimeType,
    };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`ファイルが見つかりません: ${filePath}`);
    }
    if (error instanceof Error) {
      throw new Error(`ファイルの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error("ファイルの読み込みに失敗しました");
  }
}

/**
 * コンテキストファイルを読み込む
 */
async function loadContext(contextPath?: string): Promise<string | undefined> {
  if (!contextPath) return undefined;

  if (contextPath.endsWith(".md") || contextPath.endsWith(".txt")) {
    try {
      return await fs.readFile(contextPath, "utf-8");
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`コンテキストファイルの読み込みに失敗しました: ${error.message}`);
      }
      throw new Error("コンテキストファイルの読み込みに失敗しました");
    }
  }

  return contextPath;
}

export function imageExplainCommand(): Command {
  return new Command("explain")
    .description("画像の内容を説明")
    .argument("<file>", "画像ファイルのパス")
    .option(
      "-l, --lang <lang>",
      `出力言語 (${Object.entries(LANGUAGE_DESCRIPTIONS)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")})`,
      "ja"
    )
    .option("-f, --format <format>", "出力フォーマット (markdown または json)", "markdown")
    .option("-c, --context <context>", "コンテキスト情報（ファイルパスまたはテキスト）")
    .option("-o, --output <path>", "出力ファイルパス")
    .action(async (filePath: string, options: ExplainOptions) => {
      try {
        // 設定ファイルからデフォルト値を読み込み
        const config = await loadConfig();
        const effectiveLang = (options.lang === "ja" && config?.defaultLanguage)
          ? config.defaultLanguage
          : options.lang;

        const apiKey = await getApiKey();
        const client = new GeminiClient(apiKey);

        // 画像ファイル読み込み
        const imageData = await readImageFile(filePath);

        // 言語バリデーション
        const validLanguages = Object.keys(LANGUAGE_DESCRIPTIONS) as SupportedLanguage[];
        const lang: SupportedLanguage = validLanguages.includes(effectiveLang as SupportedLanguage)
          ? (effectiveLang as SupportedLanguage)
          : "ja";

        // フォーマットバリデーション
        const format: "markdown" | "json" =
          options.format === "markdown" || options.format === "json" ? options.format : "markdown";

        // コンテキスト読み込み
        const context = await loadContext(options.context);

        // 説明生成
        const explanation = await client.generateExplanation(
          { data: imageData.data, mimeType: imageData.mimeType, type: "image" },
          { lang, context }
        );

        // 出力フォーマット
        let output: string;
        if (format === "json") {
          output = JSON.stringify(
            {
              file: filePath,
              type: "image",
              explanation,
            },
            null,
            2
          );
        } else {
          output = `# ${filePath}\n\n**種類:** 画像\n\n${explanation}`;
        }

        // 出力
        if (options.output) {
          await fs.writeFile(options.output, output, "utf-8");
          console.log(`説明を保存しました: ${options.output}`);
        } else {
          console.log(output);
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
