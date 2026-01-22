import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMimeType, readImageFile } from "./image.js";

describe("getMimeType", () => {
  it("正常系 - 各種画像形式のMIMEタイプを正しく返す", () => {
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
      expect(getMimeType(path)).toBe(expected);
    }
  });

  it("異常系 - サポートされていない拡張子", () => {
    expect(() => getMimeType("test.txt")).toThrow("サポートされていないファイル形式です: .txt");
  });
});

describe("readImageFile", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imark_test_image_"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("正常系 - 画像ファイルを読み込んでBase64エンコード", async () => {
    const mockImageData = Buffer.from([1, 2, 3, 4]);
    const mockBase64 = "AQIDBA=="; // [1,2,3,4]のBase64エンコード

    const testPath = path.join(tempDir, "test.jpg");
    await fs.writeFile(testPath, mockImageData);

    const result = await readImageFile(testPath);
    expect(result).toEqual({
      data: mockBase64,
      mimeType: "image/jpeg",
    });
  });

  it("異常系 - ファイル読み込みエラー", async () => {
    const nonExistentPath = path.join(tempDir, "nonexistent.jpg");
    await expect(readImageFile(nonExistentPath)).rejects.toThrow(
      "画像ファイルの読み込みに失敗しました"
    );
  });
});
