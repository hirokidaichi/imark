import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey, loadConfig } from "../utils/config.js";
import { saveFileWithUniqueNameIfExists } from "../utils/file.js";
import { GeminiClient } from "../utils/gemini.js";
import {
  ASPECT_RATIOS,
  type AspectRatio,
  DEFAULT_OPTIONS,
  IMAGE_TYPE_PROMPTS,
  type ImageFormat,
  type ImageType,
  SIZE_PRESETS,
  type SizePreset,
  VALID_IMAGE_FORMATS,
} from "../utils/image_constants.js";
import {
  ENGINE_MODEL_IDS,
  type ImageEngine,
  ImageFXClient,
  type ImageFXClientOptions,
} from "../utils/imagefx.js";
import { LogDestination, Logger, LogLevel } from "../utils/logger.js";
import { NanoBananaClient, type NanoBananaEngine } from "../utils/nano-banana.js";

/**
 * 画像生成エンジンタイプ（Imagen4 + Nano Banana）
 */
type GenEngine = ImageEngine | NanoBananaEngine;

/**
 * 画像生成コマンドのオプション
 */
interface ImageOptions {
  input?: string;
  context?: string;
  output?: string;
  size: string;
  aspectRatio: string;
  type: string;
  format: ImageFormat;
  quality?: number;
  debug: boolean;
  engine: GenEngine;
}

/**
 * 出力パス情報
 */
interface OutputPathInfo {
  path: string;
  format: ImageFormat;
}

