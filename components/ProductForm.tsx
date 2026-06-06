"use client";

import type { Product } from "@/lib/types";
import { asNumber } from "@/lib/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/components/Providers";

const aspectOptions = [
  ["square_1_1", "Square 1:1"], ["portrait_3_4", "Portrait 3:4"], ["wide_16_9", "Wide 16:9"], ["classic_4_3", "Classic 4:3"], ["tall_2_3", "Tall 2:3"], ["wide_21_9", "Wide 21:9"], ["vertical_9_16", "Vertical 9:16"], ["product_5_4", "Product 5:4"], ["banner_3_1", "Banner 3:1"], ["custom", "مخصص"]
];
const colorPresets = ["#FFF3E8", "#FCE7F3", "#E0F2FE", "#DCFCE7", "#FEF9C3", "#EDE9FE", "#EF4444", "#F97316", "#22C55E", "#3B82F6", "#A855F7", "#000000"];

const flashDurations = [
  [30, "نصف ساعة"],
  [60, "ساعة"],
  [360, "6 ساعات"],
  [1440, "يوم"],
  [10080, "أسبوع"],
  [43200, "شهر"],
  [525600, "سنة"],
  [0, "مدة مخصصة"]
] as const;

function minutesFromProduct(product: Partial<Product>) {
  const minutes = asNumber(product.flashSaleEndTime);
  if (minutes > 0 && minutes < 1_000_000) return Math.round(minutes);
  const end = asNumber(product.flashEndAt);
  if (end > Date.now()) return Math.max(1, Math.round((end - Date.now()) / 60000));
  return 60;
}

