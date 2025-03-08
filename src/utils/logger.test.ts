import { assertEquals, assertExists } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { LogDestination, Logger, LogLevel } from "./logger.ts";

describe("Logger", () => {
  beforeEach(() => {
    // テスト前にグローバル設定とインスタンスをリセット
    Logger.setGlobalConfig({
      destination: LogDestination.CONSOLE,
      minLevel: LogLevel.INFO,
    });
    Logger.setContext("default");
  });

  afterEach(() => {
    // @ts-ignore: private static field access for testing
    Logger.instances.clear();
  });

  describe("グローバル設定", () => {
    it("デフォルト設定が正しく設定されている", () => {
      Logger.setContext("test");
      const message = "テストメッセージ";
      const spy = console.info;
      let called = false;

      console.info = (...args: unknown[]) => {
        called = true;
        const logMessage = args[0] as string;
        assertExists(logMessage);
        assertEquals(logMessage.includes("[test]"), true);
        assertEquals(logMessage.includes(message), true);
      };

      try {
        Logger.info(message);
        assertEquals(called, true);
      } finally {
        console.info = spy;
      }
    });

    it("グローバル設定を変更できる", () => {
      Logger.setGlobalConfig({
        destination: LogDestination.CONSOLE,
        minLevel: LogLevel.ERROR,
      });

      const spyInfo = console.info;
      const spyError = console.error;
      let infoCount = 0;
      let errorCount = 0;

      console.info = () => {
        infoCount++;
      };
      console.error = () => {
        errorCount++;
      };

      try {
        Logger.info("情報メッセージ");
        Logger.error("エラーメッセージ");

        assertEquals(infoCount, 0); // INFOレベルはログ出力されない
        assertEquals(errorCount, 1); // ERRORレベルはログ出力される
      } finally {
        console.info = spyInfo;
        console.error = spyError;
      }
    });
  });

  describe("コンテキスト管理", () => {
    it("コンテキストを切り替えられる", () => {
      const context1 = "context1";
      const context2 = "context2";
      const message = "テストメッセージ";
      const logs: string[] = [];

      const spy = console.info;
      console.info = (...args: unknown[]) => {
        logs.push(args[0] as string);
      };

      try {
        Logger.setContext(context1);
        Logger.info(message);
        Logger.setContext(context2);
        Logger.info(message);

        assertEquals(logs[0].includes(`[${context1}]`), true);
        assertEquals(logs[1].includes(`[${context2}]`), true);
      } finally {
        console.info = spy;
      }
    });
  });

  describe("インスタンス管理", () => {
    it("同じ名前のロガーは同じインスタンスを返す", () => {
      const name = "test-logger";
      const logger1 = Logger.getInstance({ name });
      const logger2 = Logger.getInstance({ name });

      assertEquals(logger1 === logger2, true);
    });

    it("異なる名前のロガーは異なるインスタンスを返す", () => {
      const logger1 = Logger.getInstance({ name: "logger1" });
      const logger2 = Logger.getInstance({ name: "logger2" });

      assertEquals(logger1 === logger2, false);
    });
  });

  describe("ログレベル", () => {
    it("設定されたレベル以上のログのみ出力される", () => {
      Logger.setGlobalConfig({
        destination: LogDestination.CONSOLE,
        minLevel: LogLevel.WARN,
      });

      const logs: string[] = [];
      const spy = {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
      };

      console.debug = (...args: unknown[]) => logs.push(args[0] as string);
      console.info = (...args: unknown[]) => logs.push(args[0] as string);
      console.warn = (...args: unknown[]) => logs.push(args[0] as string);
      console.error = (...args: unknown[]) => logs.push(args[0] as string);

      try {
        Logger.debug("デバッグメッセージ");
        Logger.info("情報メッセージ");
        Logger.warn("警告メッセージ");
        Logger.error("エラーメッセージ");

        assertEquals(logs.length, 2); // WARNとERRORのみ出力される
        assertEquals(logs[0].includes("[WARN]"), true);
        assertEquals(logs[1].includes("[ERROR]"), true);
      } finally {
        console.debug = spy.debug;
        console.info = spy.info;
        console.warn = spy.warn;
        console.error = spy.error;
      }
    });
  });
});
