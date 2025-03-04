import { Command } from "@cliffy/command";
import { captionCommand } from "./commands/caption.ts";
import { catalogCommand } from "./commands/catalog.ts";
import { GenCommand } from "./commands/gen.ts";

export function createMainCommand() {
  return new Command()
    .name("imark")
    .version("0.1.0")
    .description("画像キャプション生成CLIツール - Gemini APIを使用")
    .action(() => {
      console.log("サブコマンドを指定してください: caption, catalog, gen");
      Deno.exit(1);
    })
    .command("caption", captionCommand)
    .command("catalog", catalogCommand)
    .command("gen", new GenCommand());
}

if (import.meta.main) {
  await createMainCommand().parse(Deno.args);
}
