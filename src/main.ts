import { createMainCommand } from "./commands/main.ts";

/**
 * CLIコマンドを実行する
 * @returns 終了コード
 */
async function runCli(): Promise<number> {
  try {
    const command = createMainCommand();
    const result = await command.parse(Deno.args);

    // mcpコマンドの場合は終了コードを返さない（プロセスを終了させない）
    if (Deno.args[0] === "mcp") {
      return -1; // 特殊な値として-1を返す（終了しないことを示す）
    }

    return typeof result === "number" ? result : 0;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) {
  const exitCode = await runCli();
  // 特殊な値-1の場合は終了しない（mcpコマンド用）
  if (exitCode >= 0) {
    Deno.exit(exitCode);
  }
}