async function loadContext(contextPath?: string): Promise<string> {
  if (!contextPath) return "";
  try {
    return await fs.readFile(contextPath, "utf-8");
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`コンテキストファイルの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error(`コンテキストファイルの読み込みに失敗しました: ${String(error)}`);
  }
}

function validateImageFormat(ext: string, specifiedFormat?: ImageFormat) {
  if (!VALID_IMAGE_FORMATS.includes(ext as ImageFormat)) {
    throw new Error(`サポートされていない画像フォーマットです: ${ext}`);
  }
  if (specifiedFormat && ext !== specifiedFormat) {
    throw new Error(
      `出力ファイルの拡張子(${ext})と指定されたフォーマット(${specifiedFormat})が一致しません`
    );
  }
}

async function resolveOutputPath(
  outputPath: string | undefined,
  defaultFormat: ImageFormat,
  fileName: string
): Promise<OutputPathInfo> {
  let format = defaultFormat;

  if (!outputPath) {
    return { path: `${fileName}.${format}`, format };
  }

  try {
    const stat = await fs.stat(outputPath);
    if (stat.isDirectory()) {
      return { path: path.join(outputPath, `${fileName}.${format}`), format };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const ext = path.extname(outputPath).toLowerCase().slice(1);
  if (ext) {
    validateImageFormat(ext, defaultFormat);
    format = ext as ImageFormat;
  } else {
    outputPath = `${outputPath}.${format}`;
  }

  return { path: outputPath, format };
}

export function imageCommand(): Command {
  const sizeChoices = Object.keys(SIZE_PRESETS);
  const aspectRatioChoices = Object.keys(ASPECT_RATIOS);
  const typeChoices = Object.keys(IMAGE_TYPE_PROMPTS);
  const engineChoices = [...Object.keys(ENGINE_MODEL_IDS), "nano-banana", "nano-banana-pro"];

  return new Command("image")
    .description("画像を生成します (Imagen 4 / Nano Banana)")
    .argument("<theme>", "画像生成のテーマ または 画像編集の指示")
    .option("-i, --input <file>", "入力画像のパス（画像編集モード、Nano Banana専用）")
    .option("-c, --context <file>", "コンテキストファイルのパス")
    .option("-o, --output <path>", "出力パス（ファイルまたはディレクトリ）")
    .addOption(
      new Option(
        "-s, --size <size>",
        `画像サイズプリセット (${sizeChoices.join(" | ")})`
      ).default(DEFAULT_OPTIONS.size)
    )
    .addOption(
      new Option(
        "-a, --aspect-ratio <ratio>",
        `アスペクト比 (${aspectRatioChoices.join(" | ")})`
      ).default(DEFAULT_OPTIONS.aspectRatio)
    )
    .addOption(
      new Option(
        "-t, --type <type>",
        `画像タイプ (${typeChoices.join(" | ")})`
      ).default(DEFAULT_OPTIONS.type)
    )
    .addOption(
      new Option("-f, --format <format>", "画像のフォーマット (png | jpg | jpeg | webp)").default(
        DEFAULT_OPTIONS.format
      )
    )
    .option("-q, --quality <number>", "画像の品質 (1-100)", String(DEFAULT_OPTIONS.quality))
    .option("-d, --debug", "デバッグモード（生成されたプロンプトを表示）", false)
    .addOption(
      new Option(
        "-e, --engine <engine>",
        `画像生成エンジン (${engineChoices.join(" | ")})`
      ).default("imagen4")
    )
    .action(async (theme: string, options: ImageOptions) => {
      if (!theme) {
        console.log("テーマを指定してください");
        process.exit(1);
      }

      // 設定ファイルからデフォルト値を読み込み
      const config = await loadConfig();
      const effectiveEngine = (options.engine === "imagen4" && config?.defaultImageEngine)
        ? config.defaultImageEngine
        : options.engine;
      const effectiveFormat = (options.format === DEFAULT_OPTIONS.format && config?.defaultImageFormat)
        ? config.defaultImageFormat
        : options.format;
      const effectiveAspectRatio = (options.aspectRatio === DEFAULT_OPTIONS.aspectRatio && config?.defaultAspectRatio)
        ? config.defaultAspectRatio
        : options.aspectRatio;

      // ロガー設定
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "image" });

      // 画像編集モードの場合はNano Bananaエンジンを強制
      const isEditMode = !!options.input;
      if (isEditMode) {
        const engine = effectiveEngine as GenEngine;
        if (engine !== "nano-banana" && engine !== "nano-banana-pro") {
          console.log("画像編集モードではNano Bananaエンジン (-e nano-banana) を使用してください");
          process.exit(1);
        }
      }

      try {
        const apiKey = await getApiKey();
        const geminiClient = new GeminiClient(apiKey);

        let imageData: Uint8Array;
        const engine = effectiveEngine as GenEngine;

        if (isEditMode) {
          // 画像編集モード
          const nanoBananaClient = new NanoBananaClient(apiKey);
          const result = await nanoBananaClient.editImage(options.input!, theme, {
            engine: engine as NanoBananaEngine,
          });
          imageData = result.imageData;

          if (options.debug) {
            await logger.debug("画像編集モード", {
              input: options.input,
              prompt: theme,
              engine: effectiveEngine,
            });
          }
        } else if (engine === "nano-banana" || engine === "nano-banana-pro") {
          // Nano Banana: 直接ユーザー入力を使用（Geminiが日本語を理解できるため）
          const context = await loadContext(options.context);
          const directPrompt = context ? `${theme}\n\nコンテキスト:\n${context}` : theme;

          if (options.debug) {
            await logger.debug("Nano Banana直接モード", {
              prompt: directPrompt,
              engine: effectiveEngine,
            });
          }

          const nanoBananaClient = new NanoBananaClient(apiKey);
          const result = await nanoBananaClient.generateImage(directPrompt, {
            engine: engine as NanoBananaEngine,
          });
          imageData = result.imageData;
        } else {
          // Imagen 4: プロンプト生成を経由
          const context = await loadContext(options.context);
          const prompt = await geminiClient.generatePrompt(theme, context, {
            type: options.type as ImageType,
          });

          if (options.debug) {
            await logger.debug("生成されたプロンプト", {
              prompt,
              type: options.type,
              theme,
            });
          }

          const imagefxClient = new ImageFXClient(apiKey);
          const imagefxOptions: ImageFXClientOptions = {
            size: options.size as SizePreset,
            aspectRatio: effectiveAspectRatio as AspectRatio,
            type: options.type as ImageType,
            format: effectiveFormat as ImageFormat,
            quality: options.quality ? Number(options.quality) : DEFAULT_OPTIONS.quality,
            engine: engine as ImageEngine,
          };
          imageData = await imagefxClient.generateImage(prompt, imagefxOptions);
        }

        // ファイル名生成
        const fileName = await geminiClient.generateFileName(theme, {
          maxLength: 40,
          includeRandomNumber: false,
        });

        // 出力パス解決
        const { path: outputPath, format } = await resolveOutputPath(
          options.output,
          effectiveFormat as ImageFormat,
          fileName
        );

        // ファイル保存
        const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, imageData);

        const logMessage = isEditMode ? "画像を編集しました" : "画像を生成しました";
        await logger.info(logMessage, {
          path: finalOutputPath,
          format,
          type: options.type,
          size: options.size,
          aspectRatio: effectiveAspectRatio,
          engine: effectiveEngine,
          ...(isEditMode ? { input: options.input } : {}),
        });

        console.log(`${logMessage}: ${finalOutputPath}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          const errorMessage = isEditMode ? "画像編集に失敗しました" : "画像生成に失敗しました";
          await logger.error(errorMessage, { error: error.message });
          console.error("エラー:", error.message);
        } else {
          await logger.error("不明なエラーが発生しました");
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });
}
