import {
  ASPECT_RATIOS,
  AspectRatio,
  DEFAULT_OPTIONS,
  IMAGE_TYPE_PROMPTS,
  ImageFXOptions,
  ImageType,
  PersonGeneration,
  SafetyFilterLevel,
  SIZE_PRESETS,
  SizePreset,
} from "./image_constants.ts";
import { Logger } from "./logger.ts";

export { ASPECT_RATIOS, DEFAULT_OPTIONS, IMAGE_TYPE_PROMPTS, SIZE_PRESETS };
export type {
  AspectRatio,
  ImageFXOptions,
  ImageType,
  PersonGeneration,
  SafetyFilterLevel,
  SizePreset,
};

export class ImageFXClient {
  private apiKey: string;
  private baseUrl =
    "https://us-central1-aiplatform.googleapis.com/v1/projects/hirokidaichi/locations/us-central1/publishers/google/models/imagegeneration:predict";
  private logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.apiKey = apiKey;
    this.logger = Logger.getInstance({ name: "imagefx" });
  }

  private enhancePrompt(prompt: string, _options: ImageFXOptions = {}): string {
    return prompt;
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
      const errorText = await response.text();
      throw new Error(`画像生成に失敗しました: ${errorText}`);
    }

    const data = await response.json();
    if (!data.predictions?.[0]?.bytesBase64Encoded) {
      throw new Error("画像データが見つかりません");
    }

    const base64Data = data.predictions[0].bytesBase64Encoded;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
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
