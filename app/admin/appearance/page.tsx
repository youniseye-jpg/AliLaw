"use client";

import { useEffect, useRef, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { listenDoc } from "@/lib/firestore";
import type { StoreTheme } from "@/lib/types";
import { doc, setDoc } from "firebase/firestore";
import { useStore } from "@/components/Providers";
import { LANGUAGES } from "@/lib/i18n";

const colors = ["#2196F3", "#FF9800", "#4CAF50", "#E91E63", "#6200EE", "#00BCD4", "#9C27B0", "#607D8B", "#795548", "#009688", "#0B5D1E", "#FFC107", "#8BC34A", "#3F51B5", "#FF5722", "#3E2723", "#004D40", "#0D47A1", "#B71C1C", "#880E4F", "#2E7D32", "#EF6C00", "#6A1B9A", "#263238"];
export default function AppearancePage() {
  const { darkMode, language, setLocalDarkMode, setLocalLanguage, t } = useStore();
  const [theme, setTheme] = useState<StoreTheme>({ primaryColor: "#EF6C00" });
  const [dark, setDark] = useState(darkMode);
  const [system, setSystem] = useState(false);
  const [lang, setLang] = useState(language || "العربية");
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const loaded = useRef(false);

  useEffect(() => listenDoc<StoreTheme>("public_config", "theme", (d) => {
    if (d) {
      loaded.current = false;
      setTheme(d);
      const localDark = typeof window !== "undefined" ? localStorage.getItem("matger_dark") : null;
      const localLang = typeof window !== "undefined" ? localStorage.getItem("matger_lang") : null;
      setDark(localDark === null ? Boolean(d.darkMode) : localDark === "1");
      setSystem(Boolean(d.followSystemTheme));
      setLang(localLang || d.language || "العربية");
      setTimeout(() => { loaded.current = true; }, 200);
    } else {
      loaded.current = true;
    }
  }), []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => save("تم الحفظ تلقائياً"), 700);
    return () => clearTimeout(timer);
  }, [theme.primaryColor, dark, system, lang]);

  async function save(message = "تم الحفظ والتطبيق") {
    const primary = theme.primaryColor || "#EF6C00";
    const payload = { ...theme, primaryColor: primary, accentColor: primary, darkMode: dark, followSystemTheme: system, language: lang, updatedAt: Date.now() };
    await setDoc(doc(db, "public_config", "theme"), payload, { merge: true });
    await setDoc(doc(db, "appSettings", "theme"), payload, { merge: true });
    setLocalDarkMode(dark);
    setLocalLanguage(lang);
    setMsg(message);
  }

  const list = LANGUAGES.filter((l) => `${l.label} ${l.nativeName} ${l.code}`.toLowerCase().includes(query.toLowerCase()));

  return <AdminGuard><PageHeader title={t("إعدادات المظهر")} backHref="/admin/dashboard" />
    <section className="card form-grid">
      <p className="muted span-2">{t("التغييرات تحفظ تلقائياً. تم تعديل الوضع الداكن ليصبح أوضح وأقل سواداً.")}</p>
      <label className="switch-row span-2"><input type="checkbox" checked={system} onChange={(e) => setSystem(e.target.checked)} />{t("اتباع مظهر النظام تلقائياً")}</label>
      <label className="switch-row span-2"><input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />{t("الوضع الداكن")}</label>
      <label>{t("كود اللون HEX")}<input value={theme.primaryColor || ""} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value, accentColor: e.target.value })} /></label>
      <input type="color" value={theme.primaryColor || "#EF6C00"} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value, accentColor: e.target.value })} />
      <div className="color-grid span-2">{colors.map((c) => <button key={c} className="color-dot" style={{ background: c }} onClick={() => setTheme({ ...theme, primaryColor: c, accentColor: c })} />)}</div>
      <h2 className="span-2">{t("تغيير لغة التطبيق")}</h2>
      <label className="span-2">{t("ابحث عن لغة")}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث عن لغة")} /></label>
      <div className="language-list span-2">{list.map((l) => <button key={l.code} className={lang === l.label ? "chip active" : "chip"} onClick={() => setLang(l.label)}>{l.nativeName}</button>)}</div>
      <button className="btn span-2" onClick={() => save()}>{t("حفظ الآن")}</button>
      {msg ? <p className="success span-2">{msg}</p> : null}
    </section>
  </AdminGuard>;
}
