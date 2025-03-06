import { assertEquals } from "@std/assert";
import { assertSpyCalls, spy, stub } from "@std/testing/mock";
import { createMainCommand } from "./main.ts";

Deno.test("mainCommand", async (t) => {
  await t.step("サブコマンドなしで実行した場合のエラーメッセージ", async () => {
    const consoleLogSpy = spy(console, "log");
    const exitStub = stub(Deno, "exit");

    try {
      const mainCommand = createMainCommand();
      await mainCommand.parse([]);

      assertSpyCalls(consoleLogSpy, 1);
      assertEquals(
        consoleLogSpy.calls[0].args[0],
        "サブコマンドを指定してください: caption, catalog, configure, gen, mcp",
      );
      assertSpyCalls(exitStub, 1);
      assertEquals(exitStub.calls[0].args[0], 1);
    } finally {
      consoleLogSpy.restore();
      exitStub.restore();
    }
  });

  await t.step("バージョン情報の表示", () => {
    const consoleLogSpy = spy(console, "log");
    const exitStub = stub(Deno, "exit");

    try {
      const mainCommand = createMainCommand();
      assertEquals(mainCommand.getVersion(), "0.1.0");
    } finally {
      consoleLogSpy.restore();
      exitStub.restore();
    }
  });

  await t.step("ヘルプの表示", () => {
    const consoleLogSpy = spy(console, "log");
    const exitStub = stub(Deno, "exit");

    try {
      const mainCommand = createMainCommand();
      const helpText = mainCommand.getHelp();
      assertEquals(helpText.includes("画像キャプション生成CLIツール"), true);
      assertEquals(helpText.includes("caption"), true);
      assertEquals(helpText.includes("catalog"), true);
      assertEquals(helpText.includes("gen"), true);
      assertEquals(helpText.includes("configure"), true);
      assertEquals(helpText.includes("mcp"), true);
    } finally {
      consoleLogSpy.restore();
      exitStub.restore();
    }
  });
});
