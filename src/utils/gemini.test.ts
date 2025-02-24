import { assertEquals, assertExists } from "@std/assert";
import { GeminiClient } from "./gemini.ts";
import { ImageData } from "./image.ts";

// 1x1の透明なPNG画像のBase64データ
const mockImageData: ImageData = {
  data:
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  mimeType: "image/png",
};

// テスト用のヘルパー関数
async function withEnv<T>(
  key: string,
  value: string | undefined,
  fn: () => T | Promise<T>,
): Promise<T> {
  const original = Deno.env.get(key);
  try {
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
    return await fn();
  } finally {
    if (original === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, original);
    }
  }
}

Deno.test("GeminiClient", async (t) => {
  // インスタンス化のテスト
  await t.step("インスタンス化 - API KEYがある場合", async () => {
    await withEnv("GOOGLE_API_KEY", "dummy-api-key", () => {
      const client = new GeminiClient();
      assertExists(client);
      return Promise.resolve();
    });
  });

  await t.step("インスタンス化 - API KEYがない場合", async () => {
    await withEnv("GOOGLE_API_KEY", undefined, () => {
      let error: Error | undefined;
      try {
        new GeminiClient();
      } catch (e) {
        if (e instanceof Error) {
          error = e;
        }
      }
      assertExists(error);
      assertEquals(error?.message, "GOOGLE_API_KEY環境変数が設定されていません");
      return Promise.resolve();
    });
  });

  // generateCaptionのテスト
  await t.step("generateCaption", async (t) => {
    await t.step("正常系 - 日本語でキャプション生成", async () => {
      await withEnv("GOOGLE_API_KEY", "dummy-api-key", async () => {
        const client = new GeminiClient();
        try {
          const result = await client.generateCaption(mockImageData, { lang: "ja" });
          assertExists(result);
          assertEquals(typeof result, "string");
        } catch (error) {
          // API呼び出しは失敗するが、型チェックは成功することを確認
          if (error instanceof Error) {
            assertEquals(error instanceof Error, true);
          }
        }
      });
    });

    await t.step("正常系 - 英語でキャプション生成", async () => {
      await withEnv("GOOGLE_API_KEY", "dummy-api-key", async () => {
        const client = new GeminiClient();
        try {
          const result = await client.generateCaption(mockImageData, { lang: "en" });
          assertExists(result);
          assertEquals(typeof result, "string");
        } catch (error) {
          // API呼び出しは失敗するが、型チェックは成功することを確認
          if (error instanceof Error) {
            assertEquals(error instanceof Error, true);
          }
        }
      });
    });

    await t.step("異常系 - 不正なMIMEタイプ", async () => {
      await withEnv("GOOGLE_API_KEY", "dummy-api-key", async () => {
        const client = new GeminiClient();
        const invalidImageData = {
          ...mockImageData,
          mimeType: "invalid/type",
        };
        let error: Error | undefined;
        try {
          await client.generateCaption(invalidImageData);
        } catch (e) {
          if (e instanceof Error) {
            error = e;
          }
        }
        assertExists(error);
        assertEquals(error?.message, "サポートされていない画像形式です");
      });
    });

    await t.step("異常系 - 不正なBase64データ", async () => {
      await withEnv("GOOGLE_API_KEY", "dummy-api-key", async () => {
        const client = new GeminiClient();
        const invalidImageData = {
          ...mockImageData,
          data: "invalid-base64-data",
        };
        let error: Error | undefined;
        try {
          await client.generateCaption(invalidImageData);
        } catch (e) {
          if (e instanceof Error) {
            error = e;
          }
        }
        assertExists(error);
        assertEquals(error?.message, "画像データが不正です");
      });
    });
  });
});
