import { Command } from "@cliffy/command";
import { captionCommand } from "./commands/caption.ts";
import { catalogCommand } from "./commands/catalog.ts";
import { completionCommand } from "./commands/completion.ts";
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
      console.log(
        "サブコマンドを指定してください: caption, catalog, configure, gen, log, mcp, completion",
      );
      return 1;
    })
    .command("caption", captionCommand)
    .command("catalog", catalogCommand)
    .command("configure", configureCommand)
    .command("gen", new GenCommand())
    .command("log", logCommand)
    .command("mcp", mcpCommand)
    .command("completion", completionCommand);
}

if (import.meta.main) {
  try {
    const command = createMainCommand();
    const result = await command.parse(Deno.args);
    // mcpコマンドの場合は、プロセスを終了させない
    if (Deno.args[0] !== "mcp") {
      const exitCode = typeof result === "number" ? result : 0;
      Deno.exit(exitCode);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    Deno.exit(1);
  }
}
