import { Command } from "commander";
import { t } from "../utils/i18n.js";
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
    .description(t("mainDescription"))
    .addHelpText("before", t("banner"))
    .addHelpText("after", t("examples"))
    .action(() => {
      console.log(t("banner"));
      console.log(`${t("specifySubcommand")}\n`);
      console.log(t("mediaGeneration"));
      console.log(`  image      ${t("imageDescription")}`);
      console.log(`  video      ${t("videoDescription")}`);
      console.log(`  narration  ${t("narrationDescription")}`);
      console.log(`\n${t("utilities")}`);
      console.log(`  preset     ${t("presetDescription")}`);
      console.log(`  configure  ${t("configureDescription")}`);
      console.log(`  log        ${t("logDescription")}`);
      console.log(t("examples"));
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
