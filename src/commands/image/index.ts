import { Command } from "commander";
import { t } from "../../utils/i18n.js";
import { imageEditCommand } from "./edit.js";
import { imageExplainCommand } from "./explain.js";
import { imageGenCommand } from "./gen.js";

export function imageCommand(): Command {
  const image = new Command("image")
    .description(t("imageDescription"))
    .addHelpText("after", t("imageHelp"));

  image.addCommand(imageGenCommand());
  image.addCommand(imageEditCommand());
  image.addCommand(imageExplainCommand());

  return image;
}
