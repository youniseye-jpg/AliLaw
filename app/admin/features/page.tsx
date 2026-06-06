"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { listenDoc } from "@/lib/firestore";
import { doc, setDoc } from "firebase/firestore";
import type { FeatureToggles } from "@/lib/types";

const keys: [keyof FeatureToggles, string][] = [
  ["flashOffers", "عروض الفلاش والعداد التنازلي"],
  ["relatedProducts", "مقترحات المنتجات ذات الصلة"],
  ["ratings", "التقييمات"],
  ["homeBanners", "بنرات الصفحة الرئيسية"],
  ["autoBanners", "تحريك البنرات تلقائياً"],
  ["visualSearch", "البحث بالصورة"],
  ["internalChat", "الدردشة الداخلية"],
  ["sideCategories", "عرض الأقسام جانبياً"]
];

function androidSpeed(mode?: string) {
  const map: Record<string, string> = { slow: "speed2", normal: "speed3", medium: "speed3", intermittent: "intermittent", fast: "speed5", static: "stopped" };
  return map[mode || "intermittent"] || "intermittent";
}

function aliasPayload(f: FeatureToggles) {
  const bannerSpeedMode = androidSpeed(f.bannerSpeed);
  return {
    ...f,
    purchaseWithoutAccount: true,
    guestCheckout: true,
    flashOffersEnabled: f.flashOffers !== false,
    relatedProductsEnabled: f.relatedProducts !== false,
    ratingsEnabled: f.ratings !== false,
    productRatings: f.ratings !== false,
    productReviews: f.ratings !== false,
    bannersEnabled: f.homeBanners !== false,
    autoBannersEnabled: f.autoBanners !== false,
    bannersAutoScrollEnabled: f.autoBanners !== false,
    bannerSpeedMode,
    bannerAutoScrollSeconds: bannerSpeedMode === "speed5" ? 1 : bannerSpeedMode === "speed3" ? 3 : 5,
    visualSearchEnabled: f.visualSearch !== false,
    internalChatEnabled: f.internalChat !== false,
    chatEnabled: f.internalChat !== false,
    chatImageMessagesEnabled: false,
    sideCategoriesEnabled: f.sideCategories === true,
    categoryLayoutMode: f.sideCategories ? "side" : "top",
    updatedAt: Date.now()
  };
}

export default function FeaturesPage() {
  const [f, setF] = useState<FeatureToggles>({ flashOffers: true, relatedProducts: true, ratings: true, homeBanners: true, autoBanners: true, bannerSpeed: "intermittent", visualSearch: true, internalChat: true, sideCategories: false });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = listenDoc<FeatureToggles>("appSettings", "featureToggles", (d) => d && setF((x) => ({ ...x, ...d })));
    const u2 = listenDoc<FeatureToggles>("config", "feature_toggles", (d) => d && setF((x) => ({ ...x, ...d, autoBanners: d.autoBanners ?? d.autoBannersEnabled ?? d.bannersAutoScrollEnabled, ratings: d.ratings ?? d.ratingsEnabled ?? d.productRatings ?? d.productReviews })));
    return () => { u1(); u2(); };
  }, []);

  async function save(next: FeatureToggles) {
    setSaving(true);
    const payload = aliasPayload(next);
    await setDoc(doc(db, "appSettings", "featureToggles"), payload, { merge: true });
    await setDoc(doc(db, "config", "feature_toggles"), payload, { merge: true });
    setSaving(false);
    setMsg("تم الحفظ تلقائياً والمزامنة مع التطبيق");
  }

  function update(patch: Partial<FeatureToggles>) {
    const next = { ...f, ...patch };
    setF(next);
    save(next).catch((e) => setMsg(e instanceof Error ? e.message : "فشل الحفظ"));
  }

  return <AdminGuard><PageHeader title="مفاتيح التحكم بالميزات" backHref="/admin/dashboard" />
    <section className="card">
      <p className="muted">كل تغيير هنا يحفظ تلقائياً في `appSettings/featureToggles` و `config/feature_toggles` حتى يقرأه الويب وتطبيق Android.</p>
      {keys.map(([k, l]) => <label key={k} className="switch-row"><input type="checkbox" checked={f[k] !== false} onChange={(e) => update({ [k]: e.target.checked })} />{l}</label>)}
      <label>سرعة حركة البنرات<select value={f.bannerSpeed || "intermittent"} onChange={(e) => update({ bannerSpeed: e.target.value })}><option value="slow">بطيء</option><option value="normal">عادي</option><option value="fast">سريع</option><option value="intermittent">متقطع</option><option value="static">متوقف / ثابت</option></select></label>
      <button className="btn full" onClick={() => save(f)} disabled={saving}>{saving ? "حفظ..." : "حفظ الآن"}</button>
      {msg ? <p className={msg.includes("فشل") ? "error" : "success"}>{msg}</p> : null}
    </section>
  </AdminGuard>;
}
