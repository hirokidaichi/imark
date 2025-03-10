import { assertEquals, assertSpyCalls, spy, stub } from "../deps-testing.ts";
import * as gemini from "../utils/gemini.ts";
import type { ImageData } from "../utils/image.ts";
import * as imageUtils from "../utils/image.ts";
import { captionCommand } from "./caption.ts";

const mockImageData: ImageData = {
  data: "base64encodedimage",
  mimeType: "image/jpeg",
};
const mockCaption = "This is a test caption";

// GeminiClientのモック
const mockGenerateCaption = spy(
  (_: ImageData, _options?: { lang?: string; context?: string }) => Promise.resolve(mockCaption),
);

class MockGeminiClient {
  generateCaption = mockGenerateCaption;
}

// GeminiClientのモック関数
const mockGeminiClient = () => {
  const client = new MockGeminiClient();
  Object.defineProperty(client, "generateCaption", {
    configurable: true,
    writable: true,
    value: mockGenerateCaption,
  });
  return client;
};

Deno.test({
  name: "captionCommand",
  ignore: true,
  async fn(t) {
    await t.step("正常系 - Markdownフォーマット", async () => {
      // モックの設定
      const readImageStub = stub(imageUtils, "readImageFile", () => Promise.resolve(mockImageData));
      const geminiClientStub = stub(gemini, "GeminiClient", mockGeminiClient);
      const consoleLogSpy = spy(console, "log");

      try {
        await captionCommand.parse(["test.jpg", "--lang", "ja"]);

        assertSpyCalls(consoleLogSpy, 1);
        assertEquals(
          consoleLogSpy.calls[0].args[0],
          `# test.jpg\n\n${mockCaption}`,
        );
        assertSpyCalls(mockGenerateCaption, 1);
      } finally {
        readImageStub.restore();
        geminiClientStub.restore();
        consoleLogSpy.restore();
        mockGenerateCaption.restore();
      }
    });

    await t.step("正常系 - JSONフォーマット", async () => {
      const readImageStub = stub(imageUtils, "readImageFile", () => Promise.resolve(mockImageData));
      const geminiClientStub = stub(gemini, "GeminiClient", mockGeminiClient);
      const consoleLogSpy = spy(console, "log");

      try {
        await captionCommand.parse(["test.jpg", "--format", "json"]);

        assertSpyCalls(consoleLogSpy, 1);
        assertEquals(
          consoleLogSpy.calls[0].args[0],
          JSON.stringify({ file: "test.jpg", caption: mockCaption }, null, 2),
        );
        assertSpyCalls(mockGenerateCaption, 1);
      } finally {
        readImageStub.restore();
        geminiClientStub.restore();
        consoleLogSpy.restore();
        mockGenerateCaption.restore();
      }
    });

    await t.step("正常系 - コンテキストファイル使用", async () => {
      const mockContext = "This is a test context";
      const readImageStub = stub(imageUtils, "readImageFile", () => Promise.resolve(mockImageData));
      const readTextFileStub = stub(Deno, "readTextFile", () => Promise.resolve(mockContext));
      const geminiClientStub = stub(gemini, "GeminiClient", mockGeminiClient);

      try {
        await captionCommand.parse(["test.jpg", "--context", "test.md"]);

        // generateCaptionが呼び出されたことを確認
        assertSpyCalls(mockGenerateCaption, 1);
        // 呼び出し時の引数を確認
        const [, options] = mockGenerateCaption.calls[0].args as [ImageData, { context?: string }];
        assertEquals(options.context, mockContext);
      } finally {
        readImageStub.restore();
        readTextFileStub.restore();
        geminiClientStub.restore();
        mockGenerateCaption.restore();
      }
    });

    await t.step("異常系 - 画像ファイル読み込みエラー", async () => {
      const readImageStub = stub(
        imageUtils,
        "readImageFile",
        () => Promise.reject(new Error("File not found")),
      );
      const geminiClientStub = stub(gemini, "GeminiClient", mockGeminiClient);
      const consoleErrorSpy = spy(console, "error");
      const exitStub = stub(Deno, "exit");

      try {
        await captionCommand.parse(["nonexistent.jpg"]);

        assertSpyCalls(consoleErrorSpy, 1);
        assertEquals(consoleErrorSpy.calls[0].args, ["エラー:", "File not found"]);
        assertSpyCalls(exitStub, 1);
        assertEquals(exitStub.calls[0].args[0], 1);
      } finally {
        readImageStub.restore();
        geminiClientStub.restore();
        consoleErrorSpy.restore();
        exitStub.restore();
        mockGenerateCaption.restore();
      }
    });
  },
});
