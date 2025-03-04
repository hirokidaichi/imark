import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { SupportedLanguage } from "../lang.ts";
import { ImageData } from "./image.ts";
import { IMAGE_TYPE_PROMPTS, ImageType } from "./image_type.ts";

export interface GenerateCaptionOptions {
  lang: SupportedLanguage;
  context?: string;
}

export interface GeneratePromptOptions {
  type?: ImageType;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY環境変数が設定されていません");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generatePrompt(
    message: string,
    context: string,
    options: GeneratePromptOptions = {},
  ): Promise<string> {
    if (!message) {
      throw new Error("メッセージが空です");
    }

    const typePrompt = options.type ? IMAGE_TYPE_PROMPTS[options.type] : "";

    const prompt = `
Generate a detailed image generation prompt based on the following information.

Message:
${message}

Context:
${context}

${
      typePrompt
        ? `Style Requirements:
${typePrompt}

`
        : ""
    }Please generate a prompt that meets the following criteria:
1. Include specific and detailed descriptions
2. Clearly specify the image style and atmosphere
3. Include all necessary elements
4. Output in English
5. Focus on visual elements and composition
6. Include lighting and color descriptions
7. Specify the mood and emotional tone
8. Include any specific technical requirements

Prompt:
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error("プロンプトの生成に失敗しました");
    }
  }

  async generateCaption(imageData: ImageData, options: GenerateCaptionOptions): Promise<string> {
    try {
      const prompt = `この画像について、${options.lang}で詳細な説明を生成してください。${
        options.context ? `\n\nコンテキスト情報:\n${options.context}` : ""
      }`;
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        },
      ]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error("キャプションの生成に失敗しました");
    }
  }
}
