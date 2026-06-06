"use client";

import { useMemo, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { saveCategoryImage, saveCategoryOrder } from "@/lib/firestore";
import { categoryNames } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, setDoc } from "firebase/firestore";

export default function AdminCategoriesPage() {
  const { products, categoryImages, categoryOrder } = useStore();
  const cats = useMemo(() => categoryNames(products, categoryOrder, categoryImages), [products, categoryOrder, categoryImages]);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState("");
  async function addOrSave() { if (!name.trim()) return; await saveCategoryImage(name.trim(), image); if (!categoryOrder[name.trim()]) await saveCategoryOrder([...cats.filter((c) => c !== name.trim()), name.trim()]); setName(""); setImage(""); setEditing(""); }
  async function move(cat: string, step: number) { const next = [...cats]; const i = next.indexOf(cat); const j = Math.max(0, Math.min(next.length - 1, i + step)); if (i < 0 || i === j) return; const [item] = next.splice(i, 1); next.splice(j, 0, item); await saveCategoryOrder(next); }
  async function rename(oldName: string, newName: string) { if (!oldName || !newName || oldName === newName) return; const snap = await getDocs(collection(db, "products")); const batch = writeBatch(db); snap.docs.forEach((d) => { if (d.data().category === oldName) batch.update(doc(db, "products", d.id), { category: newName, updatedAt: Date.now() }); }); await batch.commit(); await setDoc(doc(db, "config", "category_order"), Object.fromEntries(cats.map((c, i) => [c === oldName ? newName : c, i])), { merge: false }); }
  return <AdminGuard><PageHeader title="إدارة الفئات" backHref="/admin/dashboard" subtitle="الترتيب والصور محفوظة في config/category_order و config/category_images" /><section className="card form-grid"><label>اسم الفئة<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>رابط الصورة<input value={image} onChange={(e) => setImage(e.target.value)} /></label><button className="btn span-2" onClick={addOrSave}>{editing ? "حفظ الفئة" : "إضافة/تحديث فئة"}</button></section><div className="card" style={{ marginTop: 16 }}>{cats.map((c) => <div className="order-item" key={c}><div style={{ flex: 1 }}><b>{c}</b><p className="muted">{categoryImages[c] || "بدون صورة"}</p></div><button className="btn small ghost" onClick={() => { setEditing(c); setName(c); setImage(categoryImages[c] || ""); }}>تعديل</button><button className="btn small ghost" onClick={() => move(c, -1)}>أعلى</button><button className="btn small ghost" onClick={() => move(c, 1)}>أسفل</button><button className="btn small" onClick={() => { const n = prompt("الاسم الجديد", c); if (n) rename(c, n); }}>إعادة تسمية</button></div>)}</div></AdminGuard>;
}
