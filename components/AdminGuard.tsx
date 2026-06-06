"use client";

import { getAdminRole, logoutToAnonymous, onAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

type State = { ok: boolean; role?: string } | null;

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const router = useRouter();

  useEffect(() => {
    let live = true;
    const unsub = onAuth(async (user) => {
      if (!live) return;
      if (!user || user.isAnonymous) {
        setState({ ok: false });
        router.replace("/admin/login");
        return;
      }
      const admin = await getAdminRole(user.uid).catch(() => null);
      if (!live) return;
      if (!admin) {
        setState({ ok: false });
        router.replace("/admin/login");
      } else {
        setState({ ok: true, role: admin.role });
      }
    });
    return () => { live = false; unsub(); };
  }, [router]);

  if (state === null) return <main className="container"><div className="loading">فحص صلاحيات المدير...</div></main>;
  if (!state.ok) return <main className="container"><div className="empty-state">غير مصرح.</div></main>;
  return (
    <main className="container admin-container">
      <div className="admin-mini-bar">
        <button className="btn ghost" onClick={() => logoutToAnonymous().then(() => router.replace("/"))}>تسجيل خروج المدير</button>
        <span>وضع المدير مفعل</span>
      </div>
      {children}
    </main>
  );
}
