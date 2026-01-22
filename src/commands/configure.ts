import { Command } from "commander";
import inquirer from "inquirer";
import { loadConfig, saveConfig } from "../utils/config.js";

export function configureCommand(): Command {
  return new Command("configure")
    .description("APIキーなどの設定を行います")
    .action(async () => {
      try {
        // 環境変数の確認
        const envApiKey = process.env.GOOGLE_API_KEY;
        if (envApiKey) {
          console.log("環境変数 GOOGLE_API_KEY が設定されています。");
          const { useEnv } = await inquirer.prompt<{ useEnv: boolean }>([
            {
              type: "confirm",
              name: "useEnv",
              message: "環境変数の値を使用しますか？",
              default: true,
            },
          ]);
          if (useEnv) {
            await saveConfig({ googleApiKey: envApiKey });
            console.log("設定を保存しました。");
            return;
          }
        }

        // 設定ファイルの確認
        const config = await loadConfig();
        if (config?.googleApiKey) {
          console.log("設定ファイルにAPIキーが保存されています。");
          const { useConfig } = await inquirer.prompt<{ useConfig: boolean }>([
            {
              type: "confirm",
              name: "useConfig",
              message: "設定ファイルの値を使用しますか？",
              default: true,
            },
          ]);
          if (useConfig) {
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

        await saveConfig({ googleApiKey: apiKey });
        console.log("設定を保存しました。");
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
