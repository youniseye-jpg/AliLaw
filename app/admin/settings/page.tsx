"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { CustomLinksEditor, type EditableCustomLink } from "@/components/CustomLinksEditor";
import { db } from "@/lib/firebase";
import { listenDoc, saveStoreContact } from "@/lib/firestore";
import type { AppIdentity, StoreContact, StoreTheme } from "@/lib/types";
import { parseCustomLinks, serializeCustomLinks } from "@/lib/utils";
import { doc, setDoc } from "firebase/firestore";

export default function AdminSettingsPage() {
  const [identity, setIdentity] = useState<AppIdentity>({ storeName: "MATGER" });
  const [theme, setTheme] = useState<StoreTheme>({ primaryColor: "#6750A4" });
  const [contact, setContact] = useState<StoreContact>({});
  const [customLinks, setCustomLinks] = useState<EditableCustomLink[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubs = [
      listenDoc<AppIdentity>("public_config", "appIdentity", (d) => d && setIdentity((x) => ({ ...x, ...d }))),
      listenDoc<StoreTheme>("public_config", "theme", (d) => d && setTheme((x) => ({ ...x, ...d }))),
      listenDoc<StoreTheme>("config", "product_color_system", (d) => d && setTheme((x) => ({ ...x, ...d }))),
      listenDoc<StoreContact>("config", "store_contact", (d) => {
        const next = d || {};
        setContact(next);
        setCustomLinks(parseCustomLinks(next.customLinks).map((item) => ({ name: item.name, url: item.url })));
      })
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  async function save() {
    const now = Date.now();
    await setDoc(doc(db, "public_config", "appIdentity"), { storeName: identity.storeName || identity.appName || "MATGER", appName: identity.storeName || identity.appName || "MATGER", storeLogoUrl: identity.storeLogoUrl || identity.logoUrl || "", logoUrl: identity.storeLogoUrl || identity.logoUrl || "", updatedAt: now }, { merge: true });
    await setDoc(doc(db, "appSettings", "appIdentity"), { storeName: identity.storeName || identity.appName || "MATGER", storeLogoUrl: identity.storeLogoUrl || identity.logoUrl || "", splashText: identity.splashText || identity.splashSubtitle || "MATGER", splashLogoUrl: identity.splashLogoUrl || identity.backgroundUrl || "", splashDurationMs: identity.splashDurationMs || identity.durationMs || 2000, updatedAt: now }, { merge: true });
    await setDoc(doc(db, "public_config", "splash"), { splashSubtitle: identity.splashText || identity.splashSubtitle || "MATGER", backgroundUrl: identity.splashLogoUrl || identity.backgroundUrl || "", durationMs: identity.splashDurationMs || identity.durationMs || 2000, enabled: true, updatedAt: now }, { merge: true });
    await setDoc(doc(db, "public_config", "storeInfo"), { storeName: identity.storeName || identity.appName || "MATGER", updatedAt: now }, { merge: true });
    await setDoc(doc(db, "public_config", "theme"), { primaryColor: theme.primaryColor || "#6750A4", accentColor: theme.accentColor || theme.primaryColor || "#6750A4", updatedAt: now }, { merge: true });
    await setDoc(doc(db, "config", "product_color_system"), { productNameColorHex: theme.productNameColorHex || "", productPriceColorHex: theme.productPriceColorHex || "", productDescriptionColorHex: theme.productDescriptionColorHex || "", productCategoryColorHex: theme.productCategoryColorHex || "", productStockColorHex: theme.productStockColorHex || "", updatedAt: now }, { merge: true });
    await saveStoreContact({ ...contact, customLinks: serializeCustomLinks(customLinks) });
    setMessage("تم الحفظ");
  }

  return <AdminGuard>
    <PageHeader title="إعدادات الهوية والألوان والروابط" subtitle="لا يتم قراءة security من public_config" />
    <section className="card form-grid">
      <label>اسم المتجر<input value={identity.storeName || identity.appName || ""} onChange={(e) => setIdentity({ ...identity, storeName: e.target.value, appName: e.target.value })} /></label>
      <label>رابط الشعار<input value={identity.storeLogoUrl || identity.logoUrl || ""} onChange={(e) => setIdentity({ ...identity, storeLogoUrl: e.target.value, logoUrl: e.target.value })} /></label>
      <label>نص شاشة البداية<input value={identity.splashText || identity.splashSubtitle || ""} onChange={(e) => setIdentity({ ...identity, splashText: e.target.value, splashSubtitle: e.target.value })} /></label>
      <label>رابط خلفية البداية<input value={identity.splashLogoUrl || identity.backgroundUrl || ""} onChange={(e) => setIdentity({ ...identity, splashLogoUrl: e.target.value, backgroundUrl: e.target.value })} /></label>
      <label>مدة البداية ms<input type="number" value={identity.splashDurationMs || identity.durationMs || 2000} onChange={(e) => setIdentity({ ...identity, splashDurationMs: Number(e.target.value), durationMs: Number(e.target.value) })} /></label>
      <label>لون التطبيق<input value={theme.primaryColor || ""} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value, accentColor: e.target.value })} /></label>
      <label>لون اسم المنتج<input value={theme.productNameColorHex || ""} onChange={(e) => setTheme({ ...theme, productNameColorHex: e.target.value })} /></label>
      <label>لون السعر<input value={theme.productPriceColorHex || ""} onChange={(e) => setTheme({ ...theme, productPriceColorHex: e.target.value })} /></label>
      <label>لون الوصف<input value={theme.productDescriptionColorHex || ""} onChange={(e) => setTheme({ ...theme, productDescriptionColorHex: e.target.value })} /></label>
      <label>لون المخزون<input value={theme.productStockColorHex || ""} onChange={(e) => setTheme({ ...theme, productStockColorHex: e.target.value })} /></label>
      <label>واتساب<input value={contact.whatsapp || ""} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} /></label>
      <label>البريد<input value={contact.email || ""} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
      <label>Facebook<input value={contact.facebook || ""} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} /></label>
      <label>Instagram<input value={contact.instagram || ""} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} /></label>
      <label>Telegram<input value={contact.telegram || ""} onChange={(e) => setContact({ ...contact, telegram: e.target.value })} /></label>
      <label>Website<input value={contact.website || ""} onChange={(e) => setContact({ ...contact, website: e.target.value })} /></label>
      <CustomLinksEditor links={customLinks} onChange={setCustomLinks} />
      <div className="span-2"><button className="btn" onClick={save}>حفظ</button>{message ? <span className="success"> {message}</span> : null}</div>
    </section>
  </AdminGuard>;
}
