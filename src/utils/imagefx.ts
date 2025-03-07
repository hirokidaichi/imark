import { ImageType } from "./image_type.ts";
import { LogDestination, Logger } from "./logger.ts";

export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "3:4";
export type SizePreset = "tiny" | "hd" | "fullhd" | "2k" | "4k";
export type SafetyFilterLevel =
  | "BLOCK_LOW_AND_ABOVE"
  | "BLOCK_MEDIUM_AND_ABOVE"
  | "BLOCK_ONLY_HIGH";
export type PersonGeneration = "DONT_ALLOW" | "ALLOW_ADULT";

export interface ImageFXOptions {
  size?: SizePreset;
  aspectRatio?: AspectRatio;
  format?: "png" | "jpg" | "jpeg" | "webp";
  quality?: number;
  type?: ImageType;
  numberOfImages?: number;
  safetyFilterLevel?: SafetyFilterLevel;
  personGeneration?: PersonGeneration;
}

export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number }> = {
  tiny: { width: 160, height: 90 },
  hd: { width: 1280, height: 720 },
  fullhd: { width: 1920, height: 1080 },
  "2k": { width: 2560, height: 1440 },
  "4k": { width: 3840, height: 2160 },
};

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
  "3:4": 3 / 4,
};

export const IMAGE_TYPE_PROMPTS: Record<ImageType, string> = {
  "realistic": "Create a hyper-realistic photograph with exceptional detail and clarity.",
  "illustration":
    "Create a hand-drawn illustration with warm, inviting atmosphere and artistic charm.",
  "flat":
    "Create a simple, minimal but a little pop illustration with a white background. Use soft pastel colors with gentle saturation, incorporating light blue, mint green and soft pink as accent colors. The style should feature rounded lines and delicate details, creating a friendly and approachable look that's both modern and charming. The illustration should be easily recognizable while maintaining a sweet, cheerful simplicity.",
  "anime":
    "Create an image in Japanese anime style with vibrant colors and distinctive eye designs.",
  "watercolor":
    "Create a watercolor painting with soft, flowing colors and artistic blending effects.",
  "oil-painting": "Create an oil painting with rich textures, deep colors, and impasto effects.",
  "pixel-art": "Create a pixel art image with retro gaming aesthetics and digital precision.",
  "sketch": "Create a pencil or pen sketch with dynamic line variations and artistic expression.",
  "3d-render": "Create a 3D rendered image with realistic lighting, materials, and depth.",
  "corporate":
    "Create a professional business image with clean, modern aesthetics and corporate appeal.",
  "minimal":
    "Create a minimal design with clean lines, essential elements, and refined simplicity.",
  "pop-art": "Create a pop art image with bold colors, dot patterns, and contemporary style.",
};

export const DEFAULT_OPTIONS: ImageFXOptions = {
  size: "fullhd",
  aspectRatio: "16:9",
  format: "webp",
  quality: 90,
  type: "flat",
  numberOfImages: 1,
  safetyFilterLevel: "BLOCK_ONLY_HIGH",
  personGeneration: "ALLOW_ADULT",
};

export class ImageFXClient {
  private apiKey: string;
  private baseUrl: string;
  private logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.apiKey = apiKey;
    this.baseUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
    this.logger = Logger.getInstance({
      name: "imagefx",
      destination: LogDestination.CONSOLE,
    });
  }

  private calculateDimensions(
    size: SizePreset,
    aspectRatio: AspectRatio,
  ): { width: number; height: number } {
    const baseSize = SIZE_PRESETS[size];
    const ratio = ASPECT_RATIOS[aspectRatio];

    if (ratio >= 1) {
      return {
        width: baseSize.width,
        height: Math.round(baseSize.width / ratio),
      };
    } else {
      return {
        width: Math.round(baseSize.height * ratio),
        height: baseSize.height,
      };
    }
  }

  private enhancePrompt(prompt: string, _options: ImageFXOptions): string {
    // 画像タイプのプロンプトはGeminiで処理されるため、ここでは何もしない
    return prompt;
  }

  async generateImage(
    prompt: string,
    options: ImageFXOptions = DEFAULT_OPTIONS,
  ): Promise<Uint8Array> {
    if (!this.apiKey) {
      throw new Error("APIキーが設定されていません");
    }

    const {
      size = DEFAULT_OPTIONS.size,
      aspectRatio = DEFAULT_OPTIONS.aspectRatio,
      format = DEFAULT_OPTIONS.format,
      numberOfImages = DEFAULT_OPTIONS.numberOfImages,
      safetyFilterLevel = DEFAULT_OPTIONS.safetyFilterLevel,
      personGeneration = DEFAULT_OPTIONS.personGeneration,
    } = options;

    const enhancedPrompt = this.enhancePrompt(prompt, options);

    this.logger.debug("=== ImageFX Debug Info ===");
    this.logger.debug(`Prompt: ${enhancedPrompt}`);
    this.logger.debug(`Size: ${size}`);
    this.logger.debug(`Aspect Ratio: ${aspectRatio}`);
    this.logger.debug(`Format: ${format}`);
    this.logger.debug(`Number of Images: ${numberOfImages}`);
    this.logger.debug(`Safety Filter Level: ${safetyFilterLevel}`);
    this.logger.debug(`Person Generation: ${personGeneration}`);
    this.logger.debug("=========================");

    const requestBody = {
      instances: [
        {
          prompt: enhancedPrompt,
        },
      ],
      parameters: {
        sampleCount: numberOfImages,
        aspectRatio,
        outputMimeType: `image/${format}`,
        safetySettings: {
          filterLevel: safetyFilterLevel,
        },
        personMode: personGeneration,
      },
    };

    this.logger.debug("Request Body: " + JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      `${this.baseUrl}?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    this.logger.debug(`Response Status: ${response.status}`);
    this.logger.debug(`Response Headers: ${JSON.stringify(response.headers, null, 2)}`);

    if (!response.ok) {
      this.logger.error("\n=== ImageFX API Error Response ===");
      this.logger.error(`Status: ${response.status}`);
      this.logger.error(`Headers: ${JSON.stringify(response.headers, null, 2)}`);

      try {
        const errorData = await response.json();
        this.logger.error(`Error: ${JSON.stringify(errorData, null, 2)}`);
        this.logger.error("===============================\n");
        throw new Error(errorData.error?.message || "画像生成に失敗しました");
      } catch (e) {
        this.logger.error("Error parsing response: " + String(e));
        throw new Error(`画像生成に失敗しました (HTTP ${response.status})`);
      }
    }

    const data = await response.json();

    this.logger.debug(`Response Structure: ${JSON.stringify(Object.keys(data), null, 2)}`);

    if (!data.predictions || !Array.isArray(data.predictions) || data.predictions.length === 0) {
      throw new Error("画像生成結果が不正です");
    }

    this.logger.debug(`Predictions Length: ${data.predictions.length}`);
    this.logger.debug(
      `First Prediction Keys: ${JSON.stringify(Object.keys(data.predictions[0]), null, 2)}`,
    );

    const base64Data = data.predictions[0].bytesBase64Encoded;
    if (!base64Data) {
      throw new Error("画像データが含まれていません");
    }

    return Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  }

  async saveImage(imageData: Uint8Array, outputPath: string): Promise<void> {
    try {
      await Deno.writeFile(outputPath, imageData);
      this.logger.info(`画像を保存しました: ${outputPath}`);
    } catch (error) {
      this.logger.error(`ファイル保存エラー: ${error}`);
      throw new Error("画像の保存に失敗しました");
    }
  }
}
