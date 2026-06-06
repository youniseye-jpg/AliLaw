"use client";

import Link from "next/link";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { useStore } from "@/components/Providers";

const links = [
  ["/admin/barcode", "admin.barcodeTool"],
  ["/admin/banners", "admin.banners"],
  ["/admin/inventory", "admin.inventory"],
  ["/admin/blacklist", "admin.blacklist"],
  ["/admin/blocked-attempts", "admin.blockedAttempts"],
  ["/admin/backup", "admin.backup"],
  ["/admin/coupons", "admin.coupons"],
  ["/admin/chat", "admin.customerChats"]
] as const;

export default function AdvancedPage() {
  const { t } = useStore();
  return <AdminGuard><PageHeader title="admin.advancedTools" backHref="/admin/dashboard" /><div className="dashboard-buttons">{links.map(([href, label]) => <Link href={href} className="dash-btn" key={href}>{t(label)}</Link>)}</div></AdminGuard>;
}
