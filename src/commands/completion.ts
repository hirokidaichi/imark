import { Command } from "@cliffy/command";
import { createMainCommand } from "../main.ts";

export const completionCommand = new Command()
  .description("シェルのコマンド補完スクリプトを生成します")
  .option("-s, --shell <shell:string>", "シェルの種類 (bash, fish, zsh)", {
    default: "bash",
  })
  .action(async ({ shell }) => {
    try {
      const command = createMainCommand();
      const completionScript = command.getCompletion(shell);
      console.log(completionScript);
    } catch (error) {
      if (error instanceof Error) {
        console.error("エラー:", error.message);
      } else {
        console.error("不明なエラーが発生しました");
      }
      Deno.exit(1);
    }
  });
