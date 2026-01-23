import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey, loadConfig } from "../../utils/config.js";
import { saveFileWithUniqueNameIfExists } from "../../utils/file.js";
import { GeminiClient } from "../../utils/gemini.js";
import { LogDestination, Logger, LogLevel } from "../../utils/logger.js";
import { createErrorOutput, createSuccessOutput, printJson } from "../../utils/output.js";
import {
  DEFAULT_TTS_OPTIONS,
  TTS_FORMATS,
  TTS_LANGUAGES,
  TTS_VOICES,
  TTSClient,
  type TTSFormat,
  type TTSLanguage,
  type TTSVoice,
} from "../../utils/tts.js";

/**
 * 音声生成コマンドのオプション
 */
interface GenOptions {
  output?: string;
  voice: TTSVoice;
  lang: TTSLanguage;
  format: TTSFormat;
  speed: string;
  debug: boolean;
  json: boolean;
  dryRun: boolean;
}

export function narrationGenCommand(): Command {
  return new Command("gen")
    .description("音声ナレーションを生成します (TTS)")
    .argument("<text>", "読み上げるテキスト")
    .option("-o, --output <path>", "出力パス（ファイルまたはディレクトリ）")
    .addOption(
      new Option("-v, --voice <voice>", `音声 (${TTS_VOICES.join(" | ")})`).default(
        DEFAULT_TTS_OPTIONS.voice
      )
    )
    .addOption(
      new Option("-l, --lang <lang>", `言語 (${TTS_LANGUAGES.join(" | ")})`).default(
        DEFAULT_TTS_OPTIONS.language
      )
    )
    .addOption(
      new Option("-f, --format <format>", `形式 (${TTS_FORMATS.join(" | ")})`).default(
        DEFAULT_TTS_OPTIONS.format
      )
    )
    .addOption(
      new Option("--speed <speed>", "話速 (0.25-4.0)").default(String(DEFAULT_TTS_OPTIONS.speed))
    )
    .option("--debug", "デバッグモード", false)
    .option("--json", "JSON形式で出力", false)
    .option("--dry-run", "実行せずに設定を確認", false)
    .action(async (text: string, options: GenOptions) => {
      if (!text) {
        console.log("テキストを指定してください");
        process.exit(1);
      }

      // 設定ファイルからデフォルト値を読み込み
      const config = await loadConfig();
      const effectiveVoice = (options.voice === DEFAULT_TTS_OPTIONS.voice && config?.defaultAudioVoice)
        ? config.defaultAudioVoice
        : options.voice;
      const effectiveFormat = (options.format === DEFAULT_TTS_OPTIONS.format && config?.defaultAudioFormat)
        ? config.defaultAudioFormat
        : options.format;

      // ロガー設定
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "narration-gen" });

      // dry-runモード
      if (options.dryRun) {
        const dryRunInfo = {
          text: text.length > 100 ? text.substring(0, 100) + "..." : text,
          voice: effectiveVoice,
          language: options.lang,
          format: effectiveFormat,
          speed: options.speed,
          output: options.output || `(自動生成).${effectiveFormat}`,
        };

        if (options.json) {
          printJson(createSuccessOutput("narration gen", { dryRun: true, ...dryRunInfo }));
        } else {
          console.log("\n[DRY-RUN] 音声生成");
          console.log("  テキスト:", dryRunInfo.text);
          console.log("  音声:", effectiveVoice);
          console.log("  言語:", options.lang);
          console.log("  フォーマット:", effectiveFormat);
          console.log("  話速:", options.speed);
          console.log("  出力先:", options.output || `(自動生成).${effectiveFormat}`);
          console.log("\nAPIは呼び出されません。実行するには --dry-run を外してください。");
        }
        return;
      }

      try {
        const apiKey = await getApiKey();
        const ttsClient = new TTSClient(apiKey);
        const geminiClient = new GeminiClient(apiKey);

        // 音声の検証
        if (!TTS_VOICES.includes(effectiveVoice as TTSVoice)) {
          throw new Error(`無効な音声: ${effectiveVoice}`);
        }

        // 言語の検証
        if (!TTS_LANGUAGES.includes(options.lang)) {
          throw new Error(`無効な言語: ${options.lang}`);
        }

        // フォーマットの検証
        if (!TTS_FORMATS.includes(effectiveFormat as TTSFormat)) {
          throw new Error(`無効なフォーマット: ${effectiveFormat}`);
        }

        // 話速の解析と検証
        const speed = parseFloat(options.speed);
        if (isNaN(speed) || speed < 0.25 || speed > 4.0) {
          throw new Error("話速は0.25〜4.0の範囲で指定してください");
        }

        console.log(`音声を生成しています... (音声: ${effectiveVoice})`);

        // 音声生成
        const result = await ttsClient.generateSpeech(text, {
          voice: effectiveVoice as TTSVoice,
          language: options.lang,
          format: effectiveFormat as TTSFormat,
          speed,
        });

        // ファイル名生成（テキストの先頭から）
        const fileName = await geminiClient.generateFileName(text.substring(0, 50), {
          maxLength: 40,
          includeRandomNumber: false,
        });

        // 出力パス解決
        let outputPath: string;
        if (options.output) {
          const ext = path.extname(options.output).toLowerCase().slice(1);
          if (ext && TTS_FORMATS.includes(ext as TTSFormat)) {
            outputPath = options.output;
          } else {
            // ディレクトリとして扱う
            outputPath = path.join(options.output, `${fileName}.${effectiveFormat}`);
          }
        } else {
          outputPath = `${fileName}.${effectiveFormat}`;
        }

        // ファイル保存
        const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, result.audioData);

        await logger.info("音声を生成しました", {
          path: finalOutputPath,
          voice: effectiveVoice,
          language: options.lang,
          format: effectiveFormat,
          speed,
        });

        if (options.json) {
          printJson(
            createSuccessOutput("narration gen", {
              path: finalOutputPath,
              voice: effectiveVoice,
              language: options.lang,
              format: effectiveFormat,
              speed,
            })
          );
        } else {
          console.log(`音声を生成しました: ${finalOutputPath}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("音声生成に失敗しました", { error: error.message });
          if (options.json) {
            printJson(createErrorOutput("narration gen", error.message));
          } else {
            console.error("エラー:", error.message);
          }
        } else {
          await logger.error("不明なエラーが発生しました");
          if (options.json) {
            printJson(createErrorOutput("narration gen", "不明なエラーが発生しました"));
          } else {
            console.error("不明なエラーが発生しました");
          }
        }
        process.exit(1);
      }
    });
}
