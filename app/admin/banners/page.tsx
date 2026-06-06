"use client";

import { useEffect, useRef, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { normalizeImageUrl } from "@/lib/utils";
import { addDoc, collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import type { BannerItem } from "@/lib/types";

function bannerPayload(form: Partial<BannerItem>) {
  const now = Date.now();
  return {
    ...form,
    imageUrl: normalizeImageUrl(form.imageUrl),
    isActive: form.isActive !== false,
    updatedAt: now,
    createdAt: form.createdAt || now,
    sortOrder: Number(form.sortOrder || 0),
    targetUrl: form.type === "product" ? `/product/${form.targetProductId || ""}` : form.type === "category" ? `/categories?category=${encodeURIComponent(form.targetCategory || "")}` : form.externalUrl || form.targetUrl || ""
  };
}

export default function BannersPage() {
  const { banners, products } = useStore();
  const [form, setForm] = useState<Partial<BannerItem>>({ type: "display_only", isActive: true, sortOrder: 0 });
  const [msg, setMsg] = useState("");
  const loadedEdit = useRef(false);

  useEffect(() => {
    if (!form.id || !loadedEdit.current) return;
    const timer = setTimeout(async () => {
      await setDoc(doc(db, "banners", form.id!), bannerPayload(form), { merge: true });
      setMsg("تم الحفظ تلقائياً");
    }, 700);
    return () => clearTimeout(timer);
  }, [form]);

  function update(patch: Partial<BannerItem>) {
    loadedEdit.current = Boolean(form.id);
    setForm((current) => ({ ...current, ...patch }));
  }

  async function save() {
    const data = bannerPayload(form);
    if (form.id) await setDoc(doc(db, "banners", form.id), data, { merge: true });
    else await addDoc(collection(db, "banners"), data);
    setForm({ type: "display_only", isActive: true, sortOrder: 0 });
    loadedEdit.current = false;
    setMsg("تم الحفظ");
  }

  function edit(b: BannerItem) {
    loadedEdit.current = false;
    setForm(b);
    setTimeout(() => { loadedEdit.current = true; }, 300);
  }

  return <AdminGuard><PageHeader title="إدارة البنرات والعروض" subtitle="البنر المعدل يحفظ تلقائياً، والبنر الجديد يضاف بزر حفظ" />
    <section className="card form-grid">
      <label>العنوان<input value={form.title || ""} onChange={(e) => update({ title: e.target.value })} /></label>
      <label>الصورة<input value={form.imageUrl || ""} onChange={(e) => update({ imageUrl: e.target.value })} /></label>
      <label>الترتيب<input type="number" value={form.sortOrder || 0} onChange={(e) => update({ sortOrder: Number(e.target.value) })} /></label>
      <label>النوع<select value={form.type || "display_only"} onChange={(e) => update({ type: e.target.value })}><option value="display_only">عرض فقط</option><option value="product">منتج</option><option value="category">فئة</option><option value="external_url">رابط خارجي</option></select></label>
      <label>منتج<select value={form.targetProductId || ""} onChange={(e) => update({ targetProductId: e.target.value })}><option value="">لا يوجد</option>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <label>فئة<input value={form.targetCategory || ""} onChange={(e) => update({ targetCategory: e.target.value })} /></label>
      <label>رابط خارجي<input value={form.externalUrl || ""} onChange={(e) => update({ externalUrl: e.target.value })} /></label>
      <label className="switch-row"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => update({ isActive: e.target.checked })} />مفعل</label>
      <button className="btn span-2" onClick={save}>{form.id ? "حفظ الآن" : "إضافة البنر"}</button>{msg ? <p className="success span-2">{msg}</p> : null}
    </section>
    <div className="grid-2" style={{ marginTop: 16 }}>{banners.map((b) => <article className="card" key={b.id}>{b.imageUrl ? <img src={normalizeImageUrl(b.imageUrl)} alt="" style={{ borderRadius: 14, height: 120, objectFit: "cover", width: "100%" }} /> : null}<h3>{b.title}</h3><p className="muted">{b.type} — ترتيب {b.sortOrder || 0}</p><button className="btn small ghost" onClick={() => edit(b)}>تعديل</button> <button className="btn small danger" onClick={() => deleteDoc(doc(db, "banners", b.id))}>حذف</button></article>)}</div>
  </AdminGuard>;
}
