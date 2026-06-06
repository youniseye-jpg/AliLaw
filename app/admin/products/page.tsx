"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { ProductForm } from "@/components/ProductForm";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { deleteProduct, fetchAllProducts, saveProduct } from "@/lib/firestore";
import { effectiveSold, effectiveStock, effectiveTotal, exportExcel, exportLabel, exportWord, money, normalizeImageUrl, printHtml, productsHtml, exportStatusLabel } from "@/lib/utils";
import { getDirection, getLocaleCode } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export default function AdminProductsPage() {
  const { products, t, language } = useStore();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const filtered = products.filter((p) => [p.title, p.category, p.barcode].join(" ").toLowerCase().includes(search.toLowerCase()));
  const exportOptions = useMemo(() => {
    const lang = getLocaleCode(language);
    return { t, lang, dir: getDirection(lang) as "rtl" | "ltr" } as const;
  }, [t, language]);

  function openProduct(id: string) {
    if (!id) return;
    router.push(`/admin/products/${id}`);
  }

  function productRows(list: Product[]) {
    const l = (key: string) => exportLabel(exportOptions, key);
    return list.map((p) => ({
      [l("المنتج")]: p.title || "",
      [l("الفئة")]: p.category || "",
      [l("الوصف")]: p.description || "",
      [l("السعر")]: money(p.price || 0, p.currency || ""),
      [l("الخصم")]: p.discount || 0,
      [l("الحالة")]: exportStatusLabel(p.status, exportOptions),
      [l("الإجمالي")]: effectiveTotal(p),
      [l("المباع")]: effectiveSold(p),
      [l("المتبقي")]: effectiveStock(p),
      [l("الباركود")]: p.barcode || "",
      [l("رابط الصورة")]: p.imageUrl || ""
    }));
  }

  async function exportProducts(format: "pdf" | "excel" | "word") {
    setExporting(true);
    try {
      const allProducts = await fetchAllProducts();
      const title = exportLabel(exportOptions, "تقرير المنتجات الكامل");
      if (format === "pdf") printHtml(title, productsHtml(allProducts, exportOptions), exportOptions);
      if (format === "excel") exportExcel("matger-products.xls", title, productRows(allProducts), exportOptions);
      if (format === "word") exportWord("matger-products.doc", title, productsHtml(allProducts, exportOptions), exportOptions);
    } finally {
      setExporting(false);
    }
  }

  const actions = <div className="button-row">
    <button className="btn" onClick={() => setShowAdd(!showAdd)}>{showAdd ? t("إخفاء") : t("إضافة منتج")}</button>
    <button className="btn ghost" disabled={exporting} onClick={() => exportProducts("pdf")}>{exporting ? t("جاري التصدير...") : "PDF"}</button>
    <button className="btn ghost" disabled={exporting} onClick={() => exportProducts("excel")}>Excel</button>
    <button className="btn ghost" disabled={exporting} onClick={() => exportProducts("word")}>Word</button>
  </div>;

  return <AdminGuard>
    <PageHeader
      title={t("إدارة المنتجات")}
      backHref="/admin/dashboard"
      subtitle={t("إضافة، تعديل، حذف، وبحث بالاسم أو الباركود")}
      actions={actions}
    />
    {showAdd ? <section className="card" style={{ marginBottom: 18 }}><ProductForm onSubmit={async (p) => { await saveProduct(p); setShowAdd(false); }} /></section> : null}
    <div className="search-bar"><input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("بحث...")} /></div>
    <table className="table admin-products-table">
      <thead><tr><th>{t("الصورة")}</th><th>{t("المنتج")}</th><th>{t("الفئة")}</th><th>{t("السعر")}</th><th>{t("المخزون")}</th><th>{t("إجراءات")}</th></tr></thead>
      <tbody>{filtered.map((p) => {
        const image = normalizeImageUrl(p.imageUrl);
        return <tr key={p.id} className="clickable-row" onClick={() => openProduct(p.id)}>
          <td>{image ? <img className="admin-product-thumb" src={image} alt={p.title || "product"} /> : <div className="admin-product-thumb placeholder">—</div>}</td>
          <td><b data-dynamic-content>{p.title}</b></td>
          <td data-dynamic-content>{p.category}</td>
          <td>{money(p.price, p.currency)}</td>
          <td>{effectiveStock(p)}</td>
          <td className="row-actions" onClick={(e) => e.stopPropagation()}>
            <Link className="btn small ghost" href={`/admin/products/${p.id}`}>{t("تعديل")}</Link>
            <button className="btn small danger" onClick={() => confirm(t("حذف المنتج؟")) && deleteProduct(p.id)}>{t("حذف")}</button>
          </td>
        </tr>;
      })}</tbody>
    </table>
  </AdminGuard>;
}
