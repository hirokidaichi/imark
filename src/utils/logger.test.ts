import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogDestination, Logger, LogLevel } from "./logger.js";

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
    // @ts-expect-error: private static field access for testing
    Logger.instances.clear();
  });

  describe("グローバル設定", () => {
    it("デフォルト設定が正しく設定されている", async () => {
      Logger.setContext("test");
      const message = "テストメッセージ";
      let logMessage = "";

      const spy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
        logMessage = args[0] as string;
      });

      try {
        await Logger.info(message);
        expect(logMessage).toBeDefined();
        expect(logMessage.includes("[test]")).toBe(true);
        expect(logMessage.includes(message)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });

    it("グローバル設定を変更できる", async () => {
      Logger.setGlobalConfig({
        destination: LogDestination.CONSOLE,
        minLevel: LogLevel.ERROR,
      });

      let infoCount = 0;
      let errorCount = 0;

      const spyInfo = vi.spyOn(console, "info").mockImplementation(() => {
        infoCount++;
      });
      const spyError = vi.spyOn(console, "error").mockImplementation(() => {
        errorCount++;
      });

      try {
        await Logger.info("情報メッセージ");
        await Logger.error("エラーメッセージ");

        expect(infoCount).toBe(0); // INFOレベルはログ出力されない
        expect(errorCount).toBe(1); // ERRORレベルはログ出力される
      } finally {
        spyInfo.mockRestore();
        spyError.mockRestore();
      }
    });
  });

  describe("コンテキスト管理", () => {
    it("コンテキストを切り替えられる", async () => {
      const context1 = "context1";
      const context2 = "context2";
      const message = "テストメッセージ";
      const logs: string[] = [];

      const spy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
        logs.push(args[0] as string);
      });

      try {
        Logger.setContext(context1);
        await Logger.info(message);
        Logger.setContext(context2);
        await Logger.info(message);

        expect(logs[0].includes(`[${context1}]`)).toBe(true);
        expect(logs[1].includes(`[${context2}]`)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("インスタンス管理", () => {
    it("同じ名前のロガーは同じインスタンスを返す", () => {
      const name = "test-logger";
      const logger1 = Logger.getInstance({ name });
      const logger2 = Logger.getInstance({ name });

      expect(logger1 === logger2).toBe(true);
    });

    it("異なる名前のロガーは異なるインスタンスを返す", () => {
      const logger1 = Logger.getInstance({ name: "logger1" });
      const logger2 = Logger.getInstance({ name: "logger2" });

      expect(logger1 === logger2).toBe(false);
    });
  });

  describe("ログレベル", () => {
    it("設定されたレベル以上のログのみ出力される", async () => {
      Logger.setGlobalConfig({
        destination: LogDestination.CONSOLE,
        minLevel: LogLevel.WARN,
      });

      const logs: string[] = [];

      const spyDebug = vi.spyOn(console, "debug").mockImplementation((...args: unknown[]) => {
        logs.push(args[0] as string);
      });
      const spyInfo = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
        logs.push(args[0] as string);
      });
      const spyWarn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
        logs.push(args[0] as string);
      });
      const spyError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        logs.push(args[0] as string);
      });

      try {
        await Logger.debug("デバッグメッセージ");
        await Logger.info("情報メッセージ");
        await Logger.warn("警告メッセージ");
        await Logger.error("エラーメッセージ");

        expect(logs.length).toBe(2); // WARNとERRORのみ出力される
        expect(logs[0].includes("[WARN]")).toBe(true);
        expect(logs[1].includes("[ERROR]")).toBe(true);
      } finally {
        spyDebug.mockRestore();
        spyInfo.mockRestore();
        spyWarn.mockRestore();
        spyError.mockRestore();
      }
    });
  });
});
