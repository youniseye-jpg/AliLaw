"use client";

import { useMemo } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { effectiveSold, effectiveStock, effectiveTotal, exportExcel, exportLabel } from "@/lib/utils";
import { getDirection, getLocaleCode } from "@/lib/i18n";

export default function InventoryPage() {
  const { products, t, language } = useStore();
  const exportOptions = useMemo(() => { const lang = getLocaleCode(language); return { t, lang, dir: getDirection(lang) as "rtl" | "ltr" } as const; }, [t, language]);
  const rows = useMemo(() => products.map((p) => ({ id: p.id, title: p.title || "", category: p.category || "", barcode: p.barcode || "", total: effectiveTotal(p), sold: effectiveSold(p), stock: effectiveStock(p), price: p.price || 0, currency: p.currency || "" })), [products]);
  const exportRows = rows.map((r) => { const l = (key: string) => exportLabel(exportOptions, key); return ({ [l("المنتج")]: r.title, [l("الفئة")]: r.category, [l("الباركود")]: r.barcode, [l("الإجمالي")]: r.total, [l("المباع")]: r.sold, [l("المتبقي")]: r.stock, [l("السعر")]: r.price, [l("العملة")]: r.currency }); });
  const low = rows.filter((r) => r.stock > 0 && r.stock <= 4);
  return <AdminGuard><PageHeader title={t("مراقبة المخزون")} subtitle={t("تصدير CSV يفتح في Excel")} actions={<button className="btn" onClick={() => exportExcel("matger-inventory.xls", exportLabel(exportOptions, "تقرير المخزون"), exportRows, exportOptions)}>{t("تصدير Excel/CSV")}</button>} /><div className="stat-grid"><div className="stat"><b>{rows.length}</b><p>{t("منتج")}</p></div><div className="stat"><b>{low.length}</b><p>{t("منخفض")}</p></div></div><table className="table"><thead><tr><th>{t("المنتج")}</th><th>{t("الفئة")}</th><th>{t("الباركود")}</th><th>{t("الإجمالي")}</th><th>{t("المباع")}</th><th>{t("المتبقي")}</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.title}</td><td>{r.category}</td><td>{r.barcode}</td><td>{r.total}</td><td>{r.sold}</td><td>{r.stock}</td></tr>)}</tbody></table></AdminGuard>;
}
