"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { deleteConversation, deleteConversations, listenConversations } from "@/lib/firestore";
import type { ChatConversation } from "@/lib/types";
import { dateText } from "@/lib/utils";

export default function AdminChatListPage() {
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => listenConversations(setItems), []);
  function toggle(id:string, checked:boolean){ setSelected((current)=> checked ? Array.from(new Set([...current,id])) : current.filter((x)=>x!==id)); }
  async function removeOne(id:string){ if(!confirm("حذف هذه المحادثة؟")) return; setBusy(true); try{ await deleteConversation(id); setSelected((x)=>x.filter((v)=>v!==id)); } finally{ setBusy(false); } }
  async function removeSelected(){ if(!selected.length) return; if(!confirm(`حذف ${selected.length} محادثة؟`)) return; setBusy(true); try{ await deleteConversations(selected); setSelected([]); } finally{ setBusy(false); } }
  async function removeAll(){ if(!items.length) return; if(!confirm("حذف كل المحادثات؟")) return; setBusy(true); try{ await deleteConversations(items.map((x)=>x.id)); setSelected([]); } finally{ setBusy(false); } }
  return <AdminGuard><PageHeader title="دردشة الزبائن" subtitle="chatConversations + chat_conversations" backHref="/admin/advanced" actions={<div className="quick-buttons"><button className="btn small danger" disabled={busy || !selected.length} onClick={removeSelected}>حذف المحدد</button><button className="btn small danger ghost" disabled={busy || !items.length} onClick={removeAll}>حذف الكل</button></div>} />
    {items.length ? <div className="grid-2">{items.map((c) => <article className="card" key={c.id}>
      <label className="switch-row"><input type="checkbox" checked={selected.includes(c.id)} onChange={(e)=>toggle(c.id,e.target.checked)}/>تحديد</label>
      <Link href={`/admin/chat/${c.id}`}><h3>{c.customerName || c.customerPhone || c.customerUid || c.id}</h3><p>{c.lastMessage || "بدون رسائل"}</p><p className="muted">{dateText(c.lastMessageAt || c.updatedAt)}</p>{c.unreadForAdmin ? <span className="badge">{c.unreadForAdmin}</span> : null}</Link>
      <button className="btn small danger" disabled={busy} onClick={()=>removeOne(c.id)}>حذف المحادثة</button>
    </article>)}</div> : <div className="empty-state">لا توجد محادثات.</div>}
  </AdminGuard>;
}
