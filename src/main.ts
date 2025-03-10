import { createMainCommand } from "./commands/main.ts";

/**
 * CLIコマンドを実行する
 * @returns 終了コード
 */
async function runCli(): Promise<number> {
  try {
    const command = createMainCommand();
    const result = await command.parse(Deno.args);
    return typeof result === "number" ? result : 0;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) {
  // mcpコマンドの場合は、プロセスが終了しないようにするための特殊処理
  if (Deno.args[0] === "mcp") {
    // mcpコマンドは内部でサーバーを起動するため、プロセスを継続させる
    createMainCommand().parse(Deno.args);
  } else {
    // 通常のコマンドは実行後に自然に終了する
    await runCli();
  }
}
