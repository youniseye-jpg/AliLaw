import { messages as ar } from "./ar";
import { messages as en } from "./en";
import { messages as ku } from "./ku";
import { messages as tk } from "./tk";
import { messages as ru } from "./ru";
import { messages as nl } from "./nl";
import { messages as no } from "./no";
import { messages as fil } from "./fil";
import { messages as tr } from "./tr";
import { messages as fa } from "./fa";
import { messages as zh } from "./zh";
import { messages as hi } from "./hi";
import { messages as ja } from "./ja";
import { LANGUAGES, type LocaleCode } from "./languages";

export { LANGUAGES, type LocaleCode } from "./languages";

export type Messages = Record<string, string>;

export const dictionaries: Record<LocaleCode, Messages> = {
  ar: ar as unknown as Messages,
  en: en as unknown as Messages,
  ku: ku as unknown as Messages,
  tk: tk as unknown as Messages,
  ru: ru as unknown as Messages,
  nl: nl as unknown as Messages,
  no: no as unknown as Messages,
  fil: fil as unknown as Messages,
  tr: tr as unknown as Messages,
  fa: fa as unknown as Messages,
  zh: zh as unknown as Messages,
  hi: hi as unknown as Messages,
  ja: ja as unknown as Messages
};

export function getLocaleCode(language?: string): LocaleCode {
  const raw = (language || "العربية").toLowerCase().trim();
  const normalized = raw
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ك/g, "ک")
    .replace(/ي/g, "ی")
    .replace(/ة/g, "ه");
  const direct = LANGUAGES.find((item) => {
    const label = item.label.toLowerCase();
    const nativeName = item.nativeName.toLowerCase();
    return item.code === raw || item.code === normalized || label === raw || nativeName === raw || label === normalized || nativeName === normalized;
  });
  if (direct) return direct.code;
  if (["arabic", "العربيه", "العربية", "عربي"].some((x) => raw.includes(x) || normalized.includes(x))) return "ar";
  if (["english", "انجليزي", "انگليزی", "انكليزي"].some((x) => raw.includes(x) || normalized.includes(x))) return "en";
  if (["كورد", "کورد", "كرد", "کرد", "kurd", "kurdi", "kurmanji", "sorani"].some((x) => raw.includes(x) || normalized.includes(x))) return "ku";
  if (["türkmen", "turkmen", "turkmençe", "تركمان", "ترکمان", "توركمان", "تورکمان"].some((x) => raw.includes(x) || normalized.includes(x))) return "tk";
  if (["рус", "russian", "روسي", "روسی"].some((x) => raw.includes(x) || normalized.includes(x))) return "ru";
  if (["nederlands", "dutch", "هولندي", "هولندی"].some((x) => raw.includes(x) || normalized.includes(x))) return "nl";
  if (["norsk", "norwegian", "نرويجي", "نرویجی"].some((x) => raw.includes(x) || normalized.includes(x))) return "no";
  if (["filipino", "tagalog", "فلبيني", "فلبینی"].some((x) => raw.includes(x) || normalized.includes(x))) return "fil";
  if (["türk", "turk", "turkish", "تركي", "ترکی"].some((x) => raw.includes(x) || normalized.includes(x))) return "tr";
  if (["فارسی", "فارسي", "persian", "farsi"].some((x) => raw.includes(x.toLowerCase()) || normalized.includes(x.toLowerCase()))) return "fa";
  if (["中文", "chinese", "صيني", "صینی", "الصينيه", "الصينية"].some((x) => raw.includes(x) || normalized.includes(x))) return "zh";
  if (["日本語", "日本", "japanese", "japan", "ياباني", "یابانی", "اليابانيه", "اليابانية"].some((x) => raw.includes(x.toLowerCase()) || normalized.includes(x.toLowerCase()))) return "ja";
  if (["हिन्दी", "hindi", "هندي", "هندی", "الهنديه", "الهندية"].some((x) => raw.includes(x.toLowerCase()) || normalized.includes(x.toLowerCase()))) return "hi";
  return "ar";
}

export function getDirection(locale: LocaleCode) {
  return LANGUAGES.find((item) => item.code === locale)?.dir || "rtl";
}

