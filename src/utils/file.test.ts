import {
  afterEach,
  assertEquals,
  assertRejects,
  beforeEach,
  describe,
  it,
} from "../deps-testing.ts";
import { exists, join } from "../deps.ts";
import { generateUniqueFilePath, saveFileWithUniqueNameIfExists } from "./file.ts";

describe("ファイル操作ユーティリティのテスト", () => {
  // テスト用の一時ディレクトリのパス
  let tempDirPath: string;

  // 各テスト前に一時ディレクトリを作成
  beforeEach(async () => {
    tempDirPath = await Deno.makeTempDir({ prefix: "imark_test_file_" });
    console.log("Temp dir path:", tempDirPath);
  });

  // 各テスト後にテストファイルを削除
  afterEach(async () => {
    try {
      await Deno.remove(tempDirPath, { recursive: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  });

  describe("generateUniqueFilePath", () => {
    it("ファイルが存在しない場合は元のパスを返す", async () => {
      const testPath = join(tempDirPath, "test.txt");
      const result = await generateUniqueFilePath(testPath);
      assertEquals(result, testPath);
    });

    it("ファイルが存在する場合は乱数を追加したパスを返す", async () => {
      const testPath = join(tempDirPath, "test.txt");

      // テストファイルを作成
      await Deno.writeTextFile(testPath, "テスト");

      const result = await generateUniqueFilePath(testPath);

      // 元のパスとは異なり、ベース名と拡張子の間に乱数が追加されていることを確認
      assertEquals(result !== testPath, true);
      assertEquals(result.startsWith(testPath.slice(0, testPath.lastIndexOf("."))), true);
      assertEquals(result.endsWith(".txt"), true);

      // 乱数部分が4桁の数字であることを確認
      const baseName = testPath.slice(0, testPath.lastIndexOf("."));
      const randomPart = result.slice(baseName.length + 1, result.lastIndexOf("."));
      assertEquals(randomPart.length, 4);
      assertEquals(isNaN(Number(randomPart)), false);
    });

    it("最大試行回数を超えた場合はエラーをスロー", async () => {
      const testPath = join(tempDirPath, "test.txt");

      // テストファイルを作成
      await Deno.writeTextFile(testPath, "テスト");

      // Deno.statをモックして常に成功を返すようにする
      const originalStat = Deno.stat;
      Deno.stat = () => {
        return Promise.resolve({
          isFile: true,
          isDirectory: false,
          isSymlink: false,
          size: 0,
          mtime: new Date(),
          atime: new Date(),
          birthtime: new Date(),
          dev: 0,
          ino: 0,
          mode: 0,
          nlink: 0,
          uid: 0,
          gid: 0,
          rdev: 0,
          blksize: 0,
          blocks: 0,
        } as Deno.FileInfo);
      };

      try {
        // 最大試行回数を2回に設定
        await assertRejects(
          async () => await generateUniqueFilePath(testPath, 2),
          Error,
          "ファイル名の生成に失敗しました。2回試行しましたが、すべて既存のファイル名と衝突しています。",
        );
      } finally {
        // モックを元に戻す
        Deno.stat = originalStat;
      }
    });
  });

  describe("saveFileWithUniqueNameIfExists", () => {
    it("ファイルが存在しない場合は指定されたパスに保存", async () => {
      const testPath = join(tempDirPath, "save_test.txt");
      const testData = new TextEncoder().encode("テストデータ");

      const savedPath = await saveFileWithUniqueNameIfExists(testPath, testData);

      // 保存されたパスが元のパスと同じであることを確認
      assertEquals(savedPath, testPath);

      // ファイルが実際に保存されていることを確認
      assertEquals(await exists(testPath), true);

      // ファイルの内容が正しいことを確認
      const content = await Deno.readFile(testPath);
      assertEquals(content, testData);
    });

    it("ファイルが存在する場合は一意の名前で保存", async () => {
      const testPath = join(tempDirPath, "save_test.txt");
      const testData1 = new TextEncoder().encode("テストデータ1");
      const testData2 = new TextEncoder().encode("テストデータ2");

      // 最初のファイルを保存
      await Deno.writeFile(testPath, testData1);

      // 同じパスで2つ目のファイルを保存
      const savedPath = await saveFileWithUniqueNameIfExists(testPath, testData2);

      // 保存されたパスが元のパスと異なることを確認
      assertEquals(savedPath !== testPath, true);

      // 両方のファイルが存在することを確認
      assertEquals(await exists(testPath), true);
      assertEquals(await exists(savedPath), true);

      // 両方のファイルの内容が正しいことを確認
      const content1 = await Deno.readFile(testPath);
      const content2 = await Deno.readFile(savedPath);
      assertEquals(content1, testData1);
      assertEquals(content2, testData2);
    });

    it("ディレクトリが存在しない場合はエラーをスロー", async () => {
      const testPath = join(tempDirPath, "non_existent_dir", "test.txt");
      const testData = new TextEncoder().encode("テストデータ");

      await assertRejects(
        async () => await saveFileWithUniqueNameIfExists(testPath, testData),
        Deno.errors.NotFound,
      );
    });
  });
});
