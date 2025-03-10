import { assertEquals, assertRejects, stub } from "../deps-testing.ts";
import { getMimeType, readImageFile } from "./image.ts";

Deno.test("getMimeType", async (t) => {
  await t.step("正常系 - 各種画像形式のMIMEタイプを正しく返す", () => {
    const testCases = [
      { path: "test.jpg", expected: "image/jpeg" },
      { path: "test.jpeg", expected: "image/jpeg" },
      { path: "test.png", expected: "image/png" },
      { path: "test.gif", expected: "image/gif" },
      { path: "test.webp", expected: "image/webp" },
      { path: "test.heic", expected: "image/heic" },
      { path: "test.heif", expected: "image/heif" },
    ];

    for (const { path, expected } of testCases) {
      assertEquals(getMimeType(path), expected);
    }
  });

  await t.step("異常系 - サポートされていない拡張子", () => {
    try {
      getMimeType("test.txt");
      throw new Error("エラーが発生しませんでした");
    } catch (error) {
      if (error instanceof Error) {
        assertEquals(error.message, "サポートされていないファイル形式です: .txt");
      } else {
        throw error;
      }
    }
  });
});

Deno.test("readImageFile", async (t) => {
  const mockImageData = new Uint8Array([1, 2, 3, 4]);
  const mockBase64 = "AQIDBA=="; // [1,2,3,4]のBase64エンコード

  await t.step("正常系 - 画像ファイルを読み込んでBase64エンコード", async () => {
    const readFileStub = stub(Deno, "readFile", () => Promise.resolve(mockImageData));

    try {
      const result = await readImageFile("test.jpg");
      assertEquals(result, {
        data: mockBase64,
        mimeType: "image/jpeg",
      });
    } finally {
      readFileStub.restore();
    }
  });

  await t.step("異常系 - ファイル読み込みエラー", async () => {
    const readFileStub = stub(
      Deno,
      "readFile",
      () => Promise.reject(new Error("File not found")),
    );

    try {
      await assertRejects(
        async () => await readImageFile("nonexistent.jpg"),
        Error,
        "画像ファイルの読み込みに失敗しました: File not found",
      );
    } finally {
      readFileStub.restore();
    }
  });
});
