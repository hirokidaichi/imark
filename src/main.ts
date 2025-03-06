import { Command } from "@cliffy/command";
import { captionCommand } from "./commands/caption.ts";
import { catalogCommand } from "./commands/catalog.ts";
import { configureCommand } from "./commands/configure.ts";
import { GenCommand } from "./commands/gen.ts";
import { logCommand } from "./commands/log.ts";
import { mcpCommand } from "./commands/mcp.ts";

export function createMainCommand() {
  return new Command()
    .name("imark")
    .version("0.1.0")
    .description("画像キャプション生成CLIツール - Gemini APIを使用")
    .action(() => {
      console.log("サブコマンドを指定してください: caption, catalog, configure, gen, log, mcp");
      Deno.exit(1);
    })
    .command("caption", captionCommand)
    .command("catalog", catalogCommand)
    .command("configure", configureCommand)
    .command("gen", new GenCommand())
    .command("log", logCommand)
    .command("mcp", mcpCommand);
}

if (import.meta.main) {
  await createMainCommand().parse(Deno.args);
}
