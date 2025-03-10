import { createMainCommand } from "./commands/main.ts";

/**
 * CLIコマンドを実行する
 */
async function runCli() {
  try {
    const command = createMainCommand();
    await command.parse(Deno.args);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (import.meta.main) {
  await runCli();
}
