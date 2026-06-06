"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";

const LOCAL_KEY = "matger_calc_history";
const keys = [
  "C", "⌫", "(", ")",
  "7", "8", "9", "/",
  "4", "5", "6", "*",
  "1", "2", "3", "-",
  "0", ".", "%", "+",
  "sqrt", "^", "±", "="
];

function safeEval(input: string) {
  const clean = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/√/g, "sqrt").replace(/,/g, ".");
  if (!/^[0-9+\-*/().%\s^sqrt]+$/i.test(clean)) throw new Error("invalid");
  const js = clean
    .replace(/sqrt\s*\(/gi, "Math.sqrt(")
    .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)")
    .replace(/\^/g, "**");
  const value = Function(`"use strict"; return (${js})`)();
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("invalid");
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export default function CalculatorPage() {
  const [expr, setExpr] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]")); } catch { setHistory([]); }
  }, []);
  useEffect(() => { localStorage.setItem(LOCAL_KEY, JSON.stringify(history)); }, [history]);

  function addHistory(line: string) { setHistory((h) => [line, ...h].slice(0, 30)); }
  function press(k: string) {
    setError("");
    if (k === "C") { setExpr(""); return; }
    if (k === "⌫") { setExpr((x) => x.slice(0, -1)); return; }
    if (k === "±") { setExpr((x) => x ? `-(${x})` : "-"); return; }
    if (k === "sqrt") { setExpr((x) => `${x}sqrt(`); return; }
    if (k === "=") { calc(); return; }
    setExpr((x) => x + k);
  }
  function calc() {
    try {
      const value = safeEval(expr || "0");
      const line = `${expr || "0"} = ${value}`;
      setExpr(String(value));
      addHistory(line);
    } catch {
      setError("المعادلة غير صحيحة");
    }
  }
  function quickPercent(percent: number) {
    try {
      const value = safeEval(expr || "0");
      const result = value * percent / 100;
      setExpr(String(result));
      addHistory(`${percent}% من ${value} = ${result}`);
    } catch { setError("أدخل رقماً أولاً"); }
  }

  return <AdminGuard><PageHeader title="الحاسبة الاحترافية" backHref="/admin/dashboard" />
    <section className="grid-2">
      <div className="calc card">
        <input value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") calc(); }} placeholder="0" />
        {error ? <p className="error">{error}</p> : null}
        <div className="quick-buttons"><button className="btn small ghost" onClick={() => quickPercent(5)}>5%</button><button className="btn small ghost" onClick={() => quickPercent(10)}>10%</button><button className="btn small ghost" onClick={() => quickPercent(15)}>15%</button><button className="btn small ghost" onClick={() => quickPercent(20)}>20%</button><button className="btn small ghost" onClick={() => setExpr((x) => `${x}*1.18`)}>+18%</button><button className="btn small ghost" onClick={() => setExpr((x) => `${x}/1.18`)}>-18%</button></div>
        <div className="calc-grid">{keys.map((k) => <button key={k} onClick={() => press(k)} className={k === "=" ? "btn" : "btn ghost"}>{k}</button>)}</div>
      </div>
      <div className="card"><h3>السجل</h3><button className="btn small danger" onClick={() => setHistory([])}>مسح السجل</button>{history.length ? history.map((h) => <p className="calc-history" key={h} onClick={() => setExpr(h.split(" = ").pop() || "")}>{h}</p>) : <p className="muted">لا توجد عمليات محفوظة.</p>}</div>
    </section>
  </AdminGuard>;
}
