"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { listenAdminOrders } from "@/lib/firestore";
import type { Order, OrderItem } from "@/lib/types";
import { effectiveStock } from "@/lib/utils";

const buttons = [
  ["/admin/products/new", "admin.addNewProduct", "+"],
  ["/admin/app-identity", "admin.appIdentity", "▣"],
  ["/admin/products", "admin.manageProducts", "▤"],
  ["/admin/orders", "admin.customerOrders", "▦"],
  ["/admin/contact", "admin.contactData", "☏"],
  ["/admin/features", "admin.featureToggles", "●"],
  ["/admin/security", "admin.accountSecurity", "⚙"],
  ["/admin/advanced", "admin.advancedTools", "⚙"],
  ["/admin/reports", "admin.salesReports", "▥"],
  ["/admin/home", "admin.manageHomePage", "⌂"],
  ["/admin/chat", "admin.customerChats", "▣"],
  ["/admin/notes", "admin.notes", "▢"],
  ["/admin/calculator", "admin.calculator", "±"],
  ["/admin/appearance", "admin.appearanceSettings", "⚙"],
  ["/admin/color-system", "admin.colorSystem", "●"]
] as const;

function orderItems(order: Order): OrderItem[] {
  return Array.isArray(order.items) ? order.items : [];
}

function itemQuantity(item: OrderItem) {
  const value = Number(item.quantity ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function orderQuantity(order: Order) {
  const items = orderItems(order);
  if (!items.length) return 0;
  return items.reduce((total, item) => total + itemQuantity(item), 0);
}

function StatCard({ value, label, wide = false }: { value: number; label: string; wide?: boolean }) {
  return <div className={wide ? "stat wide" : "stat"}><b>{value}</b><p>{label}</p></div>;
}

export default function AdminDashboardPage() {
  const { products, t } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => listenAdminOrders(setOrders), []);

  const stats = useMemo(() => {
    const requested = orders.reduce((total, order) => total + orderQuantity(order), 0);
    const sold = orders.filter((order) => order.status === "completed").reduce((total, order) => total + orderQuantity(order), 0);
    const accepted = orders.filter((order) => order.status === "accepted" || order.status === "delivering").length;
    const rejected = orders.filter((order) => order.status === "rejected").length;
    const cancelled = orders.filter((order) => order.status === "cancelled").length;
    const lowStock = products.filter((product) => {
      const stock = effectiveStock(product);
      return stock >= 1 && stock <= 4;
    }).length;

    return { requested, sold, accepted, rejected, cancelled, totalProducts: products.length, lowStock };
  }, [orders, products]);

  return <AdminGuard>
    <PageHeader title="admin.dashboard" backHref="/settings" />
    <div className="stat-grid admin-stats admin-dashboard-stats">
      <StatCard value={stats.requested} label={t("stat.required")} />
      <StatCard value={stats.sold} label={t("stat.sold")} />
      <StatCard value={stats.accepted} label={t("stat.accepted")} />
      <StatCard value={stats.rejected} label={t("stat.rejected")} />
      <StatCard value={stats.cancelled} label={t("stat.cancelled")} />
      <StatCard value={stats.totalProducts} label={t("stat.totalProducts")} wide />
      <StatCard value={stats.lowStock} label={t("stat.lowStockProducts")} wide />
    </div>
    <div className="dashboard-buttons">
      {buttons.map(([href, label, icon]) => <Link href={href} className="dash-btn" key={href}><span>{icon}</span>{t(label)}</Link>)}
    </div>
  </AdminGuard>;
}
