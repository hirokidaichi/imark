import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs/promises";
import { Logger } from "./logger.js";

/**
 * 動画生成エンジンの種類
 */
export type VideoEngine =
  | "veo-3.1" // Veo 3.1 (デフォルト)
  | "veo-3.1-fast"; // Veo 3.1 Fast

/**
 * エンジンごとのモデルID
 */
export const VIDEO_ENGINE_MODEL_IDS: Record<VideoEngine, string> = {
  "veo-3.1": "veo-3.1-generate-preview",
  "veo-3.1-fast": "veo-3.1-fast-generate-preview",
};

/**
 * 動画の解像度
 */
export type VideoResolution = "720p" | "1080p";

/**
 * 動画のアスペクト比
 */
export type VideoAspectRatio = "16:9" | "9:16";

/**
 * 動画生成オプション
 */
export interface VideoGenerationOptions {
  engine?: VideoEngine;
  duration?: number; // 秒数 (5-8秒)
  resolution?: VideoResolution;
  aspectRatio?: VideoAspectRatio;
}

/**
 * デフォルトの動画生成オプション
 */
export const DEFAULT_VIDEO_OPTIONS: Required<VideoGenerationOptions> = {
  engine: "veo-3.1",
  duration: 8,
  resolution: "1080p",
  aspectRatio: "16:9",
};

/**
 * 動画生成結果
 */
export interface VideoGenerationResult {
  videoData: Uint8Array;
  mimeType: string;
}

/**
 * Veo 3.1 動画生成クライアント
 */
export class VideoClient {
  private ai: GoogleGenAI;
  private logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.logger = Logger.getInstance({ name: "video" });
  }

  /**
   * プロンプトから動画を生成します
   */
  async generateVideo(
    prompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<VideoGenerationResult> {
    const {
      engine = DEFAULT_VIDEO_OPTIONS.engine,
      duration = DEFAULT_VIDEO_OPTIONS.duration,
      aspectRatio = DEFAULT_VIDEO_OPTIONS.aspectRatio,
    } = options;

    const modelId = VIDEO_ENGINE_MODEL_IDS[engine];

    this.logger.debug("=== Video Generation Debug Info ===");
    this.logger.debug(`Prompt: ${prompt}`);
    this.logger.debug(`Engine: ${engine}`);
    this.logger.debug(`Model ID: ${modelId}`);
    this.logger.debug(`Duration: ${duration}秒`);
    this.logger.debug(`Aspect Ratio: ${aspectRatio}`);
    this.logger.debug("===================================");

    try {
      // 動画生成をリクエスト
      let operation = await this.ai.models.generateVideos({
        model: modelId,
        prompt,
        config: {
          aspectRatio,
          durationSeconds: duration,
        },
      });

      // 生成完了を待機
      this.logger.info("動画生成を開始しました。完了まで待機中...");

      while (!operation.done) {
        await this.sleep(5000); // 5秒待機
        operation = await this.ai.operations.get({ operation: operation });
        this.logger.debug(`生成状況: ${operation.done ? "完了" : "処理中..."}`);
      }

      // 結果を取得
      if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
        throw new Error("動画データが見つかりません");
      }

      const generatedVideo = operation.response.generatedVideos[0];
      if (!generatedVideo.video?.uri) {
        throw new Error("動画URIが見つかりません");
      }

      // 動画をダウンロード
      const videoUri = generatedVideo.video.uri;
      this.logger.debug(`動画URI: ${videoUri}`);

      const videoResponse = await fetch(videoUri);
      if (!videoResponse.ok) {
        throw new Error(`動画のダウンロードに失敗しました: ${videoResponse.status}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const videoData = new Uint8Array(videoBuffer);

      return {
        videoData,
        mimeType: "video/mp4",
      };
    } catch (error) {
      this.logger.error(`動画生成エラー: ${error}`);
      throw new Error(`動画生成に失敗しました: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 動画をファイルに保存します
   */
  async saveVideo(videoData: Uint8Array, outputPath: string): Promise<void> {
    try {
      await fs.writeFile(outputPath, videoData);
      this.logger.info(`動画を保存しました: ${outputPath}`);
    } catch (error) {
      this.logger.error(`ファイル保存エラー: ${error}`);
      throw new Error("動画の保存に失敗しました");
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
