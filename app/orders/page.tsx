"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { listenCustomerOrders } from "@/lib/firestore";
import type { Order } from "@/lib/types";
import { dateText, exportWord, invoiceHtml, normalizeImageUrl, orderTotal, printHtml, statusLabel } from "@/lib/utils";
import { getDirection, getLocaleCode } from "@/lib/i18n";

export default function OrdersPage() {
  const { user, t, language } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const exportOptions = useMemo(() => {
    const lang = getLocaleCode(language);
    return { t, lang, dir: getDirection(lang) as "rtl" | "ltr" } as const;
  }, [t, language]);

  useEffect(() => { if (!user?.uid) return; return listenCustomerOrders(user.uid, setOrders); }, [user?.uid]);

  function invoice(order: Order, kind: "pdf" | "word") {
    const title = `${t("فاتورة")} ${order.orderNumber || order.id}`;
    const html = invoiceHtml(order, exportOptions);
    if (kind === "pdf") printHtml(title, html, exportOptions);
    else exportWord(`invoice-${order.orderNumber || order.id}.doc`, title, html, exportOptions);
  }

  return <main className="container"><PageHeader title={t("طلباتي")} />{orders.length ? <div className="grid-2">{orders.map((o) => <article className="card order-card" key={o.id}><h3>{o.orderNumber || o.id}</h3><p>{t("الحالة")}: <b>{statusLabel(o.status, t)}</b></p><p>{orderTotal(o)}</p><p className="muted">{dateText(o.timestamp, exportOptions.lang)}</p><div className="order-items">{(o.items || []).map((i, idx) => <div className="order-item" key={idx}>{i.imageUrl ? <img src={normalizeImageUrl(i.imageUrl)} alt="" /> : null}<span data-dynamic-content>{i.title || i.name} × {i.quantity || 1}</span></div>)}</div><button className="btn ghost" onClick={() => invoice(o,"pdf")}>{t("تحميل الفاتورة PDF")}</button><button className="btn ghost" onClick={() => invoice(o,"word")}>{t("تحميل الفاتورة Word")}</button></article>)}</div> : <div className="empty-state">{t("لا توجد طلبات لهذا الزبون.")}</div>}</main>;
}
