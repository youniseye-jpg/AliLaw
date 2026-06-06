"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getAdminRole } from "@/lib/auth";

const bottomLinks = [
  ["/", "home", "⌂"],
  ["/categories", "categories", "▦"],
  ["/chat", "chat", "▣"],
  ["/cart", "cart", "🛒"],
  ["/favorites", "favorites", "♡"]
] as const;

export function Navbar() {
  const path = usePathname();
  const { cartCount, t, features, user } = useStore();
  const [adminChatHref, setAdminChatHref] = useState("/chat");
  const [isAdminUser, setIsAdminUser] = useState(false);
  useEffect(() => {
    let live = true;
    async function run() {
      if (!user || user.isAnonymous) { if (live) { setAdminChatHref("/chat"); setIsAdminUser(false); } return; }
      const role = await getAdminRole(user.uid).catch(() => null);
      if (live) { setAdminChatHref(role ? "/admin/chat" : "/chat"); setIsAdminUser(Boolean(role)); }
    }
    run();
    return () => { live = false; };
  }, [user]);
  return (
    <nav className="bottom-nav" aria-label="التنقل الأساسي">
      {bottomLinks.filter(([href]) => href !== "/chat" || features.internalChat !== false).map(([href, key, icon]) => {
        const actualHref = href === "/chat" ? adminChatHref : href;
        const active = href === "/" ? path === "/" : path.startsWith(href) || (href === "/chat" && path.startsWith("/admin/chat"));
        const badge = href === "/cart" && cartCount > 0 ? cartCount : 0;
        return <Link key={href} href={actualHref} className={active ? "active" : ""}><span className="nav-icon">{active && href === "/favorites" ? "♥" : icon}</span><span>{t(href === "/chat" ? (isAdminUser ? "nav.chat.admin" : "nav.chat.customer") : key)}</span>{badge ? <b className="nav-badge">{badge}</b> : null}</Link>;
      })}
    </nav>
  );
}

function SettingsLink() {
  const { user } = useStore();
  const [href, setHref] = useState("/settings");
  useEffect(() => {
    let live = true;
    async function run() {
      if (!user || user.isAnonymous) { if (live) setHref("/settings"); return; }
      const role = await getAdminRole(user.uid).catch(() => null);
      if (live) setHref(role ? "/admin/dashboard" : "/settings");
    }
    run();
    return () => { live = false; };
  }, [user]);
  return <Link className="settings-btn" href={href} title="الإعدادات">⚙</Link>;
}

export function PageHeader({ title, subtitle, actions, backHref, onTitleClick }: { title: string; subtitle?: string; actions?: React.ReactNode; backHref?: string; onTitleClick?: () => void }) {
  const path = usePathname();
  const { t } = useStore();
  const effectiveBackHref = backHref || (path.startsWith("/admin/") && path !== "/admin/dashboard" ? "/admin/dashboard" : "");
  return <header className="page-top"><div className="page-title-row">{effectiveBackHref ? <Link href={effectiveBackHref} className="back-btn" title={t("رجوع")} aria-label={t("رجوع")}>←</Link> : <SettingsLink />}<div className="page-title-text"><h1 onClick={onTitleClick}>{t(title)}</h1>{subtitle ? <p>{t(subtitle)}</p> : null}</div><div className="page-actions">{actions}</div></div></header>;
}
