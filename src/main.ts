import { createMainCommand } from "./commands/main.ts";

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
