import { Command } from "commander";
import { t } from "../../utils/i18n.js";
import { videoGenCommand } from "./gen.js";

export function videoCommand(): Command {
  const video = new Command("video")
    .description(t("videoDescription"))
    .addHelpText("after", t("videoHelp"));

  video.addCommand(videoGenCommand());

  return video;
}
