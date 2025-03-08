import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
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
    const testDir = "test_tmp";
    const testFile = join(testDir, "test.md");

    beforeEach(async () => {
      try {
        await Deno.mkdir(testDir);
      } catch (error) {
        // ディレクトリが既に存在する場合は無視
        if (!(error instanceof Deno.errors.AlreadyExists)) {
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

      try {
        const result = await loadContext(testFile);
        assertEquals(result, content);
      } finally {
        await Deno.remove(testFile);
        await Deno.remove(testDir, { recursive: true });
      }
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
      const testFile = "test_output.md";
      const options = { format: "markdown" as const, output: testFile };

      try {
        const logger = Logger.getInstance({ name: "test-catalog" });
        await outputResults(testResults, options, logger);
        const content = await Deno.readTextFile(testFile);
        const expected = testResults.map((result) =>
          `---\n\n# ${result.file}\n\n${result.caption}\n![](${result.file})\n\n`
        ).join("");
        assertEquals(content, expected);
      } finally {
        await Deno.remove(testFile);
      }
    });
  });
});
