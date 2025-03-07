import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { ImageFXClient, ImageFXOptions } from "./imagefx.ts";

describe("ImageFXClient", () => {
  // テストの実行前にGOOGLE_API_KEY環境変数をクリア
  const originalApiKey = Deno.env.get("GOOGLE_API_KEY");
  Deno.env.delete("GOOGLE_API_KEY");

  try {
    describe("インスタンス化", () => {
      it("APIキーが未設定の場合はエラーをスローする", () => {
        assertThrows(
          () => new ImageFXClient(""),
          Error,
          "GOOGLE_API_KEYが設定されていません",
        );
      });

      it("APIキーがある場合はインスタンスを作成できる", () => {
        const client = new ImageFXClient("dummy-api-key");
        assert(client instanceof ImageFXClient);
      });
    });

    describe("generateImage", () => {
      it("基本的なオプションで画像生成リクエストを送信できる", async () => {
        const client = new ImageFXClient("dummy-api-key");
        const mockFetch = globalThis.fetch;
        try {
          const mockResponse = new Response(
            JSON.stringify({
              predictions: [
                {
                  bytesBase64Encoded: "dGVzdA==", // "test" in base64
                },
              ],
            }),
          );

          globalThis.fetch = async () => mockResponse;

          const result = await client.generateImage("テスト画像");
          assert(result instanceof Uint8Array);
          assertEquals(result.length, 4); // "test" is 4 bytes
        } finally {
          globalThis.fetch = mockFetch;
        }
      });

      it("カスタムオプションで画像生成リクエストを送信できる", async () => {
        const client = new ImageFXClient("dummy-api-key");
        const mockFetch = globalThis.fetch;
        let requestBody: any;

        try {
          globalThis.fetch = async (_, init) => {
            requestBody = JSON.parse(init?.body as string);
            return new Response(
              JSON.stringify({
                predictions: [
                  {
                    bytesBase64Encoded: "dGVzdA==",
                  },
                ],
              }),
            );
          };

          const options: ImageFXOptions = {
            size: "hd",
            aspectRatio: "1:1",
            format: "webp",
            numberOfImages: 2,
            safetyFilterLevel: "BLOCK_LOW_AND_ABOVE",
            personGeneration: "DONT_ALLOW",
          };

          await client.generateImage("テスト画像", options);

          assertEquals(requestBody.parameters.sampleCount, 2);
          assertEquals(requestBody.parameters.aspectRatio, "1:1");
          assertEquals(requestBody.parameters.outputMimeType, "image/webp");
          assertEquals(requestBody.parameters.safetySettings.filterLevel, "BLOCK_LOW_AND_ABOVE");
          assertEquals(requestBody.parameters.personMode, "DONT_ALLOW");
        } finally {
          globalThis.fetch = mockFetch;
        }
      });

      it("APIエラーの場合は適切なエラーメッセージをスローする", async () => {
        const client = new ImageFXClient("dummy-api-key");
        const mockFetch = globalThis.fetch;
        try {
          globalThis.fetch = async () =>
            new Response(
              JSON.stringify({
                error: {
                  message: "Invalid API key",
                },
              }),
              { status: 401 },
            );

          await assertRejects(
            () => client.generateImage("テスト画像"),
            Error,
            "画像生成に失敗しました (HTTP 401)",
          );
        } finally {
          globalThis.fetch = mockFetch;
        }
      });

      it("不正なレスポンス形式の場合はエラーをスローする", async () => {
        const client = new ImageFXClient("dummy-api-key");
        const mockFetch = globalThis.fetch;
        try {
          globalThis.fetch = async () =>
            new Response(
              JSON.stringify({
                predictions: [], // 空の predictions 配列
              }),
            );

          await assertRejects(
            () => client.generateImage("テスト画像"),
            Error,
            "画像生成結果が不正です",
          );
        } finally {
          globalThis.fetch = mockFetch;
        }
      });
    });
  } finally {
    // テストの実行後にGOOGLE_API_KEY環境変数を元に戻す
    if (originalApiKey) {
      Deno.env.set("GOOGLE_API_KEY", originalApiKey);
    }
  }
});
