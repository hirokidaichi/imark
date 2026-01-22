import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey } from "../utils/config.js";
import { saveFileWithUniqueNameIfExists } from "../utils/file.js";
import { GeminiClient } from "../utils/gemini.js";
import { LogDestination, Logger, LogLevel } from "../utils/logger.js";
import {
  DEFAULT_VIDEO_OPTIONS,
  type VideoAspectRatio,
  VideoClient,
  type VideoEngine,
  type VideoResolution,
} from "../utils/video.js";

/**
 * 動画生成コマンドのオプション
 */
interface VideoOptions {
  output?: string;
  duration: string;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  fast: boolean;
  debug: boolean;
}

export function videoCommand(): Command {
  const resolutionChoices: VideoResolution[] = ["720p", "1080p"];
  const aspectRatioChoices: VideoAspectRatio[] = ["16:9", "9:16"];

  return new Command("video")
    .description("動画を生成します (Veo 3.1)")
    .argument("<theme>", "動画生成のテーマ")
    .option("-o, --output <path>", "出力パス（ファイルまたはディレクトリ）")
    .addOption(
      new Option("-d, --duration <seconds>", "動画の長さ（秒、5-8）").default(
        String(DEFAULT_VIDEO_OPTIONS.duration)
      )
    )
    .addOption(
      new Option(
        "-r, --resolution <resolution>",
        `解像度 (${resolutionChoices.join(" | ")})`
      ).default(DEFAULT_VIDEO_OPTIONS.resolution)
    )
    .addOption(
      new Option(
        "-a, --aspect-ratio <ratio>",
        `アスペクト比 (${aspectRatioChoices.join(" | ")})`
      ).default(DEFAULT_VIDEO_OPTIONS.aspectRatio)
    )
    .option("--fast", "高速モード (Veo 3.1 Fast を使用)", false)
    .option("--debug", "デバッグモード", false)
    .action(async (theme: string, options: VideoOptions) => {
      if (!theme) {
        console.log("テーマを指定してください");
        process.exit(1);
      }

      // ロガー設定
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "video" });

      try {
        const apiKey = await getApiKey();
        const geminiClient = new GeminiClient(apiKey);
        const videoClient = new VideoClient(apiKey);

        // エンジン選択
        const engine: VideoEngine = options.fast ? "veo-3.1-fast" : "veo-3.1";

        // 動画生成
        console.log(`動画を生成しています... (エンジン: ${engine})`);
        console.log("※ 動画生成には数分かかる場合があります");

        const duration = parseInt(options.duration, 10);
        if (isNaN(duration) || duration < 5 || duration > 8) {
          throw new Error("動画の長さは5〜8秒の範囲で指定してください");
        }

        const result = await videoClient.generateVideo(theme, {
          engine,
          duration,
          resolution: options.resolution,
          aspectRatio: options.aspectRatio,
        });

        // ファイル名生成
        const fileName = await geminiClient.generateFileName(theme, {
          maxLength: 40,
          includeRandomNumber: false,
        });

        // 出力パス解決
        let outputPath: string;
        if (options.output) {
          const ext = path.extname(options.output).toLowerCase();
          if (ext === ".mp4") {
            outputPath = options.output;
          } else {
            // ディレクトリとして扱う
            outputPath = path.join(options.output, `${fileName}.mp4`);
          }
        } else {
          outputPath = `${fileName}.mp4`;
        }

        // ファイル保存
        const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, result.videoData);

        await logger.info("動画を生成しました", {
          path: finalOutputPath,
          engine,
          duration,
          resolution: options.resolution,
          aspectRatio: options.aspectRatio,
        });

        console.log(`動画を生成しました: ${finalOutputPath}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("動画生成に失敗しました", { error: error.message });
          console.error("エラー:", error.message);
        } else {
          await logger.error("不明なエラーが発生しました");
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });
}
