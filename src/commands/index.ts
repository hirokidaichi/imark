import { Command } from "commander";
import { audioCommand } from "./audio.js";
import { configureCommand } from "./configure.js";
import { explainCommand } from "./explain.js";
import { imageCommand } from "./image.js";
import { logCommand } from "./log.js";
import { videoCommand } from "./video.js";

export function createMainCommand(): Command {
  const program = new Command()
    .name("imark")
    .version("0.3.0")
    .description("AI画像・動画・音声生成ツール")
    .action(() => {
      console.log("サブコマンドを指定してください: image, video, audio, explain, configure, log");
      process.exit(1);
    });

  // 生成コマンド
  program.addCommand(imageCommand());
  program.addCommand(videoCommand());
  program.addCommand(audioCommand());

  // 分析コマンド
  program.addCommand(explainCommand());

  // ユーティリティ
  program.addCommand(configureCommand());
  program.addCommand(logCommand());

  return program;
}
