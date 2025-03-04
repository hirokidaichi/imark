import { spy } from "@std/testing/mock";
import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { GenCommand } from "./gen.ts";

Deno.test("GenCommand", async (t) => {
  // テストの実行前にGOOGLE_API_KEY環境変数をクリア
  const originalApiKey = Deno.env.get("GOOGLE_API_KEY");
  Deno.env.delete("GOOGLE_API_KEY");

  // テストで生成された画像ファイルのパスを保持する配列
  const generatedFiles: string[] = [];

  try {
    await t.step("基本的な機能", () => {
      const command = new GenCommand();
      const helpText = command.getHelp();
      assertStringIncludes(helpText, "--context");
      assertStringIncludes(helpText, "--output");
      assertStringIncludes(helpText, "--size");
      assertStringIncludes(helpText, "--aspect-ratio");
      assertStringIncludes(helpText, "--type");
      assertStringIncludes(helpText, "--format");
      assertStringIncludes(helpText, "--quality");
      assertStringIncludes(helpText, "--debug");
    });

    await t.step("APIキー未設定時のエラー", async () => {
      const command = new GenCommand();
      try {
        await command.parse([]);
        assertEquals(true, false, "APIキーが設定されていないためエラーになるはず");
      } catch (error: unknown) {
        if (error instanceof Error) {
          assertEquals(error.message, "GOOGLE_API_KEY環境変数が設定されていません");
        } else {
          throw error;
        }
      }
    });

    await t.step("コンテキストファイルの読み込み", async () => {
      const command = new GenCommand();
      const contextPath = "test_tmp/context.md";
      await Deno.writeTextFile(contextPath, "テストコンテキスト");

      try {
        await command.parse(["--context", contextPath]);
        assertEquals(true, false, "APIキーが設定されていないためエラーになるはず");
      } catch (error: unknown) {
        if (error instanceof Error) {
          assertEquals(error.message, "GOOGLE_API_KEY環境変数が設定されていません");
        } else {
          throw error;
        }
      } finally {
        await Deno.remove(contextPath);
      }
    });

    await t.step("画像生成オプション", async () => {
      const command = new GenCommand();
      const outputPath = "test_tmp/test.png";
      generatedFiles.push(outputPath);

      try {
        await command.parse([
          "--output",
          outputPath,
          "--size",
          "fullhd",
          "--aspect-ratio",
          "16:9",
          "--type",
          "realistic",
          "--format",
          "png",
          "--quality",
          "90",
        ]);
        assertEquals(true, false, "APIキーが設定されていないためエラーになるはず");
      } catch (error: unknown) {
        if (error instanceof Error) {
          assertEquals(error.message, "GOOGLE_API_KEY環境変数が設定されていません");
        } else {
          throw error;
        }
      }
    });

    await t.step("デバッグモード", async () => {
      const command = new GenCommand();
      const consoleLogSpy = spy(console, "log");

      try {
        await command.parse([
          "--debug",
          "テストテーマ",
        ]);
        assertEquals(true, false, "APIキーが設定されていないためエラーになるはず");
      } catch (error: unknown) {
        if (error instanceof Error) {
          assertEquals(error.message, "GOOGLE_API_KEY環境変数が設定されていません");
        } else {
          throw error;
        }
      } finally {
        consoleLogSpy.restore();
      }
    });
  } finally {
    // テストの実行後にGOOGLE_API_KEY環境変数を元に戻す
    if (originalApiKey) {
      Deno.env.set("GOOGLE_API_KEY", originalApiKey);
    }

    // テストで生成された画像ファイルを削除
    for (const file of generatedFiles) {
      try {
        await Deno.remove(file);
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
  }
});
