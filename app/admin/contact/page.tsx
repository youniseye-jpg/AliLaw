"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { CustomLinksEditor, type EditableCustomLink } from "@/components/CustomLinksEditor";
import { listenDoc, saveStoreContact } from "@/lib/firestore";
import type { StoreContact } from "@/lib/types";
import { parseCustomLinks, serializeCustomLinks } from "@/lib/utils";

export default function ContactPage() {
  const [contact, setContact] = useState<StoreContact>({});
  const [customLinks, setCustomLinks] = useState<EditableCustomLink[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => listenDoc<StoreContact>("config", "store_contact", (data) => {
    const next = data || {};
    setContact(next);
    setCustomLinks(parseCustomLinks(next.customLinks).map((item) => ({ name: item.name, url: item.url })));
  }), []);

  async function save() {
    await saveStoreContact({ ...contact, customLinks: serializeCustomLinks(customLinks) });
    setMsg("تم الحفظ");
  }

  return <AdminGuard>
    <PageHeader title="بيانات التواصل" backHref="/admin/dashboard" />
    <section className="card form-grid">
      <label>رقم الواتساب<input value={contact.whatsapp || ""} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} /></label>
      <label>البريد الإلكتروني<input value={contact.email || ""} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
      <label>رابط فيسبوك<input value={contact.facebook || ""} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} /></label>
      <label>رابط إنستغرام<input value={contact.instagram || ""} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} /></label>
      <label>رابط تيليغرام<input value={contact.telegram || ""} onChange={(e) => setContact({ ...contact, telegram: e.target.value })} /></label>
      <label>رابط الموقع<input value={contact.website || ""} onChange={(e) => setContact({ ...contact, website: e.target.value })} /></label>
      <CustomLinksEditor links={customLinks} onChange={setCustomLinks} />
      <button className="btn span-2" onClick={save}>حفظ التغييرات</button>
      {msg ? <p className="success span-2">{msg}</p> : null}
    </section>
  </AdminGuard>;
}
