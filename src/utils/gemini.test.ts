import { assert, assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { GeminiClient } from "./gemini.ts";

describe("GeminiClient", () => {
  // テストの実行前にGOOGLE_API_KEY環境変数をクリア
  const originalApiKey = Deno.env.get("GOOGLE_API_KEY");
  Deno.env.delete("GOOGLE_API_KEY");

  try {
    it("インスタンス化 - API KEYがある場合", () => {
      const client = new GeminiClient("dummy-api-key");
      assertExists(client);
    });

    describe("generatePrompt", () => {
      it("プロンプトの生成", async () => {
        const message = "猫の写真";
        const context = "ペットの写真を撮影する";

        // モック化されたプロンプト
        const mockPrompt = `
Generate a detailed image generation prompt based on the following information.

Message:
${message}

Context:
${context}

Please generate a prompt that meets the following criteria:
1. Include specific and detailed descriptions
2. Clearly specify the image style and atmosphere
3. Include all necessary elements
4. Output in English
5. Focus on visual elements and composition
6. Include lighting and color descriptions
7. Specify the mood and emotional tone
8. Include any specific technical requirements

Prompt:
A beautiful photograph of a cat, taken in a natural setting with soft lighting. The cat should be the main focus, with a blurred background. The image should have a warm, inviting atmosphere, with natural colors and gentle shadows. The composition should be balanced and visually appealing, with the cat positioned according to the rule of thirds. The lighting should be soft and diffused, creating a gentle glow around the cat. The mood should be peaceful and serene, capturing the cat's natural grace and elegance.`;

        // モック化されたレスポンス
        const mockResponse = {
          text: () => mockPrompt,
        };

        // モック化されたモデル
        const mockModel = {
          generateContent: () => ({
            response: mockResponse,
          }),
        };

        // モック化されたクライアント
        const mockClient = new GeminiClient("dummy-api-key");
        Object.defineProperty(mockClient, "model", {
          value: mockModel,
        });

        const prompt = await mockClient.generatePrompt(message, context);

        assertExists(prompt);
        assertEquals(typeof prompt, "string");
        assert(prompt.length > 0);
        assert(prompt.includes("Generate a detailed image generation prompt"));
        assert(prompt.includes("Message:"));
        assert(prompt.includes("Context:"));
        assert(prompt.includes("猫"));
      });

      it("エラーハンドリング - APIキーなし", () => {
        assertThrows(
          () => {
            new GeminiClient("");
          },
          Error,
          "GOOGLE_API_KEY環境変数が設定されていません",
        );
      });

      it("エラーハンドリング - 空のメッセージ", async () => {
        const client = new GeminiClient("dummy-api-key");
        await assertRejects(
          async () => {
            await client.generatePrompt("", "");
          },
          Error,
          "メッセージが空です",
        );
      });
    });
  } finally {
    // テストの実行後にGOOGLE_API_KEY環境変数を元に戻す
    if (originalApiKey) {
      Deno.env.set("GOOGLE_API_KEY", originalApiKey);
    }
  }
});
