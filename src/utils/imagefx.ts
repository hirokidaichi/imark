import {
  GoogleGenAI,
  type PersonGeneration as SDKPersonGeneration,
  type SafetyFilterLevel as SDKSafetyFilterLevel,
} from "@google/genai";
import * as fs from "node:fs/promises";
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type AspectRatioPreset,
  DEFAULT_OPTIONS,
  IMAGE_TYPE_PROMPTS,
  type ImageFormat,
  type ImageFXOptions,
  type ImageType,
  type PersonGeneration,
  type SafetyFilterLevel,
  SIZE_PRESETS,
  type SizePreset,
} from "./image_constants.js";
import { Logger } from "./logger.js";

export { ASPECT_RATIOS, DEFAULT_OPTIONS, IMAGE_TYPE_PROMPTS, SIZE_PRESETS };
export type {
  AspectRatio,
  AspectRatioPreset,
  ImageFXOptions,
  ImageFormat,
  ImageType,
  PersonGeneration,
  SafetyFilterLevel,
  SizePreset,
};

/**
 * 画像生成エンジンの種類
 */
export type ImageEngine =
  | "imagen4" // Imagen 4 (デフォルト)
  | "imagen4-fast" // Imagen 4 Fast
  | "imagen4-ultra"; // Imagen 4 Ultra

/**
 * エンジンごとのモデルID
 */
export const ENGINE_MODEL_IDS: Record<ImageEngine, string> = {
  imagen4: "imagen-4.0-generate-001",
  "imagen4-fast": "imagen-4.0-fast-generate-001",
  "imagen4-ultra": "imagen-4.0-ultra-generate-001",
};

/**
 * 画像フォーマットをMIMEタイプに変換
 */
function formatToMimeType(format: ImageFormat): string {
  const mimeTypes: Record<ImageFormat, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return mimeTypes[format] || "image/png";
}

export interface ImageFXClientOptions extends ImageFXOptions {
  engine?: ImageEngine;
}

export class ImageFXClient {
  private ai: GoogleGenAI;
  private logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.logger = Logger.getInstance({ name: "imagefx" });
  }

  async generateImage(prompt: string, options: ImageFXClientOptions = {}): Promise<Uint8Array> {
    const {
      aspectRatio = DEFAULT_OPTIONS.aspectRatio,
      format = DEFAULT_OPTIONS.format,
      numberOfImages = DEFAULT_OPTIONS.numberOfImages,
      safetyFilterLevel = DEFAULT_OPTIONS.safetyFilterLevel,
      personGeneration = DEFAULT_OPTIONS.personGeneration,
      engine = "imagen4",
    } = options;

    // アスペクト比の検証（Imagen APIは特定の値のみサポート）
    const supportedAspectRatios = ["1:1", "9:16", "16:9", "4:3", "3:4"];
    if (!supportedAspectRatios.includes(aspectRatio as string)) {
      throw new Error(
        `サポートされていないアスペクト比です: ${aspectRatio}。使用可能: ${supportedAspectRatios.join(", ")}`
      );
    }

    // フォーマットの検証（Imagen APIはpngとjpegのみサポート）
    const supportedFormats = ["png", "jpg", "jpeg"];
    if (!supportedFormats.includes(format as string)) {
      throw new Error(
        `サポートされていないフォーマットです: ${format}。Imagen APIは png, jpg, jpeg のみ対応しています`
      );
    }

    const modelId = ENGINE_MODEL_IDS[engine];
    const outputMimeType = formatToMimeType(format as ImageFormat);

    this.logger.debug("=== ImageFX Debug Info ===");
    this.logger.debug(`Prompt: ${prompt}`);
    this.logger.debug(`Engine: ${engine}`);
    this.logger.debug(`Model ID: ${modelId}`);
    this.logger.debug(`Aspect Ratio: ${aspectRatio}`);
    this.logger.debug(`Format: ${format}`);
    this.logger.debug(`Output MIME Type: ${outputMimeType}`);
    this.logger.debug(`Number of Images: ${numberOfImages}`);
    this.logger.debug(`Safety Filter Level: ${safetyFilterLevel}`);
    this.logger.debug(`Person Generation: ${personGeneration}`);
    this.logger.debug("=========================");

    try {
      const response = await this.ai.models.generateImages({
        model: modelId,
        prompt,
        config: {
          numberOfImages,
          aspectRatio: aspectRatio as string,
          outputMimeType,
          safetyFilterLevel: safetyFilterLevel as SDKSafetyFilterLevel,
          personGeneration: personGeneration as SDKPersonGeneration,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("画像データが見つかりません");
      }

      const generatedImage = response.generatedImages[0];
      if (!generatedImage.image?.imageBytes) {
        throw new Error("画像データが見つかりません");
      }

      // Base64デコード
      const base64Data = generatedImage.image.imageBytes;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes;
    } catch (error) {
      this.logger.error(`画像生成エラー: ${error}`);
      throw new Error(`画像生成に失敗しました: ${error instanceof Error ? error.message : error}`);
    }
  }

  async saveImage(imageData: Uint8Array, outputPath: string): Promise<void> {
    try {
      await fs.writeFile(outputPath, imageData);
      this.logger.info(`画像を保存しました: ${outputPath}`);
    } catch (error) {
      this.logger.error(`ファイル保存エラー: ${error}`);
      throw new Error("画像の保存に失敗しました");
    }
  }
}
