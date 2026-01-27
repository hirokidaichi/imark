import { Command } from "commander";
import { completionsCommand } from "./completions.js";
import { configureCommand } from "./configure.js";
import { imageCommand } from "./image/index.js";
import { logCommand } from "./log.js";
import { narrationCommand } from "./narration/index.js";
import { presetCommand } from "./preset.js";
import { videoCommand } from "./video/index.js";

export function createMainCommand(): Command {
  const program = new Command()
    .name("ergon")
    .version("0.4.0")
    .description("AI画像・動画・音声生成ツール")
    .action(() => {
      console.log("サブコマンドを指定してください: image, video, narration, preset, configure, log");
      console.log("\n例:");
      console.log("  ergon image gen <theme>     - Imagen4で画像生成");
      console.log("  ergon image edit <file> <prompt> - Nano Bananaで画像編集");
      console.log("  ergon image explain <file>  - 画像の説明");
      console.log("  ergon video gen <theme>     - Veo 3.1で動画生成");
      console.log("  ergon narration gen <text>  - TTSで音声生成");
      process.exit(1);
    });

  // メディア生成コマンド
  program.addCommand(imageCommand());
  program.addCommand(videoCommand());
  program.addCommand(narrationCommand());

  // ユーティリティ
  program.addCommand(presetCommand());
  program.addCommand(configureCommand());
  program.addCommand(logCommand());
  program.addCommand(completionsCommand());

  return program;
}
