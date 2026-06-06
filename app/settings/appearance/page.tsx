"use client";

import { useState } from "react";
import { PageHeader } from "@/components/Navbar";
import { useStore } from "@/components/Providers";
import { LANGUAGES } from "@/lib/i18n";

export default function CustomerAppearancePage() {
  const { darkMode, setLocalDarkMode, language, setLocalLanguage, t } = useStore();
  const [query, setQuery] = useState("");
  const list = LANGUAGES.filter((l) => `${l.label} ${l.nativeName} ${l.code}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="container"><PageHeader title={t("إعدادات المظهر")} backHref="/settings" /><section className="card form-grid"><label className="switch-row span-2"><input type="checkbox" checked={darkMode} onChange={(e) => setLocalDarkMode(e.target.checked)} /> {t("الوضع الداكن")}</label><label className="span-2">{t("ابحث عن لغة")}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث عن لغة")} /></label><div className="language-list span-2">{list.map((l) => <button key={l.code} className={language === l.label ? "chip active" : "chip"} onClick={() => setLocalLanguage(l.label)}>{l.nativeName}</button>)}</div><p className="muted span-2">{t("اختيار اللغة:")} {language}</p></section></main>;
}
