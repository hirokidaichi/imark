#!/usr/bin/env node

import { createMainCommand } from "./commands/index.js";

/**
 * CLIコマンドを実行する
 */
async function runCli() {
  try {
    const program = createMainCommand();
    await program.parseAsync(process.argv);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runCli();
