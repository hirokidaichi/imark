import { BaseMessage, HumanMessage, SystemMessage } from "npm:@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "npm:@langchain/google-genai";
import { LANGUAGE_DESCRIPTIONS, SupportedLanguage } from "../lang.ts";
import { ImageData } from "./image.ts";

const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];

export interface CaptionOptions {
  lang?: SupportedLanguage;
  context?: string; // Markdownコンテキスト
}

export class GeminiClient {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY環境変数が設定されていません");
    }

    this.model = new ChatGoogleGenerativeAI({
      modelName: "gemini-2.0-flash",
      apiKey,
      maxOutputTokens: 2048,
    });
  }

  async generateCaption(image: ImageData, options: CaptionOptions = {}): Promise<string> {
    const { lang = "ja", context } = options;

    // MIMEタイプの検証
    if (!SUPPORTED_MIME_TYPES.includes(image.mimeType)) {
      throw new Error("サポートされていない画像形式です");
    }

    // Base64データの検証
    try {
      // Base64の形式チェック（簡易的な検証）
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) {
        throw new Error("画像データが不正です");
      }
    } catch (_error) {
      throw new Error("画像データが不正です");
    }

    let systemPrompt =
      "Describe the image directly in 2-3 concise sentences. Focus on the key elements, actions, and atmosphere. Do not include any introductory phrases like 'Here is a description' or 'Let me describe this image'. Start with the description immediately.";

    // コンテキストが提供されている場合、プロンプトに追加
    if (context) {
      systemPrompt += `\n\nConsider this context while describing:\n${context}`;
    }

    // 言語指定に応じた翻訳指示を追加
    if (lang !== "ja") {
      systemPrompt += `\n\nTranslate the description into ${lang} (${
        LANGUAGE_DESCRIPTIONS[lang]
      }). Ensure the translation is natural and fluent, without any introductory phrases.`;
    } else {
      systemPrompt +=
        "\n\nProvide the description in Japanese (日本語) without any introductory phrases.";
    }

    const messages: BaseMessage[] = [
      new SystemMessage({
        content: systemPrompt,
      }),
      new HumanMessage({
        content: [
          {
            type: "text",
            text: "Please describe this image",
          },
          {
            type: "image_url",
            image_url: `data:${image.mimeType};base64,${image.data}`,
          },
        ],
      }),
    ];

    try {
      const response = await this.model.invoke(messages);
      return String(response.content);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`キャプション生成に失敗しました: ${error.message}`);
      }
      throw new Error("キャプション生成に失敗しました");
    }
  }
}