export function ProductForm({ initial, onSubmit, onAutoSave, submitting }: { initial?: Partial<Product>; onSubmit: (product: Partial<Product>) => Promise<void>; onAutoSave?: (product: Partial<Product>) => Promise<void>; submitting?: boolean }) {
  const { t } = useStore();
  const [form, setForm] = useState<Partial<Product>>({ title: "", description: "", price: 0, currency: "USD", category: "", discount: 0, imageUrl: "", totalQuantity: 0, soldCount: 0, barcode: "", status: "available", keywords: [], flashOfferEnabled: false, flashPrice: 0, flashSaleEndTime: 60, flashEndAt: 0, showInTrendingNow: false, showInFeaturedOffers: false, showInHomeSelected: false, customCardColorHex: "", customCardColorIncludesImageFrame: false, imageAspectRatioKey: "square_1_1", customImageAspectRatio: "", ...initial });
  const [flashPreset, setFlashPreset] = useState<number>(() => {
    const m = minutesFromProduct(initial || {});
    return flashDurations.some(([value]) => value === m) ? m : 0;
  });
  const [flashMinutes, setFlashMinutes] = useState<number>(() => minutesFromProduct(initial || {}));
  const [message, setMessage] = useState("");
  const autoReady = useRef(false);

  useEffect(() => { const t = setTimeout(() => { autoReady.current = true; }, 400); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!onAutoSave || !autoReady.current) return;
    const timer = setTimeout(async () => { await onAutoSave(form); setMessage(t("تم الحفظ تلقائياً")); }, 900);
    return () => clearTimeout(timer);
  }, [form, onAutoSave, t]);

  const update = (key: keyof Product, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  function applyFlashMinutes(minutes: number) {
    const clean = Math.max(1, Math.round(Number(minutes) || 1));
    setFlashMinutes(clean);
    setForm((f) => ({
      ...f,
      flashSaleEndTime: clean,
      flashEndAt: Date.now() + clean * 60 * 1000,
      flashStartAt: Date.now(),
      flashOfferEnabled: Boolean(f.flashOfferEnabled || f.flashOffersEnabled),
      flashOffersEnabled: Boolean(f.flashOfferEnabled || f.flashOffersEnabled)
    }));
  }
  function chooseFlashPreset(value: number) {
    setFlashPreset(value);
    if (value > 0) applyFlashMinutes(value);
  }
  async function submit(e: React.FormEvent) { e.preventDefault(); setMessage(""); await onSubmit(form); setMessage(t("تم الحفظ")); }
  const flashEndPreview = useMemo(() => {
    const end = asNumber(form.flashEndAt);
    return end > 0 ? new Date(end).toLocaleString() : t("غير محدد");
  }, [form.flashEndAt, t]);

  return <form className="form-grid" onSubmit={submit}>
    <label>{t("اسم المنتج")}<input value={form.title || ""} onChange={(e) => update("title", e.target.value)} required /></label>
    <label>{t("وصف المنتج")}<input value={form.description || ""} onChange={(e) => update("description", e.target.value)} /></label>
    <label>{t("السعر")}<input type="number" step="0.01" value={form.price || 0} onChange={(e) => update("price", asNumber(e.target.value))} /></label>
    <label>{t("العملة")}<select value={form.currency || "USD"} onChange={(e) => update("currency", e.target.value)}><option value="USD">USD</option><option value="TL">TL</option><option value="د.ع">د.ع</option></select></label>
    <label>{t("قسم المنتج")}<input value={form.category || ""} onChange={(e) => update("category", e.target.value)} /></label>
    <label>{t("نسبة الخصم %")}<input type="number" step="0.01" value={form.discount || 0} onChange={(e) => update("discount", asNumber(e.target.value))} /></label>
    <label className="span-2">{t("رابط صورة المنتج")}<input value={form.imageUrl || ""} onChange={(e) => update("imageUrl", e.target.value)} /></label>
    <label>{t("نسبة صورة المنتج")}<select value={form.imageAspectRatioKey || "square_1_1"} onChange={(e) => update("imageAspectRatioKey", e.target.value)}>{aspectOptions.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select></label>
    <label>{t("نسبة مخصصة")}<input value={form.customImageAspectRatio || ""} onChange={(e) => update("customImageAspectRatio", e.target.value)} placeholder={t("مثال 10:13")} /></label>
    <label>{t("كمية المخزون")}<input type="number" value={form.totalQuantity || form.quantity || 0} onChange={(e) => update("totalQuantity", asNumber(e.target.value))} /></label>
    <label>{t("الكمية المباعة")}<input type="number" value={form.soldCount || form.soldQuantity || 0} onChange={(e) => update("soldCount", asNumber(e.target.value))} /></label>
    <label>{t("الباركود")}<input value={form.barcode || ""} onChange={(e) => update("barcode", e.target.value)} /></label>
    <label>{t("كلمات مفتاحية للبحث بالصورة")}<input value={(form.keywords || []).join(", ")} onChange={(e) => { const parts = e.target.value.split(",").map((x) => x.trim()).filter(Boolean); update("keywords", parts); update("searchTags", parts); }} /></label>
    <label>{t("اللون التقريبي للمنتج")}<input value={form.dominantColor || ""} onChange={(e) => update("dominantColor", e.target.value)} /></label>
    <label>{t("لون المنتج المخصص")}<input value={form.customCardColorHex || ""} placeholder="#fff3e0" onChange={(e) => update("customCardColorHex", e.target.value)} /></label>
    <div className="span-2 mini-color-row">{colorPresets.map(c => <button type="button" key={c} className="mini-color" style={{ background: c }} onClick={() => update("customCardColorHex", c)} />)}</div>
    <label className="checkbox"><input type="checkbox" checked={Boolean(form.customCardColorIncludesImageFrame)} onChange={(e) => update("customCardColorIncludesImageFrame", e.target.checked)} /> {t("يشمل إطار الصورة بلون المنتج")}</label>
    <label>{t("الحالة")}<select value={form.status || "available"} onChange={(e) => update("status", e.target.value)}><option value="available">{t("متاح")}</option><option value="unavailable">{t("غير متاح")}</option><option value="coming_soon">{t("قريباً")}</option><option value="out_of_stock">{t("نفدت الكمية")}</option></select></label>
    <label className="checkbox"><input type="checkbox" checked={Boolean(form.showInTrendingNow)} onChange={(e) => update("showInTrendingNow", e.target.checked)} /> {t("إظهار في الرائج الآن")}</label>
    <label className="checkbox"><input type="checkbox" checked={Boolean(form.showInFeaturedOffers)} onChange={(e) => update("showInFeaturedOffers", e.target.checked)} /> {t("إظهار في عروض مميزة")}</label>
    <label className="checkbox"><input type="checkbox" checked={Boolean(form.showInHomeSelected)} onChange={(e) => update("showInHomeSelected", e.target.checked)} /> {t("إظهار في منتجات مختارة")}</label>
    <h2 className="span-2">{t("إعدادات عرض الفلاش")}</h2>
    <label className="checkbox"><input type="checkbox" checked={Boolean(form.flashOfferEnabled || form.flashOffersEnabled)} onChange={(e) => { update("flashOfferEnabled", e.target.checked); update("flashOffersEnabled", e.target.checked); }} /> {t("عروض الفلاش والعداد التنازلي")}</label>
    <label>{t("سعر العرض السريع")}<input type="number" step="0.01" value={form.flashPrice || 0} onChange={(e) => update("flashPrice", asNumber(e.target.value))} /></label>
    <label>{t("مدة العرض")}<select value={flashPreset} onChange={(e) => chooseFlashPreset(Number(e.target.value))}>{flashDurations.map(([minutes, label]) => <option key={minutes} value={minutes}>{t(label)}</option>)}</select></label>
    <label>{t("مدة مخصصة بالدقائق")}<input type="number" min="1" value={flashMinutes} onChange={(e) => { setFlashPreset(0); applyFlashMinutes(asNumber(e.target.value, 1)); }} /></label>
    <p className="muted span-2">{t("ينتهي العرض في:")} {flashEndPreview}</p>
    <p className="muted span-2">{t("في صفحة تعديل المنتج يتم الحفظ تلقائياً بعد التوقف عن الكتابة. عند إضافة منتج جديد اضغط حفظ لإنشاء المنتج أولاً.")}</p>
    <div className="span-2 form-actions"><button className="btn" disabled={submitting}>{submitting ? t("حفظ...") : t("حفظ المنتج")}</button>{message ? <span className="success">{message}</span> : null}</div>
  </form>;
}
