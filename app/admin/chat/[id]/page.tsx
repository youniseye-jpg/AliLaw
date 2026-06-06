"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { ChatWindow } from "@/components/ChatWindow";
import { PageHeader } from "@/components/Navbar";
import { listenConversation, listenMessages, markChatRead, sendChatMessage } from "@/lib/firestore";
import type { ChatConversation, ChatMessage } from "@/lib/types";

export default function AdminChatPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  useEffect(() => { if (!id) return; markChatRead(id, true).catch(() => undefined); const u1 = listenConversation(id, setConversation); const u2 = listenMessages(id, setMessages); return () => { u1(); u2(); }; }, [id]);
  return <AdminGuard><PageHeader title={`دردشة: ${conversation?.customerName || conversation?.customerPhone || id}`} subtitle="رسائل نصية فقط — لا Storage" backHref="/admin/chat" /><ChatWindow messages={messages} currentSender="admin" senderLabel={conversation?.customerName || "الزبون"} onSend={(text) => sendChatMessage(id, text, "admin")} /></AdminGuard>;
}
