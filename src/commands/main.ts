import { Command, CompletionsCommand } from "../deps.ts";
import { captionCommand } from "./caption.ts";
import { catalogCommand } from "./catalog.ts";
import { configureCommand } from "./configure.ts";
import { genCommand } from "./gen.ts";
import { logCommand } from "./log.ts";
import { mcpCommand } from "./mcp.ts";

export function createMainCommand() {
  return new Command()
    .name("imark")
    .version("0.1.0")
    .description("画像キャプション生成CLIツール - Gemini APIを使用")
    .action(() => {
      console.log(
        "サブコマンドを指定してください: caption, catalog, configure, gen, log, mcp, completion",
      );
      return 1;
    })
    .command("caption", captionCommand)
    .command("catalog", catalogCommand)
    .command("configure", configureCommand)
    .command("gen", genCommand)
    .command("log", logCommand)
    .command("mcp", mcpCommand)
    .command("completions", new CompletionsCommand());
}
