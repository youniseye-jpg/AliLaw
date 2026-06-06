"use client";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { listenDoc } from "@/lib/firestore";
import type { StoreTheme } from "@/lib/types";
import { doc, setDoc } from "firebase/firestore";

type ColorKey = "productNameColorHex" | "productPriceColorHex" | "productDescriptionColorHex" | "productCategoryColorHex" | "productStockColorHex";
const fields: Array<[ColorKey, string]> = [["productNameColorHex", "لون اسم المنتج"], ["productPriceColorHex", "لون سعر المنتج"], ["productDescriptionColorHex", "لون وصف المنتج"], ["productCategoryColorHex", "لون الفئة/التفاصيل"], ["productStockColorHex", "لون المخزون/الحالة"]];
const palette = ["#111827", "#374151", "#6B7280", "#FFFFFF", "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#EC4899", "#F43F5E"];

export default function ColorSystemPage() {
  const [theme, setTheme] = useState<StoreTheme>({});
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<ColorKey | null>(null);
  useEffect(() => listenDoc<StoreTheme>("config", "product_color_system", (data) => setTheme(data || {})), []);
  async function save() { await setDoc(doc(db, "config", "product_color_system"), { ...theme, updatedAt: Date.now() }, { merge: true }); setMsg("تم الحفظ"); }
  function apply(key: ColorKey, color: string) { setTheme({ ...theme, [key]: color }); setOpen(null); }
  return <AdminGuard><PageHeader title="نظام الألوان" backHref="/admin/dashboard" />
    <section className="card form-grid"><p className="span-2">حدد ألوان نصوص المنتجات التي تظهر للزبائن.</p>{fields.map(([key, label]) => {
      const value = String(theme[key] || "");
      return <div key={key} className="color-line span-2"><label>{label}<input value={value} onChange={(e) => setTheme({ ...theme, [key]: e.target.value })} /></label><span className="preview-dot" style={{ background: value || "#000" }} /><button type="button" className="btn ghost small" onClick={() => setOpen(open === key ? null : key)}>اختر اللون</button>{open === key ? <div className="color-palette">{palette.map((color) => <button type="button" key={color} className="color-swatch" title={color} style={{ background: color }} onClick={() => apply(key, color)} />)}</div> : null}</div>;
    })}<button className="btn span-2" onClick={save}>حفظ التغييرات</button>{msg ? <p className="success span-2">{msg}</p> : null}</section>
  </AdminGuard>;
}
