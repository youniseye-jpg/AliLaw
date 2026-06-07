"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/Navbar";
import { useStore } from "@/components/Providers";
import { parseCustomLinks, safeLink } from "@/lib/utils";

export default function CustomerSettingsPage() {
  const { contact, features, t } = useStore();
  const router = useRouter();
  const [taps, setTaps] = useState(0);
  function secretTap(){ const n = taps + 1; setTaps(n); if(n >= 5) router.push("/admin/login"); setTimeout(()=>setTaps(0), 1800); }
  const cards = [
    ["رقم الواتساب", contact.whatsapp, "تواصل مباشرة مع المتجر", "☎"],
    ["البريد الإلكتروني", contact.email, "إرسال بريد إلكتروني", "✉"],
    ["رابط فيسبوك", contact.facebook, "زيارة صفحة فيسبوك", "f"],
    ["رابط إنستغرام", contact.instagram, "زيارة إنستغرام", "◎"],
    ["رابط تيليغرام", contact.telegram, "فتح تيليغرام", "✈"],
    ["رابط الموقع", contact.website, "زيارة الموقع", "🌐"]
  ].filter((x) => x[1]);
  const custom = parseCustomLinks(contact.customLinks).map((x) => [x.name, x.url, x.url, "🌐"] as const);
  return <main className="container"><PageHeader title={t("settings")} onTitleClick={secretTap} /><Link href="/settings/appearance" className="btn full wide">{t("appearance")}</Link><section className="panel"><h2>تواصل معنا</h2><div className="link-cards">{[...cards, ...custom].map(([title, url, sub, icon]) => <a key={`${title}-${url}`} className="contact-card" href={safeLink(url)} target="_blank"><span className="round-icon">{icon}</span><b>{title}</b><small>{sub}</small><span>‹</span></a>)}</div></section>{features.internalChat !== false ? <Link href="/chat" className="btn full wide">مراسلة المحامي</Link> : null}</main>;
}
