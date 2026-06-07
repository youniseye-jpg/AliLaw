"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { ChatWindow } from "@/components/ChatWindow";
import { createOrGetConversation, listenMessages, markChatRead, sendChatMessage } from "@/lib/firestore";
import { getAdminRole } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";

const CHAT_KEY = "matger_web_customer_chat_id";
function customerChatKey(uid?: string) {
  if (typeof window === "undefined") return uid ? `customer_${uid}` : "";
  const existing = localStorage.getItem(CHAT_KEY);
  if (existing) return existing;
  const next = `web_customer_${uid || Math.random().toString(36).slice(2)}_${Date.now()}`;
  localStorage.setItem(CHAT_KEY, next);
  return next;
}

export default function CustomerChatPage() {
  const { user, features } = useStore();
  const router = useRouter();
  const [identity, setIdentity] = useState({ name: "", phone: "" });
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (!user?.uid || user.isAnonymous) return;
    getAdminRole(user.uid).then((role) => { if (live && role) router.replace("/admin/chat"); }).catch(() => undefined);
    return () => { live = false; };
  }, [user, router]);

  useEffect(() => {
    if (!user?.uid || !conversationId) return;
    markChatRead(conversationId, false).catch(() => undefined);
    return listenMessages(conversationId, setMessages);
  }, [user?.uid, conversationId]);

  async function openChat() {
    if (!user?.uid) return;
    setError("");
    try {
      const key = customerChatKey(user.uid);
      setConversationId(await createOrGetConversation(user.uid, identity.name, identity.phone, key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل فتح المحادثة");
    }
  }

  if (features.internalChat === false) return <main className="container"><PageHeader title="مراسلة المحامي" /><div className="empty-state">الدردشة الداخلية مغلقة حالياً من مفاتيح التحكم.</div></main>;
  return <main className="container"><PageHeader title="مراسلة المحامي" subtitle="الدردشة نصية فقط وتعمل بتحديث مباشر عبر onSnapshot" />{!conversationId ? <section className="card form-grid"><label>اسمك<input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} /></label><label>الهاتف<input value={identity.phone} onChange={(e) => setIdentity({ ...identity, phone: e.target.value })} /></label><div className="span-2"><button className="btn" onClick={openChat}>فتح الدردشة</button>{error ? <p className="error">{error}</p> : null}</div></section> : <ChatWindow messages={messages} currentSender="customer" senderLabel={identity.name || "أنت"} onSend={(text) => sendChatMessage(conversationId, text, "customer", user?.uid)} />}</main>;
}
