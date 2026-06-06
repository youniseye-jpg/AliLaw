"use client";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { listenDoc } from "@/lib/firestore";
import type { AppIdentity } from "@/lib/types";
import { doc, setDoc } from "firebase/firestore";
import { useStore } from "@/components/Providers";

export default function AppIdentityPage() {
  const { t } = useStore();
  const [identity, setIdentity] = useState<AppIdentity>({ storeName: "MATGER" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const u1 = listenDoc<AppIdentity>("appSettings", "appIdentity", d => d && setIdentity(x => ({ ...x, ...d })));
    const u2 = listenDoc<AppIdentity>("public_config", "appIdentity", d => d && setIdentity(x => ({ ...x, ...d })));
    return () => { u1(); u2(); };
  }, []);
  async function save() {
    const now = Date.now();
    const name = identity.storeName || identity.appName || "MATGER";
    const externalUrl = (identity.externalAppImageUrl || identity.storeLogoUrl || identity.logoUrl || "").trim();
    const payload = {
      ...identity,
      storeName: name,
      appName: name,
      externalAppImage: "external",
      externalAppImageUrl: externalUrl,
      storeLogoUrl: identity.storeLogoUrl || identity.logoUrl || "",
      logoUrl: identity.storeLogoUrl || identity.logoUrl || "",
      externalAppName: identity.externalAppName || name,
      updatedAt: now
    };
    await setDoc(doc(db, "appSettings", "appIdentity"), payload, { merge: true });
    await setDoc(doc(db, "public_config", "appIdentity"), payload, { merge: true });
    await setDoc(doc(db, "public_config", "splash"), { splashSubtitle: identity.splashText || identity.splashSubtitle || "", backgroundUrl: identity.splashBackgroundUrl || identity.backgroundUrl || "", durationMs: identity.splashDurationMs || identity.durationMs || 3000, enabled: true, updatedAt: now }, { merge: true });
    setMsg(t("تم حفظ هوية التطبيق"));
  }
  return <AdminGuard><PageHeader title="هوية التطبيق" backHref="/admin/dashboard" />
    <section className="card form-grid">
      <p className="muted span-2">{t("يعتمد الموقع الآن على رابط صورة التطبيق الخارجية أولاً. الصور الداخلية لا تستخدم إلا إذا لم تضع رابطاً خارجياً.")}</p>
      <label>{t("اسم المتجر")}<input value={identity.storeName || identity.appName || ""} onChange={e => setIdentity({ ...identity, storeName: e.target.value, appName: e.target.value })} /></label>
      <label>{t("رابط شعار التطبيق / المتجر")}<input value={identity.storeLogoUrl || identity.logoUrl || ""} onChange={e => setIdentity({ ...identity, storeLogoUrl: e.target.value, logoUrl: e.target.value })} /></label>
      <label>{t("نص شاشة البداية")}<input value={identity.splashText || identity.splashSubtitle || ""} onChange={e => setIdentity({ ...identity, splashText: e.target.value, splashSubtitle: e.target.value })} /></label>
      <label>{t("رابط صورة خلفية شاشة البداية")}<input value={identity.splashBackgroundUrl || identity.backgroundUrl || ""} onChange={e => setIdentity({ ...identity, splashBackgroundUrl: e.target.value, backgroundUrl: e.target.value })} /></label>
      <label>{t("مدة شاشة البداية بالثواني")}<input type="number" value={(identity.splashDurationMs || identity.durationMs || 3000) / 1000} onChange={e => setIdentity({ ...identity, splashDurationMs: Number(e.target.value) * 1000, durationMs: Number(e.target.value) * 1000 })} /></label>
      <label>{t("شعار الصفحة الرئيسية")}<select value={identity.homeLogoIcon || ""} onChange={e => setIdentity({ ...identity, homeLogoIcon: e.target.value })}><option value="">{t("بدون أيقونة")}</option><option value="store">{t("متجر")}</option><option value="bag">{t("حقيبة")}</option><option value="star">{t("نجمة")}</option></select></label>
      <label>{t("شعار شاشة البداية")}<select value={identity.splashIcon || ""} onChange={e => setIdentity({ ...identity, splashIcon: e.target.value })}><option value="">{t("بدون أيقونة")}</option><option value="store">{t("متجر")}</option><option value="bag">{t("حقيبة")}</option></select></label>
      <label>{t("شعار الفواتير PDF")}<select value={identity.invoiceIcon || ""} onChange={e => setIdentity({ ...identity, invoiceIcon: e.target.value })}><option value="">{t("بدون أيقونة")}</option><option value="store">{t("متجر")}</option><option value="receipt">{t("فاتورة")}</option></select></label>
      <label>{t("شعار التقارير والتصدير")}<select value={identity.reportsIcon || ""} onChange={e => setIdentity({ ...identity, reportsIcon: e.target.value })}><option value="">{t("بدون أيقونة")}</option><option value="report">{t("تقرير")}</option></select></label>
      <label>{t("شعار معلومات المتجر / التواصل")}<select value={identity.storeInfoIcon || ""} onChange={e => setIdentity({ ...identity, storeInfoIcon: e.target.value })}><option value="">{t("بدون أيقونة")}</option><option value="contact">{t("تواصل")}</option></select></label>
      <label className="span-2">{t("رابط صورة التطبيق الخارجية")}<small className="muted">{t("ضع رابط الصورة المباشر هنا. عند الحفظ سيعتمد الموقع على هذا الرابط للصورة الخارجية.")}</small><input value={identity.externalAppImageUrl || ""} onChange={e => setIdentity({ ...identity, externalAppImageUrl: e.target.value })} /></label>
      {identity.externalAppImageUrl ? <div className="span-2 app-image-preview"><img src={identity.externalAppImageUrl} alt="external app" /></div> : null}
      <label>{t("اسم التطبيق الخارجي")}<input value={identity.externalAppName || ""} onChange={e => setIdentity({ ...identity, externalAppName: e.target.value })} /></label>
      <button className="btn span-2" onClick={save}>{t("حفظ التغييرات")}</button>{msg ? <p className="success span-2">{msg}</p> : null}
    </section>
  </AdminGuard>;
}
