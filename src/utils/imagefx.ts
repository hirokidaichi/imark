import { join } from "@std/path";
import { ImageType } from "./image_type.ts";

export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "3:4";
export type SizePreset = "hd" | "fullhd" | "2k" | "4k";

export interface ImageFXOptions {
  size?: SizePreset;
  aspectRatio?: AspectRatio;
  format?: "png" | "jpg" | "jpeg" | "webp";
  quality?: number;
  type?: ImageType;
}

export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number }> = {
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
  format: "png",
  quality: 90,
  type: "flat",
};

export class ImageFXClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.apiKey = apiKey;
    this.baseUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
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
    const size = options.size || DEFAULT_OPTIONS.size!;
    const aspectRatio = options.aspectRatio || DEFAULT_OPTIONS.aspectRatio!;
    const format = options.format || DEFAULT_OPTIONS.format!;
    const _quality = options.quality || DEFAULT_OPTIONS.quality;

    const enhancedPrompt = this.enhancePrompt(prompt, options);
    this.calculateDimensions(size, aspectRatio);

    const requestBody = {
      instances: [
        {
          prompt: enhancedPrompt,
        },
      ],
      parameters: {
        aspectRatio: aspectRatio,
        outputMimeType: `image/${format}`,
        sampleCount: 1,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("\n=== ImageFX API Error Response ===");
        console.error("Status:", response.status);
        console.error("Headers:", Object.fromEntries(response.headers.entries()));
        console.error("Error:", errorData);
        console.error("===============================\n");
        throw new Error(errorData.error?.message || "画像の生成に失敗しました");
      }

      const result = await response.json();

      if (!result.predictions?.[0]?.bytesBase64Encoded) {
        console.error("\n=== Invalid API Response Structure ===");
        console.error("Response:", result);
        console.error("===============================\n");
        throw new Error("生成された画像データが見つかりません");
      }

      return Uint8Array.from(
        atob(result.predictions[0].bytesBase64Encoded),
        (c) => c.charCodeAt(0),
      );
    } catch (error) {
      console.error("ImageFX API error:", error);
      throw error;
    }
  }

  async saveImage(imageData: Uint8Array, outputPath: string): Promise<void> {
    try {
      const fullPath = join(Deno.cwd(), outputPath);
      await Deno.writeFile(fullPath, imageData);
      console.log(`画像を保存しました: ${fullPath}`);
    } catch (error) {
      console.error("ファイル保存エラー:", error);
      throw new Error("画像の保存に失敗しました");
    }
  }
}
