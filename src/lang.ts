export type SupportedLanguage =
  | "ja" // 日本語
  | "en" // 英語
  | "zh" // 中国語
  | "ko" // 韓国語
  | "es" // スペイン語
  | "fr" // フランス語
  | "de" // ドイツ語
  | "it" // イタリア語
  | "ru" // ロシア語
  | "vi"; // ベトナム語

export const LANGUAGE_DESCRIPTIONS: Record<SupportedLanguage, string> = {
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
} as const;
