"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { useStore } from "@/components/Providers";
import { db } from "@/lib/firebase";
import { saveHomeCustomSection, saveHomeFixedSection } from "@/lib/firestore";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { fixedSectionTitle, fixedSectionVisible, normalizeImageUrl, sectionTitle, sectionVisible } from "@/lib/utils";

const fixed = [
  ["showInTrendingNow", "الرائج الآن"],
  ["showInFeaturedOffers", "عروض مميزة"],
  ["showInHomeSelected", "منتجات مختارة"]
] as const;

type FixedField = typeof fixed[number][0];

export default function AdminHomePage() {
  const { products, customSections, homeFixedSections } = useStore();
  const [newSection, setNewSection] = useState("");
  const [activeCustom, setActiveCustom] = useState("");
  const [activeFixed, setActiveFixed] = useState<FixedField | "">("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get("section") || "";
    const fixedField = (params.get("fixed") || "") as FixedField | "";
    if (sectionId) { setActiveCustom(sectionId); setActiveFixed(""); return; }
    if (fixed.some(([field]) => field === fixedField)) { setActiveFixed(fixedField); setActiveCustom(""); }
  }, []);

  const activeSection = useMemo(() => customSections.find((s) => s.id === activeCustom) || null, [customSections, activeCustom]);
  const activeFixedLabel = activeFixed ? fixedSectionTitle(homeFixedSections, activeFixed, fixed.find(([field]) => field === activeFixed)?.[1] || "") : "";

  async function addSection() {
    const title = newSection.trim();
    if (!title) return;
    await saveHomeCustomSection({ title, visible: true, isVisible: true, productIds: [] });
    setNewSection("");
    setStatus("تم إنشاء القسم وحفظه تلقائياً");
  }

  async function toggleFixed(productId: string, field: FixedField, enabled: boolean) {
    await setDoc(doc(db, "products", productId), { [field]: enabled, updatedAt: Date.now() }, { merge: true });
    setStatus("تم الحفظ تلقائياً");
  }

  async function toggleCustomProduct(productId: string, enabled: boolean) {
    if (!activeSection) return;
    const ids = activeSection.productIds || [];
    const next = enabled ? Array.from(new Set([...ids, productId])) : ids.filter((id) => id !== productId);
    await saveHomeCustomSection({ ...activeSection, productIds: next });
    setStatus("تم الحفظ تلقائياً");
  }

  async function updateFixedTitle(field: FixedField, title: string) {
    await saveHomeFixedSection(field, { title, visible: fixedSectionVisible(homeFixedSections, field), isVisible: fixedSectionVisible(homeFixedSections, field) });
    setStatus("تم حفظ اسم القسم الثابت");
  }

  async function toggleFixedVisibility(field: FixedField) {
    const next = !fixedSectionVisible(homeFixedSections, field);
    await saveHomeFixedSection(field, { title: fixedSectionTitle(homeFixedSections, field, fixed.find(([f]) => f === field)?.[1] || ""), visible: next, isVisible: next });
    setStatus(next ? "تم إظهار القسم" : "تم إخفاء القسم");
  }

  return <AdminGuard>
    <PageHeader title="إدارة الصفحة الرئيسية" backHref="/admin/dashboard" subtitle="الأقسام الثابتة لا تُحذف، ويمكن تعديل اسمها أو إخفاؤها. الأقسام المخصصة يمكن حذفها." actions={<button className="btn" onClick={addSection}>إضافة قسم</button>} />

    <div className="search-bar"><input className="search-input" value={newSection} onChange={(e) => setNewSection(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSection(); }} placeholder="اسم قسم مخصص جديد ثم Enter" /></div>
    {status ? <p className="success">{status}</p> : null}

    <section className="card">
      <h2>الأقسام الثابتة</h2>
      <p className="muted">هذه الأقسام مثل التطبيق: لا يوجد حذف، فقط تعديل الاسم والإخفاء/الإظهار.</p>
      {fixed.map(([field, fallback]) => {
        const label = fixedSectionTitle(homeFixedSections, field, fallback);
        const visible = fixedSectionVisible(homeFixedSections, field);
        return <div className="order-item" key={field}>
          <div style={{ flex: 1 }}>
            <input value={label} onChange={(e) => updateFixedTitle(field, e.target.value)} />
            <p className="muted">{visible ? "ظاهر" : "مخفي"}</p>
          </div>
          <button className="btn small ghost" onClick={() => toggleFixedVisibility(field)}>{visible ? "إخفاء" : "إظهار"}</button>
          <button className="btn small ghost" onClick={() => { setActiveFixed(field); setActiveCustom(""); }}>اختيار المنتجات</button>
        </div>;
      })}
    </section>

    <div className="tabs">
      {fixed.map(([field, fallback]) => <button key={field} className={activeFixed === field ? "active" : ""} onClick={() => { setActiveFixed(field); setActiveCustom(""); }}>{fixedSectionTitle(homeFixedSections, field, fallback)}</button>)}
      {customSections.map((s) => <button key={s.id} className={activeCustom === s.id ? "active" : ""} onClick={() => { setActiveCustom(s.id); setActiveFixed(""); }}>{sectionTitle(s)}</button>)}
    </div>

    {activeFixed ? <section className="card">
      <h2>اختيار منتجات: {activeFixedLabel}</h2>
      <div className="admin-product-select">{products.map((p) => <label className="select-product-card" key={p.id}>{normalizeImageUrl(p.imageUrl) ? <img src={normalizeImageUrl(p.imageUrl)} alt="" /> : <span className="mini-placeholder">صورة</span>}<b>{p.title}</b><small>{p.category}</small><input type="checkbox" checked={Boolean((p as any)[activeFixed])} onChange={(e) => toggleFixed(p.id, activeFixed, e.target.checked)} /></label>)}</div>
    </section> : null}

    {activeSection ? <section className="card">
      <h2>اختيار منتجات: {sectionTitle(activeSection)}</h2>
      <p className="muted">أنت تعدل هذا القسم فقط، وليس كل الأقسام.</p>
      <div className="admin-product-select">{products.map((p) => {
        const ids = activeSection.productIds || [];
        const checked = ids.includes(p.id);
        return <label className="select-product-card" key={p.id}>{normalizeImageUrl(p.imageUrl) ? <img src={normalizeImageUrl(p.imageUrl)} alt="" /> : <span className="mini-placeholder">صورة</span>}<b>{p.title}</b><small>{p.category}</small><input type="checkbox" checked={checked} onChange={(e) => toggleCustomProduct(p.id, e.target.checked)} /></label>;
      })}</div>
    </section> : null}

    {!activeFixed && !activeSection ? <section className="empty-state">اختر قسماً من الأعلى لتعديل منتجاته مباشرة.</section> : null}

    <section className="card">
      <h2>الأقسام المخصصة</h2>
      {customSections.length ? customSections.map((s) => <div className="order-item" key={s.id}>
        <div style={{ flex: 1 }}>
          <input value={sectionTitle(s)} onChange={(e) => saveHomeCustomSection({ ...s, title: e.target.value, localizedTitles: { ar: e.target.value }, titleByLocale: { ar: e.target.value } }).then(() => setStatus("تم الحفظ تلقائياً"))} />
          <p className="muted">{sectionVisible(s) ? "ظاهر" : "مخفي"} — {(s.productIds || []).length} منتجات</p>
        </div>
        <button className="btn small ghost" onClick={() => saveHomeCustomSection({ ...s, visible: !sectionVisible(s), isVisible: !sectionVisible(s) }).then(() => setStatus("تم الحفظ تلقائياً"))}>{sectionVisible(s) ? "إخفاء" : "إظهار"}</button>
        <button className="btn small ghost" onClick={() => { setActiveCustom(s.id); setActiveFixed(""); }}>تعديل المنتجات</button>
        <button className="btn small danger" onClick={() => confirm("حذف القسم؟") && deleteDoc(doc(db, "home_custom_sections", s.id))}>حذف</button>
      </div>) : <p className="muted">لا توجد أقسام مخصصة.</p>}
    </section>
  </AdminGuard>;
}
