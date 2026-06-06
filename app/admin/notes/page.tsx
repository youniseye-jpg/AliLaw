"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";

type Note = { id: string; title?: string; text?: string; updatedAt?: number; createdAt?: number };
const LOCAL_KEY = "matger_admin_notes_backup";
const NOTE_COLLECTIONS = ["admin_notes", "notes"] as const;

function loadLocalNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as Note[]; } catch { return []; }
}

function saveLocalNotes(notes: Note[]) {
  if (typeof window !== "undefined") localStorage.setItem(LOCAL_KEY, JSON.stringify(notes));
}

function sortNotes(items: Note[]) {
  return [...items].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const local = loadLocalNotes();
    if (local.length) setNotes(sortNotes(local));
    let primary: Note[] = [];
    let secondary: Note[] = [];
    const emit = () => {
      const map = new Map<string, Note>();
      [...secondary, ...primary].forEach((n) => map.set(n.id, n));
      const remote = sortNotes(Array.from(map.values()));
      setNotes(remote);
      saveLocalNotes(remote);
    };
    const unsubs = NOTE_COLLECTIONS.map((name, index) => onSnapshot(collection(db, name), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
      if (index === 0) primary = list; else secondary = list;
      emit();
    }, () => setMsg("تعذر قراءة Firebase، يتم عرض النسخة المحلية إن وجدت")));
    return () => unsubs.forEach((fn) => fn());
  }, []);

  function resetForm(message = "") {
    setActiveId("");
    setTitle("");
    setText("");
    if (message) setMsg(message);
  }

  function edit(note: Note) {
    setActiveId(note.id);
    setTitle(note.title || "");
    setText(note.text || "");
    setMsg("وضع تعديل ملاحظة قديمة. اضغط حفظ الملاحظة لتثبيت التعديل وفتح ملاحظة جديدة.");
  }

  async function saveNote() {
    const cleanTitle = title.trim();
    const cleanText = text.trim();
    if (!cleanTitle && !cleanText) {
      setMsg("اكتب عنوان الملاحظة أو نصها أولاً");
      return;
    }
    const now = Date.now();
    const payload = {
      title: cleanTitle || "ملاحظة بدون عنوان",
      text,
      createdAt: notes.find((n) => n.id === activeId)?.createdAt || now,
      updatedAt: now
    };
    setSaving(true);
    try {
      if (activeId) await Promise.all(NOTE_COLLECTIONS.map((name) => setDoc(doc(db, name, activeId), payload, { merge: true })));
      else { const ref = await addDoc(collection(db, "admin_notes"), payload); await setDoc(doc(db, "notes", ref.id), payload, { merge: true }); }
      setNotes((current) => {
        const next = activeId
          ? current.map((n) => n.id === activeId ? { ...n, ...payload } : n)
          : [{ id: `local_${now}`, ...payload }, ...current];
        const sorted = sortNotes(next);
        saveLocalNotes(sorted);
        return sorted;
      });
      resetForm("تم حفظ الملاحظة وفتح نموذج جديد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل حفظ الملاحظة");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(id: string) {
    if (!confirm("حذف الملاحظة؟")) return;
    await Promise.all(NOTE_COLLECTIONS.map((name) => deleteDoc(doc(db, name, id)).catch(() => undefined)));
    setNotes((current) => {
      const next = current.filter((n) => n.id !== id);
      saveLocalNotes(next);
      return next;
    });
    if (activeId === id) resetForm("تم حذف الملاحظة");
  }

  return <AdminGuard>
    <PageHeader title="دفتر الملاحظات" backHref="/admin/dashboard" actions={<button className="btn small" onClick={() => resetForm("نموذج ملاحظة جديدة جاهز")}>ملاحظة جديدة</button>} />
    <section className="grid-2">
      <div className="card">
        <h2>الملاحظات المحفوظة</h2>
        {notes.length ? notes.map((n) => <div className={activeId === n.id ? "note-row active" : "note-row"} key={n.id}>
          <button onClick={() => edit(n)}>
            <b>{n.title || "ملاحظة"}</b>
            <small>{new Date(n.updatedAt || n.createdAt || 0).toLocaleString()}</small>
          </button>
          <button className="btn small danger" onClick={() => removeNote(n.id)}>حذف</button>
        </div>) : <p className="muted">لا توجد ملاحظات. اكتب العنوان والنص ثم اضغط حفظ الملاحظة.</p>}
      </div>
      <div className="card form-grid">
        <h2 className="span-2">{activeId ? "تعديل ملاحظة" : "ملاحظة جديدة"}</h2>
        <label className="span-2">عنوان الملاحظة<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الملاحظة" /></label>
        <label className="span-2">نص الملاحظة<textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب نص الملاحظة" /></label>
        <button className="btn span-2" onClick={saveNote} disabled={saving}>{saving ? "حفظ..." : "حفظ الملاحظة"}</button>
        {msg ? <p className={`span-2 ${msg.includes("فشل") || msg.includes("تعذر") ? "error" : "success"}`}>{msg}</p> : null}
      </div>
    </section>
  </AdminGuard>;
}
