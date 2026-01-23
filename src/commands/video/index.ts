import { Command } from "commander";
import { videoGenCommand } from "./gen.js";

export function videoCommand(): Command {
  const video = new Command("video").description("動画の生成");

  video.addCommand(videoGenCommand());

  return video;
}
