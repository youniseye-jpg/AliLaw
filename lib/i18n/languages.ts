export type LocaleCode = "ar" | "en" | "ku" | "tk" | "ru" | "nl" | "no" | "fil" | "tr" | "fa" | "zh" | "ja" | "hi";

export type LanguageOption = { code: LocaleCode; label: string; nativeName: string; dir: "rtl" | "ltr" };

export const LANGUAGES: LanguageOption[] = [
  { code: "ar", label: "العربية", nativeName: "العربية", dir: "rtl" },
  { code: "en", label: "English", nativeName: "English", dir: "ltr" },
  { code: "ku", label: "كوردى", nativeName: "كوردى", dir: "rtl" },
  { code: "tk", label: "Türkmençe", nativeName: "Türkmençe", dir: "ltr" },
  { code: "ru", label: "Русский", nativeName: "Русский", dir: "ltr" },
  { code: "nl", label: "Nederlands", nativeName: "Nederlands", dir: "ltr" },
  { code: "no", label: "Norsk", nativeName: "Norsk", dir: "ltr" },
  { code: "fil", label: "Filipino", nativeName: "Filipino", dir: "ltr" },
  { code: "tr", label: "Türkçe", nativeName: "Türkçe", dir: "ltr" },
  { code: "fa", label: "فارسی", nativeName: "فارسی", dir: "rtl" },
  { code: "zh", label: "中文", nativeName: "中文", dir: "ltr" },
  { code: "ja", label: "日本語", nativeName: "日本語", dir: "ltr" },
  { code: "hi", label: "हिन्दी", nativeName: "हिन्दी", dir: "ltr" }
];
