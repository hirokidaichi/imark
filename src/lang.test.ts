import { describe, expect, it } from "vitest";
import { LANGUAGE_DESCRIPTIONS } from "./lang.js";

describe("LANGUAGE_DESCRIPTIONS", () => {
  it("すべての言語に正しい説明が設定されている", () => {
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

    expect(LANGUAGE_DESCRIPTIONS).toEqual(expected);
  });

  it("サポートされている言語の数が正しい", () => {
    expect(Object.keys(LANGUAGE_DESCRIPTIONS).length).toBe(10);
  });
});
