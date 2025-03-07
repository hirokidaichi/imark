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

export interface GenerateFileNameOptions {
  maxLength?: number;
  includeRandomNumber?: boolean;
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
9. Avoid any sensitive, inappropriate, or offensive content
10. Ensure the prompt is suitable for all audiences
11. Do not include any violent, sexual, or disturbing imagery
12. Avoid political, religious, or controversial themes
13. Replace any potentially sensitive expressions with more neutral alternatives
14. Do not include children or minors in any scenarios. Change children to adults or symbolic representations.
15. Avoid depicting dangerous activities that could cause harm
16. Do not include explicit violence, blood, or gore
17. Avoid factually inaccurate information that could cause harm
18. Do not include harassment, incitement, or discrimination
19. Avoid sexually explicit material
20. Replace any references to children with adults or symbolic representations
21. Transform any potentially harmful scenarios into safe, positive alternatives
22. Limit the output to approximately 1500 characters
23. Strictly adhere to Gemini's content policy and guidelines
24. Do not generate content that could violate Gemini's usage policies

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

  async generateFileName(prompt: string, options: GenerateFileNameOptions = {}): Promise<string> {
    const {
      maxLength = 50,
      includeRandomNumber = true,
    } = options;

    if (!prompt) {
      throw new Error("プロンプトが空です");
    }

    const promptForFileName = `
以下のプロンプトから、画像のファイル名として適切な文字列を生成してください。

プロンプト:
${prompt}

以下の条件を満たすファイル名を生成してください：
1. プロンプトの主要な要素を含める
2. スペースはハイフン（-）に置換
3. 特殊文字は除去
4. 小文字のみを使用
5. 日本語はローマ字に変換
6. 長さは${maxLength}文字以内

ファイル名:
`;

    try {
      const result = await this.model.generateContent(promptForFileName);
      const response = await result.response;
      let fileName = response.text().trim();

      // ファイル名の正規化
      fileName = fileName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "") // 英数字とハイフン以外を除去
        .replace(/-+/g, "-") // 連続するハイフンを1つに
        .replace(/^-|-$/g, ""); // 先頭と末尾のハイフンを除去

      // 長さ制限
      if (fileName.length > maxLength) {
        fileName = fileName.substring(0, maxLength);
      }

      // ランダムな数字の追加
      if (includeRandomNumber) {
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        fileName = `${fileName}-${randomNum}`;
      }

      return fileName;
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error("ファイル名の生成に失敗しました");
    }
  }
}
