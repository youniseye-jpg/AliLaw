"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, resetAdminPassword } from "@/lib/auth";
import { useStore } from "@/components/Providers";

export default function AdminLoginPage() {
  const { t } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try { await loginAdmin(email, password); router.replace("/admin/dashboard"); } catch (e) { setError(e instanceof Error ? e.message : t("فشل الدخول")); } finally { setBusy(false); }
  }
  async function sendReset() {
    setError(""); setMessage("");
    if (!email.trim()) { setError(t("أدخل بريد المدير أولاً")); return; }
    try { await resetAdminPassword(email.trim()); setMessage(t("تم إرسال رابط إعادة التعيين")); } catch (e) { setError(e instanceof Error ? e.message : t("فشل إرسال الرابط")); }
  }
  return <main className="container" style={{ maxWidth: 520 }}><section className="card"><h1>{t("دخول المدير")}</h1><form className="form-grid" onSubmit={submit}><label className="span-2">{t("البريد الإلكتروني")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="span-2">{t("كلمة المرور")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="btn span-2" disabled={busy}>{busy ? t("فحص...") : t("دخول")}</button><button type="button" className="btn ghost span-2" onClick={sendReset}>{t("إعادة تعيين كلمة المرور")}</button>{error ? <p className="error span-2">{error}</p> : null}{message ? <p className="success span-2">{message}</p> : null}</form></section></main>;
}
