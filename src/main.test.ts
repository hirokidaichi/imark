import { assertEquals } from "@std/assert";
import { spy } from "@std/testing/mock";
import { createMainCommand } from "./commands/main.ts";

Deno.test("mainCommand", async (t) => {
  const consoleLogSpy = spy(console, "log");

  await t.step("サブコマンドなしで実行した場合のエラーメッセージ", async () => {
    const command = createMainCommand();
    try {
      await command.parse([]);
    } catch (error: unknown) {
      // Ignore exit code error from CLI parser
      if (!(error instanceof Error && error.message.includes("Exit code"))) {
        throw error;
      }
    }
    assertEquals(
      consoleLogSpy.calls[0].args[0],
      "サブコマンドを指定してください: caption, catalog, configure, gen, log, mcp, completion",
    );
  });

  await t.step("バージョン情報の表示", async () => {
    const command = createMainCommand();
    // テスト用に終了しないバージョンを取得
    const version = command.getVersion();
    assertEquals(version, "0.1.0");
  });

  await t.step("ヘルプの表示", async () => {
    const command = createMainCommand();
    // テスト用に終了しないヘルプテキストを取得
    const help = command.getHelp();
    assertEquals(
      help.includes("画像キャプション生成CLIツール"),
      true,
    );
  });

  consoleLogSpy.restore();
});
