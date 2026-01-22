import { Command } from "commander";
import { audioCommand } from "./audio.js";
import { captionCommand } from "./caption.js";
import { catalogCommand } from "./catalog.js";
import { configureCommand } from "./configure.js";
import { imageCommand } from "./image.js";
import { logCommand } from "./log.js";
import { videoCommand } from "./video.js";

export function createMainCommand(): Command {
  const program = new Command()
    .name("imark")
    .version("0.3.0")
    .description("AI画像・動画・音声生成ツール")
    .action(() => {
      console.log(
        "サブコマンドを指定してください: image, video, audio, caption, catalog, configure, log"
      );
      process.exit(1);
    });

  // 生成コマンド
  program.addCommand(imageCommand());
  program.addCommand(videoCommand());
  program.addCommand(audioCommand());

  // 分析コマンド
  program.addCommand(captionCommand());
  program.addCommand(catalogCommand());

  // ユーティリティ
  program.addCommand(configureCommand());
  program.addCommand(logCommand());

  return program;
}
