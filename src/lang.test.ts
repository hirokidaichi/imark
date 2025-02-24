import { assertEquals } from "@std/assert";
import { LANGUAGE_DESCRIPTIONS } from "./lang.ts";

Deno.test("LANGUAGE_DESCRIPTIONSのテスト", async (t) => {
  await t.step("すべての言語に正しい説明が設定されている", () => {
    const expected = {
      ja: "日本語",
      en: "英語",
      zh: "中国語",
      ko: "韓国語",
      es: "スペイン語",
      fr: "フランス語",
      de: "ドイツ語",
      it: "イタリア語",
      ru: "ロシア語",
      vi: "ベトナム語",
    };

    assertEquals(LANGUAGE_DESCRIPTIONS, expected);
  });

  await t.step("サポートされている言語の数が正しい", () => {
    assertEquals(Object.keys(LANGUAGE_DESCRIPTIONS).length, 10);
  });
});
