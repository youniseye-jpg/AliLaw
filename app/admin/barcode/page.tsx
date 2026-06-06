"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { useStore } from "@/components/Providers";
import { normalizeImageUrl } from "@/lib/utils";

export default function BarcodePage(){
  const { products } = useStore();
  const [code,setCode]=useState("");
  const q = code.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return products.filter((p) => [p.barcode, p.title, p.description, p.category, ...(p.keywords || []), ...(p.searchTags || [])].join(" ").toLowerCase().includes(q)).slice(0, 50);
  }, [products, q]);
  function search(){ setCode(code.trim()); }
  return <AdminGuard><PageHeader title="أداة الباركود" backHref="/admin/advanced"/>
    <section className="card form-grid">
      <label className="span-2">الباركود أو اسم المنتج<input value={code} onChange={e=>setCode(e.target.value)} placeholder="اكتب أو الصق الباركود"/></label>
      <button className="btn span-2" onClick={search}>بحث</button>
      <p className="span-2">القيمة الحالية: <b>{code}</b></p>
    </section>
    <section className="card">
      <h2>نتائج البحث</h2>
      {q && !results.length ? <p className="muted">لا توجد نتائج مطابقة.</p> : null}
      {results.map((p) => <Link className="order-item" key={p.id} href={`/admin/products/${p.id}`}>
        {normalizeImageUrl(p.imageUrl) ? <img src={normalizeImageUrl(p.imageUrl)} alt=""/> : null}
        <div><b>{p.title || "منتج"}</b><p className="muted">{p.barcode || "بدون باركود"} — {p.category || "عام"}</p></div>
      </Link>)}
    </section>
  </AdminGuard>
}
