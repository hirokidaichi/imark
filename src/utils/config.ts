import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { SupportedLanguage } from "../lang.js";

/**
 * 画像生成エンジン
 */
export type ImageEngineConfig = "imagen4" | "imagen4-fast" | "imagen4-ultra" | "nano-banana" | "nano-banana-pro";

/**
 * 画像フォーマット
 */
export type ImageFormatConfig = "png" | "jpg" | "jpeg" | "webp";

/**
 * アスペクト比
 */
export type AspectRatioConfig = "16:9" | "4:3" | "1:1" | "9:16" | "3:4";

/**
 * 音声ボイス
 */
export type VoiceConfig = "Aoede" | "Charon" | "Fenrir" | "Kore" | "Puck";

/**
 * ログレベル
 */
export type LogLevelConfig = "debug" | "info" | "warn" | "error";

/**
 * ergon設定
 */
export interface Config {
  // API設定
  googleApiKey?: string;

  // デフォルト出力設定
  defaultOutputDir?: string;
  defaultLanguage?: SupportedLanguage;

  // 画像生成デフォルト
  defaultImageEngine?: ImageEngineConfig;
  defaultImageFormat?: ImageFormatConfig;
  defaultAspectRatio?: AspectRatioConfig;
  defaultImageType?: string;

  // 音声生成デフォルト
  defaultAudioVoice?: VoiceConfig;
  defaultAudioFormat?: "mp3" | "wav";

  // ログ設定
  logLevel?: LogLevelConfig;
}

/**
 * デフォルト設定値
 */
export const DEFAULT_CONFIG: Required<Omit<Config, "googleApiKey" | "defaultOutputDir">> = {
  defaultLanguage: "ja",
  defaultImageEngine: "imagen4",
  defaultImageFormat: "webp",
  defaultAspectRatio: "16:9",
  defaultImageType: "flat",
  defaultAudioVoice: "Kore",
  defaultAudioFormat: "mp3",
  logLevel: "info",
};

export interface McpConfig {
  mcpServers: {
    [key: string]: {
      type: string;
      command: string;
      args: string[];
      disabled?: boolean;
      workingDirectory?: string;
    };
  };
}

export function getConfigDir(): string {
  const home = os.homedir();
  if (!home) {
    throw new Error("HOME環境変数が設定されていません");
  }
  return path.join(home, ".ergon");
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const configPath = getConfigPath();
    const configText = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configText) as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * 設定値を取得（設定ファイル → デフォルト値の順で解決）
 */
export async function getConfigValue<K extends keyof Config>(
  key: K
): Promise<Config[K] | undefined> {
  const config = await loadConfig();
  if (config && config[key] !== undefined) {
    return config[key];
  }
  return (DEFAULT_CONFIG as Record<string, unknown>)[key] as Config[K] | undefined;
}

/**
 * 複数の設定値を一度に取得
 */
export async function getConfigValues<K extends keyof Config>(
  keys: K[]
): Promise<Pick<Config, K>> {
  const config = await loadConfig();
  const result: Partial<Config> = {};

  for (const key of keys) {
    if (config && config[key] !== undefined) {
      result[key] = config[key];
    } else if ((DEFAULT_CONFIG as Record<string, unknown>)[key] !== undefined) {
      result[key] = (DEFAULT_CONFIG as Record<string, unknown>)[key] as Config[K];
    }
  }

  return result as Pick<Config, K>;
}

/**
 * APIキーのフォーマットを検証
 * @returns エラーメッセージ（有効な場合はnull）
 */
export function validateApiKeyFormat(apiKey: string): string | null {
  if (!apiKey || apiKey.trim().length === 0) {
    return "APIキーが空です";
  }

  // Google API keyの基本的なフォーマットチェック
  // 通常は"AIza"で始まり、39文字程度
  if (apiKey.length < 20) {
    return "APIキーが短すぎます";
  }

  if (apiKey.length > 100) {
    return "APIキーが長すぎます";
  }

  // 基本的な文字種チェック（英数字、ハイフン、アンダースコアのみ）
  if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
    return "APIキーに無効な文字が含まれています";
  }

  return null;
}

export async function getApiKey(): Promise<string> {
  // 環境変数を優先（GOOGLE_API_KEY → GEMINI_API_KEY）
  const envApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (envApiKey) {
    if (process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
      console.error("Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.");
    }
    const validationError = validateApiKeyFormat(envApiKey);
    if (validationError) {
      throw new Error(`無効なAPIキー (環境変数): ${validationError}`);
    }
    return envApiKey;
  }

  // 設定ファイルを確認
  const config = await loadConfig();
  if (config?.googleApiKey) {
    const validationError = validateApiKeyFormat(config.googleApiKey);
    if (validationError) {
      throw new Error(`無効なAPIキー (設定ファイル): ${validationError}`);
    }
    return config.googleApiKey;
  }

  throw new Error(
    "GOOGLE_API_KEYが設定されていません。`ergon configure`コマンドで設定してください。"
  );
}

export async function loadMcpConfig(dir: string): Promise<McpConfig | null> {
  try {
    const configPath = path.join(dir, ".cursor", "mcp.json");
    const configText = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configText) as McpConfig;
  } catch {
    return null;
  }
}

export async function saveMcpConfig(dir: string, config: McpConfig): Promise<void> {
  const configPath = path.join(dir, ".cursor", "mcp.json");
  const configDir = path.join(dir, ".cursor");

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
