import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command } from "commander";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../lang.js";
import { getApiKey } from "../utils/config.js";
import { GeminiClient } from "../utils/gemini.js";

/**
 * メディアファイルの種類
 */
type MediaType = "image" | "audio";

/**
 * メディアデータ
 */
interface MediaData {
  data: string;
  mimeType: string;
  type: MediaType;
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
 * ファイル拡張子からMIMEタイプとメディアタイプを取得
 */
function getMediaInfo(filePath: string): { mimeType: string; type: MediaType } {
  const ext = path.extname(filePath).toLowerCase().slice(1);

  // 画像フォーマット
  const imageFormats: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };

  // 音声フォーマット
  const audioFormats: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    aac: "audio/aac",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
  };

  if (imageFormats[ext]) {
    return { mimeType: imageFormats[ext], type: "image" };
  }

  if (audioFormats[ext]) {
    return { mimeType: audioFormats[ext], type: "audio" };
  }

  throw new Error(
    `サポートされていないファイル形式です: .${ext}\n` +
      `対応形式 - 画像: ${Object.keys(imageFormats).join(", ")} / 音声: ${Object.keys(audioFormats).join(", ")}`
  );
}

/**
 * メディアファイルを読み込む
 */
async function readMediaFile(filePath: string): Promise<MediaData> {
  try {
    // ファイル存在チェック
    await fs.access(filePath);

    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString("base64");
    const { mimeType, type } = getMediaInfo(filePath);

    return {
      data: base64Data,
      mimeType,
      type,
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

export function explainCommand(): Command {
  return new Command("explain")
    .description("画像または音声ファイルの内容を説明")
    .argument("<file>", "画像または音声ファイルのパス")
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
        const apiKey = await getApiKey();
        const client = new GeminiClient(apiKey);

        // メディアファイル読み込み
        const mediaData = await readMediaFile(filePath);

        // 言語バリデーション
        const validLanguages = Object.keys(LANGUAGE_DESCRIPTIONS) as SupportedLanguage[];
        const lang: SupportedLanguage = validLanguages.includes(options.lang as SupportedLanguage)
          ? (options.lang as SupportedLanguage)
          : "ja";

        // フォーマットバリデーション
        const format: "markdown" | "json" =
          options.format === "markdown" || options.format === "json" ? options.format : "markdown";

        // コンテキスト読み込み
        const context = await loadContext(options.context);

        // 説明生成
        const explanation = await client.generateExplanation(mediaData, {
          lang,
          context,
        });

        // 出力フォーマット
        let output: string;
        if (format === "json") {
          output = JSON.stringify(
            {
              file: filePath,
              type: mediaData.type,
              explanation,
            },
            null,
            2
          );
        } else {
          const typeLabel = mediaData.type === "image" ? "画像" : "音声";
          output = `# ${filePath}\n\n**種類:** ${typeLabel}\n\n${explanation}`;
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
