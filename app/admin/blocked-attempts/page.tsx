"use client";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { dateText } from "@/lib/utils";

export default function BlockedAttemptsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => onSnapshot(query(collection(db, "blocked_attempts"), limit(200)), (snap) => {
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)));
  }), []);
  return <AdminGuard><PageHeader title="محاولات محظورة" backHref="/admin/advanced" /><div className="list">{items.map((x) => <article className="card" key={x.id}><h3>{x.phone || x.identifier || x.normalizedPhone}</h3><p>{x.customerName}</p><p>{dateText(x.timestamp)}</p><p>سبب الحظر: {x.reason}</p></article>)}</div></AdminGuard>;
}
