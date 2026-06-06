"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { normalizePhone } from "@/lib/utils";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

type Entry = { identifier?: string; normalizedPhone?: string; reason?: string; timestamp?: number };

export default function BlacklistPage() {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => onSnapshot(doc(db, "admin_config", "blacklist_entries"), (snap) => setEntries((snap.data()?.entries || {}) as Record<string, Entry>)), []);
  async function add() {
    const id = identifier.trim(); if (!id) return;
    const key = normalizePhone(id).replace(/[^A-Za-z0-9_+-]/g, "_") || id.replace(/[^A-Za-z0-9_+-]/g, "_");
    const entry = { identifier: id, normalizedPhone: normalizePhone(id), reason: reason.trim(), timestamp: Date.now() };
    await setDoc(doc(db, "admin_config", "blacklist_entries"), { entries: { ...entries, [key]: entry }, updatedAt: Date.now() }, { merge: true });
    await setDoc(doc(db, "config", "blacklist_entries"), { entries: { ...entries, [key]: entry }, updatedAt: Date.now() }, { merge: true });
    setIdentifier(""); setReason("");
  }
  async function remove(key: string) {
    const next = { ...entries }; delete next[key];
    await setDoc(doc(db, "admin_config", "blacklist_entries"), { entries: next, updatedAt: Date.now() });
    await setDoc(doc(db, "config", "blacklist_entries"), { entries: next, updatedAt: Date.now() });
  }
  return <AdminGuard><PageHeader title="القائمة السوداء" subtitle="تُحفظ في admin_config وتُنسخ إلى config للقراءة أثناء Checkout" /><section className="card form-grid"><label>رقم/معرف<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></label><label>السبب<input value={reason} onChange={(e) => setReason(e.target.value)} /></label><button className="btn span-2" onClick={add}>إضافة</button></section><div className="card" style={{ marginTop: 16 }}>{Object.entries(entries).map(([key, e]) => <div className="order-item" key={key}><div style={{ flex: 1 }}><b>{e.identifier}</b><p className="muted">{e.reason}</p></div><button className="btn danger small" onClick={() => remove(key)}>حذف</button></div>)}</div></AdminGuard>;
}
