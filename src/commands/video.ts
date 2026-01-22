import * as path from "node:path";
import { Command, Option } from "commander";
import { getApiKey } from "../utils/config.js";
import { saveFileWithUniqueNameIfExists } from "../utils/file.js";
import { GeminiClient } from "../utils/gemini.js";
import { LogDestination, Logger, LogLevel } from "../utils/logger.js";
import { createErrorOutput, createSuccessOutput, printJson } from "../utils/output.js";
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
  json: boolean;
  dryRun: boolean;
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
    .option("--json", "JSON形式で出力", false)
    .option("--dry-run", "実行せずに設定を確認", false)
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

      // エンジン選択（dry-run用に事前に決定）
      const engine: VideoEngine = options.fast ? "veo-3.1-fast" : "veo-3.1";
      const duration = parseInt(options.duration, 10);

      // dry-runモード
      if (options.dryRun) {
        const dryRunInfo = {
          theme,
          engine,
          duration: options.duration,
          resolution: options.resolution,
          aspectRatio: options.aspectRatio,
          output: options.output || "(自動生成).mp4",
        };

        if (options.json) {
          printJson(createSuccessOutput("video", { dryRun: true, ...dryRunInfo }));
        } else {
          console.log("\n[DRY-RUN] 動画生成");
          console.log("  テーマ:", theme);
          console.log("  エンジン:", engine);
          console.log("  長さ:", options.duration, "秒");
          console.log("  解像度:", options.resolution);
          console.log("  アスペクト比:", options.aspectRatio);
          console.log("  出力先:", options.output || "(自動生成).mp4");
          console.log("\nAPIは呼び出されません。実行するには --dry-run を外してください。");
        }
        return;
      }

      try {
        const apiKey = await getApiKey();
        const geminiClient = new GeminiClient(apiKey);
        const videoClient = new VideoClient(apiKey);

        // 動画生成
        console.log(`動画を生成しています... (エンジン: ${engine})`);
        console.log("※ 動画生成には数分かかる場合があります");

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

        if (options.json) {
          printJson(
            createSuccessOutput("video", {
              path: finalOutputPath,
              engine,
              duration,
              resolution: options.resolution,
              aspectRatio: options.aspectRatio,
            })
          );
        } else {
          console.log(`動画を生成しました: ${finalOutputPath}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("動画生成に失敗しました", { error: error.message });
          if (options.json) {
            printJson(createErrorOutput("video", error.message));
          } else {
            console.error("エラー:", error.message);
          }
        } else {
          await logger.error("不明なエラーが発生しました");
          if (options.json) {
            printJson(createErrorOutput("video", "不明なエラーが発生しました"));
          } else {
            console.error("不明なエラーが発生しました");
          }
        }
        process.exit(1);
      }
    });
}
