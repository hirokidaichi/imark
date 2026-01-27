import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey, loadConfig } from "../../utils/config.js";
import { loadContextFile, saveFileWithUniqueNameIfExists } from "../../utils/file.js";
import { GeminiClient } from "../../utils/gemini.js";
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
} from "../../utils/image_constants.js";
import {
  ENGINE_MODEL_IDS,
  type ImageEngine,
  ImageFXClient,
  type ImageFXClientOptions,
} from "../../utils/imagefx.js";
import { LogDestination, Logger, LogLevel } from "../../utils/logger.js";
import { createErrorOutput, createSuccessOutput, printJson } from "../../utils/output.js";
import { getPreset } from "../../utils/preset.js";

/**
 * 画像生成コマンドのオプション
 */
interface GenOptions {
  context?: string;
  output?: string;
  size: string;
  aspectRatio: string;
  type: string;
  format: ImageFormat;
  quality?: number;
  debug: boolean;
  engine: ImageEngine;
  json: boolean;
  dryRun: boolean;
  preset?: string;
}

/**
 * 出力パス情報
 */
interface OutputPathInfo {
  path: string;
  format: ImageFormat;
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

export function imageGenCommand(): Command {
  const sizeChoices = Object.keys(SIZE_PRESETS);
  const aspectRatioChoices = Object.keys(ASPECT_RATIOS);
  const typeChoices = Object.keys(IMAGE_TYPE_PROMPTS);
  const engineChoices = Object.keys(ENGINE_MODEL_IDS);

  return new Command("gen")
    .description("画像を生成します (Imagen 4)")
    .argument("<theme>", "画像生成のテーマ")
    .option("-c, --context <file>", "コンテキストファイルのパス")
    .option("-o, --output <path>", "出力パス（ファイルまたはディレクトリ）")
    .addOption(
      new Option(
        "-s, --size <size>",
        `画像サイズプリセット (${sizeChoices.join(" | ")})`
      ).default(DEFAULT_OPTIONS.size)
    )
    .addOption(
      new Option("-a, --aspect-ratio <ratio>", `アスペクト比 (${aspectRatioChoices.join(" | ")})`).default(
        DEFAULT_OPTIONS.aspectRatio
      )
    )
    .addOption(
      new Option(
        "-t, --type <type>",
        `画像タイプ (${typeChoices.join(" | ")})`
      ).default(DEFAULT_OPTIONS.type)
    )
    .addOption(
      new Option("-f, --format <format>", "画像のフォーマット (png | jpg | jpeg)").default(
        DEFAULT_OPTIONS.format
      )
    )
    .option("-q, --quality <number>", "画像の品質 (1-100)", String(DEFAULT_OPTIONS.quality))
    .option("-d, --debug", "デバッグモード（生成されたプロンプトを表示）", false)
    .option("--json", "JSON形式で出力", false)
    .option("--dry-run", "実行せずに設定を確認", false)
    .option("-p, --preset <name>", "プリセット名 (ergon preset list で一覧表示)")
    .addOption(
      new Option(
        "-e, --engine <engine>",
        `画像生成エンジン (${engineChoices.join(" | ")})`
      ).default("imagen4")
    )
    .action(async (theme: string, options: GenOptions) => {
      if (!theme) {
        console.log("テーマを指定してください");
        process.exit(1);
      }

      // プリセット適用
      let presetEngine: string | undefined;
      let presetFormat: string | undefined;
      let presetAspectRatio: string | undefined;
      let presetType: string | undefined;
      let presetSize: string | undefined;
      let presetQuality: number | undefined;

      if (options.preset) {
        const preset = await getPreset(options.preset);
        if (!preset) {
          const errorMsg = `プリセット '${options.preset}' が見つかりません。\nergon preset list で一覧を確認してください。`;
          if (options.json) {
            printJson(createErrorOutput("image gen", errorMsg, "PRESET_NOT_FOUND"));
          } else {
            console.error("エラー:", errorMsg);
          }
          process.exit(1);
        }
        presetEngine = preset.engine;
        presetFormat = preset.format;
        presetAspectRatio = preset.aspectRatio;
        presetType = preset.type;
        presetSize = preset.size;
        presetQuality = preset.quality;
      }

      // 設定ファイルからデフォルト値を読み込み
      const config = await loadConfig();

      const effectiveEngine = options.engine !== "imagen4"
        ? options.engine
        : presetEngine && !presetEngine.startsWith("nano-banana")
          ? presetEngine as ImageEngine
          : config?.defaultImageEngine && !config.defaultImageEngine.startsWith("nano-banana")
            ? config.defaultImageEngine as ImageEngine
            : options.engine;

      const effectiveFormat = options.format !== DEFAULT_OPTIONS.format
        ? options.format
        : presetFormat
          ? presetFormat
          : config?.defaultImageFormat
            ? config.defaultImageFormat
            : options.format;

      const effectiveAspectRatio = options.aspectRatio !== DEFAULT_OPTIONS.aspectRatio
        ? options.aspectRatio
        : presetAspectRatio
          ? presetAspectRatio
          : config?.defaultAspectRatio
            ? config.defaultAspectRatio
            : options.aspectRatio;

      const effectiveType = options.type !== DEFAULT_OPTIONS.type
        ? options.type
        : presetType
          ? presetType
          : options.type;

      const effectiveSize = options.size !== DEFAULT_OPTIONS.size
        ? options.size
        : presetSize
          ? presetSize
          : options.size;

      const effectiveQuality = options.quality
        ? Number(options.quality)
        : presetQuality
          ? presetQuality
          : DEFAULT_OPTIONS.quality;

      // ロガー設定
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "image-gen" });

      // dry-runモード
      if (options.dryRun) {
        const dryRunInfo = {
          theme,
          engine: effectiveEngine,
          format: effectiveFormat,
          aspectRatio: effectiveAspectRatio,
          type: effectiveType,
          size: effectiveSize,
          quality: effectiveQuality,
          output: options.output || `(自動生成).${effectiveFormat}`,
          ...(options.preset ? { preset: options.preset } : {}),
          ...(options.context ? { context: options.context } : {}),
        };

        if (options.json) {
          printJson(createSuccessOutput("image gen", { dryRun: true, ...dryRunInfo }));
        } else {
          console.log("\n[DRY-RUN] 画像生成");
          console.log("  テーマ:", theme);
          if (options.preset) {
            console.log("  プリセット:", options.preset);
          }
          console.log("  エンジン:", effectiveEngine);
          console.log("  フォーマット:", effectiveFormat);
          console.log("  アスペクト比:", effectiveAspectRatio);
          console.log("  タイプ:", effectiveType);
          console.log("  サイズ:", effectiveSize);
          if (options.context) {
            console.log("  コンテキスト:", options.context);
          }
          console.log("  出力先:", options.output || `(自動生成).${effectiveFormat}`);
          console.log("\nAPIは呼び出されません。実行するには --dry-run を外してください。");
        }
        return;
      }

      try {
        const apiKey = await getApiKey();
        const geminiClient = new GeminiClient(apiKey);

        // Imagen 4: プロンプト生成を経由
        const context = await loadContextFile(options.context);
        const prompt = await geminiClient.generatePrompt(theme, context, {
          type: effectiveType as ImageType,
        });

        if (options.debug) {
          await logger.debug("生成されたプロンプト", {
            prompt,
            type: effectiveType,
            theme,
          });
        }

        const imagefxClient = new ImageFXClient(apiKey);
        const imagefxOptions: ImageFXClientOptions = {
          size: effectiveSize as SizePreset,
          aspectRatio: effectiveAspectRatio as AspectRatio,
          type: effectiveType as ImageType,
          format: effectiveFormat as ImageFormat,
          quality: effectiveQuality,
          engine: effectiveEngine,
        };
        const imageData = await imagefxClient.generateImage(prompt, imagefxOptions);

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

        await logger.info("画像を生成しました", {
          path: finalOutputPath,
          format,
          type: effectiveType,
          size: effectiveSize,
          aspectRatio: effectiveAspectRatio,
          engine: effectiveEngine,
          ...(options.preset ? { preset: options.preset } : {}),
        });

        if (options.json) {
          printJson(
            createSuccessOutput("image gen", {
              path: finalOutputPath,
              format,
              type: effectiveType,
              size: effectiveSize,
              aspectRatio: effectiveAspectRatio,
              engine: effectiveEngine,
              ...(options.preset ? { preset: options.preset } : {}),
            })
          );
        } else {
          console.log(`画像を生成しました: ${finalOutputPath}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("画像生成に失敗しました", { error: error.message });
          if (options.json) {
            printJson(createErrorOutput("image gen", error.message));
          } else {
            console.error("エラー:", error.message);
          }
        } else {
          await logger.error("不明なエラーが発生しました");
          if (options.json) {
            printJson(createErrorOutput("image gen", "不明なエラーが発生しました"));
          } else {
            console.error("不明なエラーが発生しました");
          }
        }
        process.exit(1);
      }
    });
}
