import {
  afterEach,
  assertEquals,
  assertRejects,
  beforeEach,
  describe,
  it,
} from "../deps-testing.ts";
import { join } from "../deps.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";
import { ProcessResult } from "./catalog.ts";

describe("catalog.ts", () => {
  beforeEach(() => {
    // テスト前にグローバル設定とインスタンスをリセット
    Logger.setGlobalConfig({
      destination: LogDestination.CONSOLE,
      minLevel: LogLevel.INFO,
    });
    Logger.setContext("test-catalog");
  });

  afterEach(() => {
    // @ts-ignore: private static field access for testing
    Logger.instances.clear();
  });

  describe("loadContext", () => {
    let tempDir: string;
    let testFile: string;

    beforeEach(async () => {
      // テスト用の一時ディレクトリを作成
      tempDir = await Deno.makeTempDir({ prefix: "imark_test_catalog_" });
      testFile = join(tempDir, "test.md");
    });

    afterEach(async () => {
      // テスト用の一時ディレクトリを削除
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (error) {
        // ディレクトリが存在しない場合は無視
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }
    });

    it("should return undefined when no context is provided", async () => {
      const { loadContext } = await import("./catalog.ts");
      const result = await loadContext();
      assertEquals(result, undefined);
    });

    it("should return text content when non-md context is provided", async () => {
      const { loadContext } = await import("./catalog.ts");
      const context = "テストコンテキスト";
      const result = await loadContext(context);
      assertEquals(result, context);
    });

    it("should load markdown file when .md file is provided", async () => {
      const { loadContext } = await import("./catalog.ts");
      const content = "# テストマークダウン";
      await Deno.writeTextFile(testFile, content);

      const result = await loadContext(testFile);
      assertEquals(result, content);
    });

    it("should throw error when markdown file does not exist", async () => {
      const { loadContext } = await import("./catalog.ts");
      await assertRejects(
        () => loadContext("non_existent.md"),
        Error,
        "Markdownファイルの読み込みに失敗しました",
      );
    });
  });

  describe("formatMarkdownEntry", () => {
    it("should format ProcessResult correctly", async () => {
      const { formatMarkdownEntry } = await import("./catalog.ts");
      const result: ProcessResult = {
        file: "test.jpg",
        caption: "テストキャプション",
      };

      const expected = `---\n\n# test.jpg\n\nテストキャプション\n![](test.jpg)\n\n`;
      const formatted = formatMarkdownEntry(result);
      assertEquals(formatted, expected);
    });
  });

  describe("outputResults", () => {
    const testResults: ProcessResult[] = [
      { file: "test1.jpg", caption: "キャプション1" },
      { file: "test2.jpg", caption: "キャプション2" },
    ];
    let tempDir: string;

    beforeEach(async () => {
      // テスト用の一時ディレクトリを作成
      tempDir = await Deno.makeTempDir({ prefix: "imark_test_output_" });
    });

    afterEach(async () => {
      // テスト用の一時ディレクトリを削除
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (error) {
        // ディレクトリが存在しない場合は無視
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }
    });

    it("should output JSON format correctly", async () => {
      // We need to clear the import cache to get the latest version
      // Using a different import approach
      const catalog = await import(`./catalog.ts#${Date.now()}`);
      const outputResults = catalog.outputResults;
      const options = { format: "json" as const };

      // コンソール出力をキャプチャ
      const originalConsoleLog = console.log;
      let output = "";
      console.log = (str: string): void => {
        output = str;
      };

      const logger = Logger.getInstance({ name: "test-catalog" });
      await outputResults(testResults, options, logger);
      console.log = originalConsoleLog;

      const expectedJson = JSON.stringify(testResults, null, 2);
      assertEquals(output, expectedJson);
    });

    it("should output Markdown format correctly", async () => {
      // We need to clear the import cache to get the latest version
      const catalog = await import(`./catalog.ts#${Date.now()}`);
      const outputResults = catalog.outputResults;
      const options = { format: "markdown" as const };

      // コンソール出力をキャプチャ
      const originalConsoleLog = console.log;
      let output = "";
      console.log = (str: string): void => {
        output = str;
      };

      const logger = Logger.getInstance({ name: "test-catalog" });
      await outputResults(testResults, options, logger);
      console.log = originalConsoleLog;

      const expected = testResults.map((result) =>
        `---\n\n# ${result.file}\n\n${result.caption}\n![](${result.file})\n\n`
      ).join("");
      assertEquals(output, expected);
    });

    it("should write to file when output option is provided", async () => {
      // We need to clear the import cache to get the latest version
      const catalog = await import(`./catalog.ts#${Date.now()}`);
      const outputResults = catalog.outputResults;
      const formatMarkdownEntry = catalog.formatMarkdownEntry;
      const testFile = join(tempDir, "test_output.md");
      const options = { format: "markdown" as const, output: testFile };

      const logger = Logger.getInstance({ name: "test-catalog" });
      await outputResults(testResults, options, logger);
      const content = await Deno.readTextFile(testFile);

      // 期待される出力を生成（formatMarkdownEntryを使用して正確に再現）
      const expected = testResults.map((result) => formatMarkdownEntry(result, testFile)).join("");

      assertEquals(content, expected);
    });
  });
});
