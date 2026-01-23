import { Command } from "commander";
import { narrationGenCommand } from "./gen.js";

export function narrationCommand(): Command {
  const narration = new Command("narration").description("音声ナレーションの生成");

  narration.addCommand(narrationGenCommand());

  return narration;
}
