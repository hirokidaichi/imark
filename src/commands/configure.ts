import { Command } from "@cliffy/command";
import { Confirm, Secret } from "@cliffy/prompt";
import { loadConfig, saveConfig } from "../utils/config.ts";

export const configureCommand = new Command()
  .description("APIキーなどの設定を行います")
  .action(async () => {
    try {
      // 環境変数の確認
      const envApiKey = Deno.env.get("GOOGLE_API_KEY");
      if (envApiKey) {
        console.log("環境変数 GOOGLE_API_KEY が設定されています。");
        const useEnv = await Confirm.prompt("環境変数の値を使用しますか？");
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
        const useConfig = await Confirm.prompt("設定ファイルの値を使用しますか？");
        if (useConfig) {
          return;
        }
      }

      // 新しいAPIキーの入力
      const apiKey = await Secret.prompt("Google APIキーを入力してください:");
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
      Deno.exit(1);
    }
  });
