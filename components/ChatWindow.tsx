"use client";

import type { ChatMessage } from "@/lib/types";
import { dateText } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

export function ChatWindow({ messages, onSend, senderLabel = "أنت", currentSender = "customer" }: { messages: ChatMessage[]; onSend: (text: string) => Promise<void>; senderLabel?: string; currentSender?: "customer" | "admin" }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); const clean = text.trim(); if (!clean) return;
    setSending(true); try { await onSend(clean); setText(""); } finally { setSending(false); }
  }
  return <div className="chat-box"><div className="messages">{messages.map((m) => { const mine = m.senderType === currentSender; return <div key={m.id} className={`message ${mine ? "mine" : "theirs"} ${m.senderType === "admin" ? "admin" : "customer"}`}><b>{m.senderType === "admin" ? "المتجر" : senderLabel}</b><p>{m.text}</p><time>{dateText(m.createdAt)}</time></div>; })}<div ref={bottomRef} /></div><form className="chat-input" onSubmit={submit}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة نصية فقط" /><button className="btn" disabled={sending || !text.trim()}>{sending ? "..." : "إرسال"}</button></form></div>;
}
