import { Command } from "commander";
import inquirer from "inquirer";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../lang.js";
import {
  type Config,
  DEFAULT_CONFIG,
  getConfigPath,
  loadConfig,
  saveConfig,
} from "../utils/config.js";

type ConfigMenuItem = "apiKey" | "defaults" | "show" | "reset" | "exit";

export function configureCommand(): Command {
  return new Command("configure")
    .description("APIキーなどの設定を行います")
    .option("--show", "現在の設定を表示")
    .option("--reset", "設定をリセット")
    .action(async (options: { show?: boolean; reset?: boolean }) => {
      try {
        if (options.show) {
          await showConfig();
          return;
        }

        if (options.reset) {
          await resetConfig();
          return;
        }

        await interactiveConfig();
      } catch (error) {
        if (error instanceof Error) {
          console.error("エラー:", error.message);
        } else {
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });
}

async function showConfig(): Promise<void> {
  const config = await loadConfig();
  const configPath = getConfigPath();

  console.log(`\n設定ファイル: ${configPath}\n`);

  if (!config) {
    console.log("設定ファイルが見つかりません。");
    console.log("\nデフォルト値:");
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    return;
  }

  // APIキーは隠す
  const displayConfig = { ...config };
  if (displayConfig.googleApiKey) {
    displayConfig.googleApiKey = "****" + displayConfig.googleApiKey.slice(-4);
  }

  console.log("現在の設定:");
  console.log(JSON.stringify(displayConfig, null, 2));
}

async function resetConfig(): Promise<void> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: "設定をリセットしますか？（APIキーも削除されます）",
      default: false,
    },
  ]);

  if (confirm) {
    await saveConfig({});
    console.log("設定をリセットしました。");
  } else {
    console.log("キャンセルしました。");
  }
}

async function interactiveConfig(): Promise<void> {
  const { action } = await inquirer.prompt<{ action: ConfigMenuItem }>([
    {
      type: "list",
      name: "action",
      message: "設定項目を選択してください",
      choices: [
        { name: "🔑 APIキーを設定", value: "apiKey" },
        { name: "⚙️  デフォルト値を設定", value: "defaults" },
        { name: "📋 現在の設定を表示", value: "show" },
        { name: "🗑️  設定をリセット", value: "reset" },
        { name: "❌ 終了", value: "exit" },
      ],
    },
  ]);

  switch (action) {
    case "apiKey":
      await configureApiKey();
      break;
    case "defaults":
      await configureDefaults();
      break;
    case "show":
      await showConfig();
      break;
    case "reset":
      await resetConfig();
      break;
    case "exit":
      return;
  }
}

async function configureApiKey(): Promise<void> {
  const config = (await loadConfig()) || {};

  // 環境変数の確認
  const envApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (envApiKey) {
    console.log("\n環境変数でAPIキーが設定されています。");
    const { useEnv } = await inquirer.prompt<{ useEnv: boolean }>([
      {
        type: "confirm",
        name: "useEnv",
        message: "環境変数の値を設定ファイルに保存しますか？",
        default: true,
      },
    ]);
    if (useEnv) {
      config.googleApiKey = envApiKey;
      await saveConfig(config);
      console.log("設定を保存しました。");
      return;
    }
  }

  // 既存の設定確認
  if (config.googleApiKey) {
    console.log("\n設定ファイルにAPIキーが保存されています。");
    const { keep } = await inquirer.prompt<{ keep: boolean }>([
      {
        type: "confirm",
        name: "keep",
        message: "現在の設定を維持しますか？",
        default: true,
      },
    ]);
    if (keep) {
      return;
    }
  }

  // 新しいAPIキーの入力
  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: "password",
      name: "apiKey",
      message: "Google APIキーを入力してください:",
      mask: "*",
    },
  ]);

  if (!apiKey) {
    throw new Error("APIキーが入力されていません");
  }

  config.googleApiKey = apiKey;
  await saveConfig(config);
  console.log("設定を保存しました。");
}

async function configureDefaults(): Promise<void> {
  const config = (await loadConfig()) || {};

  const answers = await inquirer.prompt<{
    language: SupportedLanguage;
    imageEngine: string;
    imageFormat: string;
    aspectRatio: string;
    audioVoice: string;
  }>([
    {
      type: "list",
      name: "language",
      message: "デフォルト言語",
      choices: Object.entries(LANGUAGE_DESCRIPTIONS).map(([key, value]) => ({
        name: `${key}: ${value}`,
        value: key,
      })),
      default: config.defaultLanguage || DEFAULT_CONFIG.defaultLanguage,
    },
    {
      type: "list",
      name: "imageEngine",
      message: "デフォルト画像エンジン",
      choices: [
        { name: "Imagen 4 (標準)", value: "imagen4" },
        { name: "Imagen 4 Fast (高速)", value: "imagen4-fast" },
        { name: "Imagen 4 Ultra (高品質)", value: "imagen4-ultra" },
        { name: "Nano Banana (Gemini)", value: "nano-banana" },
        { name: "Nano Banana Pro (Gemini高品質)", value: "nano-banana-pro" },
      ],
      default: config.defaultImageEngine || DEFAULT_CONFIG.defaultImageEngine,
    },
    {
      type: "list",
      name: "imageFormat",
      message: "デフォルト画像フォーマット",
      choices: [
        { name: "WebP (推奨)", value: "webp" },
        { name: "PNG", value: "png" },
        { name: "JPEG", value: "jpg" },
      ],
      default: config.defaultImageFormat || DEFAULT_CONFIG.defaultImageFormat,
    },
    {
      type: "list",
      name: "aspectRatio",
      message: "デフォルトアスペクト比",
      choices: [
        { name: "16:9 (横長)", value: "16:9" },
        { name: "4:3 (標準)", value: "4:3" },
        { name: "1:1 (正方形)", value: "1:1" },
        { name: "9:16 (縦長)", value: "9:16" },
        { name: "3:4 (縦長標準)", value: "3:4" },
      ],
      default: config.defaultAspectRatio || DEFAULT_CONFIG.defaultAspectRatio,
    },
    {
      type: "list",
      name: "audioVoice",
      message: "デフォルト音声",
      choices: [
        { name: "Kore (女性)", value: "Kore" },
        { name: "Aoede (女性)", value: "Aoede" },
        { name: "Charon (男性)", value: "Charon" },
        { name: "Fenrir (男性)", value: "Fenrir" },
        { name: "Puck (中性)", value: "Puck" },
      ],
      default: config.defaultAudioVoice || DEFAULT_CONFIG.defaultAudioVoice,
    },
  ]);

  config.defaultLanguage = answers.language;
  config.defaultImageEngine = answers.imageEngine as Config["defaultImageEngine"];
  config.defaultImageFormat = answers.imageFormat as Config["defaultImageFormat"];
  config.defaultAspectRatio = answers.aspectRatio as Config["defaultAspectRatio"];
  config.defaultAudioVoice = answers.audioVoice as Config["defaultAudioVoice"];

  await saveConfig(config);
  console.log("\nデフォルト設定を保存しました。");
}
