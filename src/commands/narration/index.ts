import { Command } from "commander";
import { t } from "../../utils/i18n.js";
import { narrationGenCommand } from "./gen.js";

export function narrationCommand(): Command {
  const narration = new Command("narration")
    .description(t("narrationDescription"))
    .addHelpText("after", t("narrationHelp"));

  narration.addCommand(narrationGenCommand());

  return narration;
}
