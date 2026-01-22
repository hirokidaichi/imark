import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONFIG,
  getApiKey,
  getConfigDir,
  getConfigPath,
  getConfigValue,
  loadConfig,
  saveConfig,
  validateApiKeyFormat,
} from "./config.js";

describe("config", () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let originalGoogleApiKey: string | undefined;
  let originalGeminiApiKey: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imark-test-"));
    originalHome = process.env.HOME;
    originalGoogleApiKey = process.env.GOOGLE_API_KEY;
    originalGeminiApiKey = process.env.GEMINI_API_KEY;

    process.env.HOME = tempDir;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    if (originalGoogleApiKey) {
      process.env.GOOGLE_API_KEY = originalGoogleApiKey;
    } else {
      delete process.env.GOOGLE_API_KEY;
    }
    if (originalGeminiApiKey) {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getConfigDir", () => {
    it("should return ~/.imark", () => {
      expect(getConfigDir()).toBe(path.join(tempDir, ".imark"));
    });
  });

  describe("getConfigPath", () => {
    it("should return ~/.imark/config.json", () => {
      expect(getConfigPath()).toBe(path.join(tempDir, ".imark", "config.json"));
    });
  });

  describe("loadConfig", () => {
    it("should return null when config file does not exist", async () => {
      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it("should load config from file", async () => {
      const configDir = path.join(tempDir, ".imark");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "config.json"),
        JSON.stringify({ googleApiKey: "test-key" })
      );

      const config = await loadConfig();
      expect(config).toEqual({ googleApiKey: "test-key" });
    });
  });

  describe("saveConfig", () => {
    it("should create config directory and save config", async () => {
      await saveConfig({ googleApiKey: "test-key" });

      const configPath = path.join(tempDir, ".imark", "config.json");
      const content = await fs.readFile(configPath, "utf-8");
      expect(JSON.parse(content)).toEqual({ googleApiKey: "test-key" });
    });
  });

  describe("getConfigValue", () => {
    it("should return config value when set", async () => {
      await saveConfig({ defaultLanguage: "en" });
      const value = await getConfigValue("defaultLanguage");
      expect(value).toBe("en");
    });

    it("should return default value when not set", async () => {
      const value = await getConfigValue("defaultLanguage");
      expect(value).toBe(DEFAULT_CONFIG.defaultLanguage);
    });
  });

  describe("validateApiKeyFormat", () => {
    it("should return null for valid API key", () => {
      expect(validateApiKeyFormat("AIzaSyDTEST1234567890abcdefghij")).toBeNull();
    });

    it("should return error for empty key", () => {
      expect(validateApiKeyFormat("")).toBe("APIキーが空です");
    });

    it("should return error for short key", () => {
      expect(validateApiKeyFormat("short")).toBe("APIキーが短すぎます");
    });

    it("should return error for key with invalid characters", () => {
      expect(validateApiKeyFormat("invalid key with spaces!")).toBe(
        "APIキーに無効な文字が含まれています"
      );
    });
  });

  describe("getApiKey", () => {
    it("should return API key from GOOGLE_API_KEY environment variable", async () => {
      process.env.GOOGLE_API_KEY = "AIzaSyDENVAPIKEY123456789012345";
      const key = await getApiKey();
      expect(key).toBe("AIzaSyDENVAPIKEY123456789012345");
    });

    it("should return API key from GEMINI_API_KEY environment variable", async () => {
      process.env.GEMINI_API_KEY = "AIzaSyDGEMINIAPIKEY1234567890123";
      const key = await getApiKey();
      expect(key).toBe("AIzaSyDGEMINIAPIKEY1234567890123");
    });

    it("should prefer GOOGLE_API_KEY over GEMINI_API_KEY", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.GOOGLE_API_KEY = "AIzaSyDGOOGLEAPIKEY12345678901234";
      process.env.GEMINI_API_KEY = "AIzaSyDGEMINIAPIKEY1234567890123";
      const key = await getApiKey();
      expect(key).toBe("AIzaSyDGOOGLEAPIKEY12345678901234");
      consoleErrorSpy.mockRestore();
    });

    it("should return API key from config file", async () => {
      await saveConfig({ googleApiKey: "AIzaSyDCONFIGAPIKEY1234567890123" });
      const key = await getApiKey();
      expect(key).toBe("AIzaSyDCONFIGAPIKEY1234567890123");
    });

    it("should throw error when API key is not set", async () => {
      await expect(getApiKey()).rejects.toThrow("GOOGLE_API_KEYが設定されていません");
    });

    it("should throw error for invalid API key format", async () => {
      process.env.GOOGLE_API_KEY = "short";
      await expect(getApiKey()).rejects.toThrow("APIキーが短すぎます");
    });
  });
});