function normalizePhrase(text: string) {
  return text
    .replace(/[\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function directValue(locale: LocaleCode, key: string) {
  return (dictionaries[locale] || dictionaries.en)[key];
}

type SourceIndex = Map<string, string>;
let sourceIndex: SourceIndex | null = null;
let replacementRecords: Array<{ key: string; variants: string[] }> | null = null;

function addSource(index: SourceIndex, phrase: string, key: string, overwrite = false) {
  const clean = phrase.trim();
  if (!clean || clean.length < 2) return;
  const normalized = normalizePhrase(clean);
  if (!normalized) return;
  if (overwrite || !index.has(normalized)) index.set(normalized, key);
}

function buildSourceIndex() {
  if (sourceIndex) return sourceIndex;
  const index: SourceIndex = new Map();

  // Highest priority: exact keys/phrases that exist in the web dictionaries.
  for (const messages of Object.values(dictionaries)) {
    for (const key of Object.keys(messages)) addSource(index, key, key, true);
  }

  // Secondary priority: values from every language. This lets the system move between languages without mixing.
  for (const messages of Object.values(dictionaries)) {
    for (const [key, value] of Object.entries(messages)) addSource(index, value, key, false);
  }

  sourceIndex = index;
  const recordMap = new Map<string, Set<string>>();
  for (const [normalizedPhrase, key] of index.entries()) {
    if (normalizedPhrase.length <= 2) continue;
    if (!recordMap.has(key)) recordMap.set(key, new Set<string>());
    const bucket = recordMap.get(key)!;
    bucket.add(key);
    for (const messages of Object.values(dictionaries)) {
      const value = messages[key];
      if (value && value.length > 2) bucket.add(value);
    }
  }
  replacementRecords = Array.from(recordMap.entries())
    .map(([key, values]) => ({ key, variants: Array.from(values).sort((a, b) => b.length - a.length) }))
    .sort((a, b) => (b.variants[0]?.length || 0) - (a.variants[0]?.length || 0));
  return index;
}

function resolveKey(source: string) {
  const index = buildSourceIndex();
  return index.get(normalizePhrase(source));
}

function valueForKey(locale: LocaleCode, key: string) {
  const direct = directValue(locale, key);
  if (direct) return direct;
  const resolved = resolveKey(key);
  if (resolved) {
    const resolvedDirect = directValue(locale, resolved);
    if (resolvedDirect) return resolvedDirect;
  }

  // Do not fall back to English for non-English interfaces.
  // If a translation is missing, Arabic is less disruptive for this project than an English leak.
  // This is important for Turkish/Kurdish/etc. pages where a few missing admin labels previously stayed English.
  if (locale !== "en") {
    const arabicDirect = directValue("ar", key);
    if (arabicDirect) return arabicDirect;
    if (resolved) {
      const arabicResolved = directValue("ar", resolved);
      if (arabicResolved) return arabicResolved;
    }
  }

  return dictionaries.en[key] || (resolved ? dictionaries.en[resolved] : undefined) || key;
}

function replacePreservingOuterWhitespace(source: string, replacement: string) {
  const prefix = source.match(/^\s*/)?.[0] || "";
  const suffix = source.match(/\s*$/)?.[0] || "";
  return `${prefix}${replacement}${suffix}`;
}

export function translateText(source: string, locale: LocaleCode): string {
  if (!source) return source;
  const trimmed = source.trim();
  if (!trimmed) return source;

  // Direct dictionary hit first. This fixes phrases such as "Feature toggles" that are used as keys.
  const direct = directValue(locale, trimmed);
  if (direct) return replacePreservingOuterWhitespace(source, direct);

  const key = resolveKey(trimmed);
  if (key) return replacePreservingOuterWhitespace(source, valueForKey(locale, key));

  // Partial replacement for static sentences containing variables or punctuation.
  buildSourceIndex();
  let next = source;
  for (const record of replacementRecords || []) {
    const target = valueForKey(locale, record.key);
    if (!target) continue;
    for (const variant of record.variants) {
      if (variant && variant !== target && next.includes(variant)) next = next.split(variant).join(target);
    }
  }
  return next;
}

export function t(locale: LocaleCode, key: string): string {
  return valueForKey(locale, key);
}
