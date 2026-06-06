"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { listenAdminOrders, resetSalesAccounts } from "@/lib/firestore";
import type { Order } from "@/lib/types";
import { dateText, exportExcel, exportLabel, exportStatusLabel, exportWord, orderTotal, ordersHtml, printHtml, statusLabel } from "@/lib/utils";
import { useStore } from "@/components/Providers";
import { getDirection, getLocaleCode } from "@/lib/i18n";

const statusButtons = [
  ["all", "تصدير كل الطلبات"], ["today", "تصدير طلبات اليوم"], ["accepted", "تصدير الطلبات المقبولة فقط"], ["completed", "تصدير الطلبات المكتملة فقط"], ["rejected", "تصدير الطلبات المرفوضة"], ["cancelled", "تصدير الطلبات الملغية"], ["delivering", "تصدير طلبات قيد التوصيل"]
] as const;
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.getTime(); }
function inRange(o: Order, from: string, to: string) { const time = o.timestamp || 0; if (from && time < startOfDay(new Date(from))) return false; if (to && time > endOfDay(new Date(to))) return false; return true; }

export default function ReportsPage() {
  const { t, language } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [last, setLast] = useState<Order[]>([]);
  const [busyReset, setBusyReset] = useState(false);
  const [msg, setMsg] = useState("");
  const exportOptions = useMemo(() => {
    const lang = getLocaleCode(language);
    return { t, lang, dir: getDirection(lang) as "rtl" | "ltr" } as const;
  }, [t, language]);

  useEffect(() => listenAdminOrders(setOrders), []);
  const base = useMemo(() => orders.filter((o) => inRange(o, from, to)), [orders, from, to]);
  function pick(kind: string) { let list = kind === "today" ? orders.filter(o => (o.timestamp || 0) >= startOfDay() && (o.timestamp || 0) <= endOfDay()) : base; if (kind !== "all" && kind !== "today") list = list.filter(o => o.status === kind); setLast(list); return list; }
  function rows(list: Order[]) { const l = (key: string) => exportLabel(exportOptions, key); return list.map(o => ({ [l("رقم الطلب")]: o.orderNumber || o.id, [l("الزبون")]: o.customerName || "", [l("الهاتف")]: o.phone || "", [l("الحالة")]: exportStatusLabel(o.status, exportOptions), [l("المطلوب دفعه")]: orderTotal(o), [l("التاريخ")]: dateText(o.timestamp, exportOptions.lang) })); }
  function exportKind(kind: string, format: "pdf" | "excel" | "word") { const list = pick(kind); const title = exportLabel(exportOptions, statusButtons.find(([k]) => k === kind)?.[1] || "تقرير المبيعات"); if (format === "pdf") printHtml(title, ordersHtml(list, exportOptions), exportOptions); if (format === "excel") exportExcel(`matger-${kind}.xls`, title, rows(list), exportOptions); if (format === "word") exportWord(`matger-${kind}.doc`, title, ordersHtml(list, exportOptions), exportOptions); }
  async function resetAll() {
    if (!confirm(t("سيتم حذف كل الطلبات وتصفير أرقام المبيعات. هل أنت متأكد؟"))) return;
    setBusyReset(true); setMsg("");
    try { await resetSalesAccounts(); setLast([]); setMsg(t("تم تصفير الحسابات")); }
    finally { setBusyReset(false); }
  }
  const shown = last.length ? last : base;
  return <AdminGuard><PageHeader title={t("تقارير المبيعات")} backHref="/admin/dashboard" actions={<button className="btn danger" disabled={busyReset} onClick={resetAll}>{busyReset ? t("جاري التصفير...") : t("تصفير الحسابات")}</button>} />
    <section className="card form-grid"><label>{t("من تاريخ")}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>{t("إلى تاريخ")}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><p className="muted span-2">{t("إذا ملأت من تاريخ فقط: من ذلك التاريخ إلى الآن. إذا ملأت إلى تاريخ فقط: من البداية إلى ذلك التاريخ. طلبات اليوم لا تتأثر بحقول التاريخ.")}</p>{msg ? <p className="success span-2">{msg}</p> : null}</section>
    <section className="report-actions">{statusButtons.map(([kind, label]) => <div className="export-row" key={kind}><b>{t(label)}</b><button className="btn small" onClick={() => exportKind(kind, "pdf")}>PDF</button><button className="btn small ghost" onClick={() => exportKind(kind, "excel")}>Excel</button><button className="btn small ghost" onClick={() => exportKind(kind, "word")}>Word</button></div>)}</section>
    <h2>{t("المعالجة")}: {shown.length}</h2>
    <div className="card table-wrap"><table className="table"><thead><tr><th>{t("رقم الطلب")}</th><th>{t("الزبون")}</th><th>{t("الحالة")}</th><th>{t("المطلوب دفعه")}</th><th>{t("التاريخ")}</th></tr></thead><tbody>{shown.map(o => <tr key={o.id}><td>{o.orderNumber || o.id}</td><td>{o.customerName}</td><td>{statusLabel(o.status, t)}</td><td>{orderTotal(o)}</td><td>{dateText(o.timestamp, exportOptions.lang)}</td></tr>)}</tbody></table></div>
  </AdminGuard>;
}
