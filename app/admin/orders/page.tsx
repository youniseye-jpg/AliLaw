"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { useStore } from "@/components/Providers";
import { listenAdminOrders, updateOrderStatus } from "@/lib/firestore";
import type { Order } from "@/lib/types";
import { dateText, invoiceHtml, normalizeImageUrl, orderTotal, printHtml, statusLabel } from "@/lib/utils";
import { getDirection, getLocaleCode } from "@/lib/i18n";

const statuses = ["pending", "accepted", "rejected", "delivering", "completed", "cancelled"];

export default function AdminOrdersPage() {
  const { t, language } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const exportOptions = useMemo(() => {
    const lang = getLocaleCode(language);
    return { t, lang, dir: getDirection(lang) as "rtl" | "ltr" } as const;
  }, [t, language]);

  useEffect(() => listenAdminOrders(setOrders), []);
  const shown = orders.filter((o) => filter === "all" || o.status === filter);

  return <AdminGuard><PageHeader title={t("إدارة الطلبات")} backHref="/admin/dashboard" subtitle={t("تغيير الحالة يحدّث الطلب ويكتب إشعاراً للزبون")} /><div className="tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>{t("الكل")}</button>{statuses.map((s) => <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>{statusLabel(s, t)}</button>)}</div><div className="grid-2">{shown.map((o) => <article key={o.id} className="card order-card"><h3>{o.orderNumber || o.id}</h3><p><b>{o.customerName}</b> — {o.phone}</p><p>{o.address}</p><p>{t("المجموع")}: {orderTotal(o)}</p><p>{t("الحالة")}: <b>{statusLabel(o.status, t)}</b></p><p className="muted">{dateText(o.timestamp, exportOptions.lang)}</p><select value={o.status || "pending"} onChange={(e) => updateOrderStatus(o, e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}</select><Link className="btn ghost small" href={`/admin/chat/${o.customerUid ? `customer_${o.customerUid}` : ""}`}>{t("مراسلة الزبون")}</Link><button className="btn ghost small" onClick={() => printHtml(`${t("فاتورة")} ${o.orderNumber || o.id}`, invoiceHtml(o, exportOptions), exportOptions)}>{t("PDF فاتورة")}</button><div className="order-items">{(o.items || []).map((i, idx) => <div className="order-item" key={idx}>{i.imageUrl ? <img src={normalizeImageUrl(i.imageUrl)} alt="" /> : null}<span data-dynamic-content>{i.title || i.name} × {i.quantity || 1}</span></div>)}</div></article>)}</div></AdminGuard>;
}
