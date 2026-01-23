import { Command } from "commander";
import { imageEditCommand } from "./edit.js";
import { imageExplainCommand } from "./explain.js";
import { imageGenCommand } from "./gen.js";

export function imageCommand(): Command {
  const image = new Command("image").description("画像の生成・編集・説明");

  image.addCommand(imageGenCommand());
  image.addCommand(imageEditCommand());
  image.addCommand(imageExplainCommand());

  return image;
}
