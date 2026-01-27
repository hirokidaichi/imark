import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey } from "../../utils/config.js";
import { saveFileWithUniqueNameIfExists } from "../../utils/file.js";
import { GeminiClient } from "../../utils/gemini.js";
import { t } from "../../utils/i18n.js";
import { DEFAULT_OPTIONS, type ImageFormat, VALID_IMAGE_FORMATS } from "../../utils/image_constants.js";
import { LogDestination, Logger, LogLevel } from "../../utils/logger.js";
import { NanoBananaClient, type NanoBananaEngine } from "../../utils/nano-banana.js";
import { createErrorOutput, createSuccessOutput, printJson } from "../../utils/output.js";

/**
 * 画像編集コマンドのオプション
 */
interface EditOptions {
  output?: string;
  format: ImageFormat;
  debug: boolean;
  engine: NanoBananaEngine;
  json: boolean;
  dryRun: boolean;
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

export function imageEditCommand(): Command {
  return new Command("edit")
    .description(t("imageEditCmd"))
    .argument("<file>", "編集する画像ファイルのパス")
    .argument("<prompt>", "編集指示（例: 背景を青空に変更）")
    .option("-o, --output <path>", "出力パス（ファイルまたはディレクトリ）")
    .addOption(
      new Option("-f, --format <format>", "画像のフォーマット (png | jpg | jpeg | webp)").default(
        DEFAULT_OPTIONS.format
      )
    )
    .option("-d, --debug", "デバッグモード", false)
    .option("--json", "JSON形式で出力", false)
    .option("--dry-run", "実行せずに設定を確認", false)
    .addOption(
      new Option(
        "-e, --engine <engine>",
        "画像編集エンジン (nano-banana | nano-banana-pro)"
      ).default("nano-banana")
    )
    .action(async (inputFile: string, prompt: string, options: EditOptions) => {
      if (!inputFile) {
        console.log("編集する画像ファイルを指定してください");
        process.exit(1);
      }

      if (!prompt) {
        console.log("編集指示を指定してください");
        process.exit(1);
      }

      // ロガー設定
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "image-edit" });

      // 入力ファイルの存在確認
      try {
        await fs.access(inputFile);
      } catch {
        const errorMsg = `入力画像が見つかりません: ${inputFile}`;
        if (options.json) {
          printJson(createErrorOutput("image edit", errorMsg, "FILE_NOT_FOUND"));
        } else {
          console.error("エラー:", errorMsg);
        }
        process.exit(1);
      }

      // 入力ファイルの形式確認
      const inputExt = path.extname(inputFile).toLowerCase().slice(1);
      const validInputFormats = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!validInputFormats.includes(inputExt)) {
        const errorMsg = `サポートされていない画像形式です: .${inputExt}\n対応形式: ${validInputFormats.join(", ")}`;
        if (options.json) {
          printJson(createErrorOutput("image edit", errorMsg, "INVALID_FORMAT"));
        } else {
          console.error("エラー:", errorMsg);
        }
        process.exit(1);
      }

      // dry-runモード
      if (options.dryRun) {
        const dryRunInfo = {
          input: inputFile,
          prompt,
          engine: options.engine,
          format: options.format,
          output: options.output || `(自動生成).${options.format}`,
        };

        if (options.json) {
          printJson(createSuccessOutput("image edit", { dryRun: true, ...dryRunInfo }));
        } else {
          console.log("\n[DRY-RUN] 画像編集");
          console.log("  入力画像:", inputFile);
          console.log("  編集指示:", prompt);
          console.log("  エンジン:", options.engine);
          console.log("  フォーマット:", options.format);
          console.log("  出力先:", options.output || `(自動生成).${options.format}`);
          console.log("\nAPIは呼び出されません。実行するには --dry-run を外してください。");
        }
        return;
      }

      try {
        const apiKey = await getApiKey();
        const nanoBananaClient = new NanoBananaClient(apiKey);
        const geminiClient = new GeminiClient(apiKey);

        console.log(`画像を編集しています... (エンジン: ${options.engine})`);

        // 画像編集
        const result = await nanoBananaClient.editImage(inputFile, prompt, {
          engine: options.engine,
        });

        if (options.debug) {
          await logger.debug("画像編集モード", {
            input: inputFile,
            prompt,
            engine: options.engine,
          });
        }

        // ファイル名生成
        const fileName = await geminiClient.generateFileName(prompt, {
          maxLength: 40,
          includeRandomNumber: false,
        });

        // 出力パス解決
        const { path: outputPath, format } = await resolveOutputPath(
          options.output,
          options.format,
          fileName
        );

        // ファイル保存
        const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, result.imageData);

        await logger.info("画像を編集しました", {
          path: finalOutputPath,
          format,
          engine: options.engine,
          input: inputFile,
        });

        if (options.json) {
          printJson(
            createSuccessOutput("image edit", {
              path: finalOutputPath,
              format,
              engine: options.engine,
              input: inputFile,
            })
          );
        } else {
          console.log(`画像を編集しました: ${finalOutputPath}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("画像編集に失敗しました", { error: error.message });
          if (options.json) {
            printJson(createErrorOutput("image edit", error.message));
          } else {
            console.error("エラー:", error.message);
          }
        } else {
          await logger.error("不明なエラーが発生しました");
          if (options.json) {
            printJson(createErrorOutput("image edit", "不明なエラーが発生しました"));
          } else {
            console.error("不明なエラーが発生しました");
          }
        }
        process.exit(1);
      }
    });
}
