import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileExists,
  generateUniqueFilePath,
  loadContextFile,
  saveFileWithUniqueNameIfExists,
} from "./file.js";

describe("ファイル操作ユーティリティのテスト", () => {
  // テスト用の一時ディレクトリのパス
  let tempDirPath: string;

  // 各テスト前に一時ディレクトリを作成
  beforeEach(async () => {
    tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), "imark_test_file_"));
  });

  // 各テスト後にテストファイルを削除
  afterEach(async () => {
    try {
      await fs.rm(tempDirPath, { recursive: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  });

  describe("generateUniqueFilePath", () => {
    it("ファイルが存在しない場合は元のパスを返す", async () => {
      const testPath = path.join(tempDirPath, "test.txt");
      const result = await generateUniqueFilePath(testPath);
      expect(result).toBe(testPath);
    });

    it("ファイルが存在する場合は乱数を追加したパスを返す", async () => {
      const testPath = path.join(tempDirPath, "test.txt");

      // テストファイルを作成
      await fs.writeFile(testPath, "テスト");

      const result = await generateUniqueFilePath(testPath);

      // 元のパスとは異なり、ベース名と拡張子の間に乱数が追加されていることを確認
      expect(result !== testPath).toBe(true);
      expect(result.startsWith(testPath.slice(0, testPath.lastIndexOf(".")))).toBe(true);
      expect(result.endsWith(".txt")).toBe(true);

      // 乱数部分が4桁の数字であることを確認
      const baseName = testPath.slice(0, testPath.lastIndexOf("."));
      const randomPart = result.slice(baseName.length + 1, result.lastIndexOf("."));
      expect(randomPart.length).toBe(4);
      expect(isNaN(Number(randomPart))).toBe(false);
    });

    it("複数回衝突する場合も乱数を追加して一意のパスを返す", async () => {
      const testPath = path.join(tempDirPath, "test.txt");

      // テストファイルを作成
      await fs.writeFile(testPath, "テスト");

      // 最初のユニークパスを取得して作成
      const result1 = await generateUniqueFilePath(testPath);
      await fs.writeFile(result1, "テスト2");

      // 2回目も成功することを確認
      const result2 = await generateUniqueFilePath(testPath);
      expect(result2).not.toBe(testPath);
      expect(result2).not.toBe(result1);
    });
  });

  describe("saveFileWithUniqueNameIfExists", () => {
    it("ファイルが存在しない場合は指定されたパスに保存", async () => {
      const testPath = path.join(tempDirPath, "save_test.txt");
      const testData = new TextEncoder().encode("テストデータ");

      const savedPath = await saveFileWithUniqueNameIfExists(testPath, testData);

      // 保存されたパスが元のパスと同じであることを確認
      expect(savedPath).toBe(testPath);

      // ファイルが実際に保存されていることを確認
      const stat = await fs.stat(testPath);
      expect(stat.isFile()).toBe(true);

      // ファイルの内容が正しいことを確認
      const content = await fs.readFile(testPath);
      expect(content).toEqual(Buffer.from(testData));
    });

    it("ファイルが存在する場合は一意の名前で保存", async () => {
      const testPath = path.join(tempDirPath, "save_test.txt");
      const testData1 = new TextEncoder().encode("テストデータ1");
      const testData2 = new TextEncoder().encode("テストデータ2");

      // 最初のファイルを保存
      await fs.writeFile(testPath, testData1);

      // 同じパスで2つ目のファイルを保存
      const savedPath = await saveFileWithUniqueNameIfExists(testPath, testData2);

      // 保存されたパスが元のパスと異なることを確認
      expect(savedPath !== testPath).toBe(true);

      // 両方のファイルが存在することを確認
      const stat1 = await fs.stat(testPath);
      const stat2 = await fs.stat(savedPath);
      expect(stat1.isFile()).toBe(true);
      expect(stat2.isFile()).toBe(true);

      // 両方のファイルの内容が正しいことを確認
      const content1 = await fs.readFile(testPath);
      const content2 = await fs.readFile(savedPath);
      expect(content1).toEqual(Buffer.from(testData1));
      expect(content2).toEqual(Buffer.from(testData2));
    });

    it("ディレクトリが存在しない場合はエラーをスロー", async () => {
      const testPath = path.join(tempDirPath, "non_existent_dir", "test.txt");
      const testData = new TextEncoder().encode("テストデータ");

      await expect(saveFileWithUniqueNameIfExists(testPath, testData)).rejects.toThrow();
    });
  });

  describe("loadContextFile", () => {
    it("パスがundefinedの場合は空文字列を返す", async () => {
      const result = await loadContextFile(undefined);
      expect(result).toBe("");
    });

    it("ファイルが存在する場合はその内容を返す", async () => {
      const testPath = path.join(tempDirPath, "context.txt");
      const content = "これはコンテキストです";
      await fs.writeFile(testPath, content, "utf-8");

      const result = await loadContextFile(testPath);
      expect(result).toBe(content);
    });

    it("ファイルが存在しない場合はエラーをスロー", async () => {
      const testPath = path.join(tempDirPath, "nonexistent.txt");
      await expect(loadContextFile(testPath)).rejects.toThrow("コンテキストファイルが見つかりません");
    });
  });

  describe("fileExists", () => {
    it("ファイルが存在する場合はtrueを返す", async () => {
      const testPath = path.join(tempDirPath, "exists.txt");
      await fs.writeFile(testPath, "test");

      const result = await fileExists(testPath);
      expect(result).toBe(true);
    });

    it("ファイルが存在しない場合はfalseを返す", async () => {
      const testPath = path.join(tempDirPath, "not_exists.txt");

      const result = await fileExists(testPath);
      expect(result).toBe(false);
    });
  });
});
