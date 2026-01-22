import { GoogleGenAI, type Part } from "@google/genai";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Logger } from "./logger.js";

/**
 * Geminiネイティブ画像生成エンジンの種類
 */
export type NanoBananaEngine =
  | "nano-banana" // Gemini 2.5 Flash Image (高速)
  | "nano-banana-pro"; // Gemini 3 Pro Image (高品質)

/**
 * エンジンごとのモデルID
 */
export const NANO_BANANA_MODEL_IDS: Record<NanoBananaEngine, string> = {
  "nano-banana": "gemini-2.5-flash-image",
  "nano-banana-pro": "gemini-3-pro-image-preview",
};

/**
 * Nano Banana画像生成オプション
 */
export interface NanoBananaOptions {
  engine?: NanoBananaEngine;
  numberOfImages?: number;
}

/**
 * デフォルトのNano Bananaオプション
 */
export const DEFAULT_NANO_BANANA_OPTIONS: Required<NanoBananaOptions> = {
  engine: "nano-banana",
  numberOfImages: 1,
};

/**
 * 画像生成結果
 */
export interface NanoBananaResult {
  imageData: Uint8Array;
  mimeType: string;
}

/**
 * Nano Banana (Geminiネイティブ画像生成) クライアント
 *
 * Geminiのネイティブ画像生成機能を使用して画像を生成します。
 * Imagen 4と比較して、より高速に画像を生成できます。
 */
export class NanoBananaClient {
  private ai: GoogleGenAI;
  private logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.logger = Logger.getInstance({ name: "nano-banana" });
  }

  /**
   * プロンプトから画像を生成します
   *
   * Geminiのネイティブ画像生成機能を使用します。
   * responseModalities に 'image' を指定することで画像生成モードになります。
   */
  async generateImage(prompt: string, options: NanoBananaOptions = {}): Promise<NanoBananaResult> {
    const { engine = DEFAULT_NANO_BANANA_OPTIONS.engine } = options;

    const modelId = NANO_BANANA_MODEL_IDS[engine];

    this.logger.debug("=== Nano Banana Debug Info ===");
    this.logger.debug(`Prompt: ${prompt}`);
    this.logger.debug(`Engine: ${engine}`);
    this.logger.debug(`Model ID: ${modelId}`);
    this.logger.debug("==============================");

    try {
      const response = await this.ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseModalities: ["image", "text"],
        },
      });

      // レスポンスから画像データを抽出
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("画像データが見つかりません");
      }

      const parts = candidates[0].content?.parts;
      if (!parts) {
        throw new Error("画像データが見つかりません");
      }

      // 画像パートを探す
      for (const part of parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
          const base64Data = part.inlineData.data;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          return {
            imageData: bytes,
            mimeType: part.inlineData.mimeType,
          };
        }
      }

      throw new Error("画像データが見つかりません");
    } catch (error) {
      this.logger.error(`Nano Banana画像生成エラー: ${error}`);
      throw new Error(`画像生成に失敗しました: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 入力画像を編集して新しい画像を生成します
   *
   * 入力画像とプロンプトを受け取り、Geminiのマルチモーダル機能を使って
   * 画像編集を行います。
   *
   * @param inputImagePath - 入力画像のパス
   * @param prompt - 編集指示のプロンプト（例: "この画像を白黒にして"）
   * @param options - オプション
   */
  async editImage(
    inputImagePath: string,
    prompt: string,
    options: NanoBananaOptions = {}
  ): Promise<NanoBananaResult> {
    const { engine = DEFAULT_NANO_BANANA_OPTIONS.engine } = options;

    const modelId = NANO_BANANA_MODEL_IDS[engine];

    this.logger.debug("=== Nano Banana Edit Debug Info ===");
    this.logger.debug(`Input Image: ${inputImagePath}`);
    this.logger.debug(`Prompt: ${prompt}`);
    this.logger.debug(`Engine: ${engine}`);
    this.logger.debug(`Model ID: ${modelId}`);
    this.logger.debug("===================================");

    try {
      // 入力画像を読み込む
      const imageBuffer = await fs.readFile(inputImagePath);
      const base64Image = imageBuffer.toString("base64");

      // MIMEタイプを推測
      const ext = path.extname(inputImagePath).toLowerCase();
      const mimeTypeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };
      const mimeType = mimeTypeMap[ext] || "image/png";

      // マルチモーダルコンテンツを構築
      const parts: Part[] = [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: prompt,
        },
      ];

      const response = await this.ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["image", "text"],
        },
      });

      // レスポンスから画像データを抽出
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("画像データが見つかりません");
      }

      const responseParts = candidates[0].content?.parts;
      if (!responseParts) {
        throw new Error("画像データが見つかりません");
      }

      // 画像パートを探す
      for (const part of responseParts) {
        if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
          const base64Data = part.inlineData.data;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          return {
            imageData: bytes,
            mimeType: part.inlineData.mimeType,
          };
        }
      }

      throw new Error("画像データが見つかりません");
    } catch (error) {
      this.logger.error(`Nano Banana画像編集エラー: ${error}`);
      throw new Error(`画像編集に失敗しました: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 画像をファイルに保存します
   */
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
