import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey } from "../utils/config.js";
import { saveFileWithUniqueNameIfExists } from "../utils/file.js";
import { GeminiClient } from "../utils/gemini.js";
import { LogDestination, Logger, LogLevel } from "../utils/logger.js";
import {
  DEFAULT_TTS_OPTIONS,
  TTS_FORMATS,
  TTS_LANGUAGES,
  TTS_VOICES,
  TTSClient,
  type TTSFormat,
  type TTSLanguage,
  type TTSVoice,
} from "../utils/tts.js";

/**
 * 音声生成コマンドのオプション
 */
interface AudioOptions {
  output?: string;
  voice: TTSVoice;
  lang: TTSLanguage;
  format: TTSFormat;
  speed: string;
  debug: boolean;
}

export function audioCommand(): Command {
  return new Command("audio")
    .description("音声を生成します (TTS)")
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
    .action(async (text: string, options: AudioOptions) => {
      if (!text) {
        console.log("テキストを指定してください");
        process.exit(1);
      }

      // ロガー設定
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "audio" });

      try {
        const apiKey = await getApiKey();
        const ttsClient = new TTSClient(apiKey);
        const geminiClient = new GeminiClient(apiKey);

        // 音声の検証
        if (!TTS_VOICES.includes(options.voice)) {
          throw new Error(`無効な音声: ${options.voice}`);
        }

        // 言語の検証
        if (!TTS_LANGUAGES.includes(options.lang)) {
          throw new Error(`無効な言語: ${options.lang}`);
        }

        // フォーマットの検証
        if (!TTS_FORMATS.includes(options.format)) {
          throw new Error(`無効なフォーマット: ${options.format}`);
        }

        // 話速の解析と検証
        const speed = parseFloat(options.speed);
        if (isNaN(speed) || speed < 0.25 || speed > 4.0) {
          throw new Error("話速は0.25〜4.0の範囲で指定してください");
        }

        console.log(`音声を生成しています... (音声: ${options.voice})`);

        // 音声生成
        const result = await ttsClient.generateSpeech(text, {
          voice: options.voice,
          language: options.lang,
          format: options.format,
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
            outputPath = path.join(options.output, `${fileName}.${options.format}`);
          }
        } else {
          outputPath = `${fileName}.${options.format}`;
        }

        // ファイル保存
        const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, result.audioData);

        await logger.info("音声を生成しました", {
          path: finalOutputPath,
          voice: options.voice,
          language: options.lang,
          format: options.format,
          speed,
        });

        console.log(`音声を生成しました: ${finalOutputPath}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("音声生成に失敗しました", { error: error.message });
          console.error("エラー:", error.message);
        } else {
          await logger.error("不明なエラーが発生しました");
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });
}
