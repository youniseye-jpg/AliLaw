"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { createOrder, getBlacklistPublic, listenCoupons, logBlockedAttempt } from "@/lib/firestore";
import type { Coupon } from "@/lib/types";
import { exportLabel, money, normalizePhone, printHtml, totalsText } from "@/lib/utils";
import { getDirection, getLocaleCode } from "@/lib/i18n";

export default function CartPage() {
  const { cart, updateCartQuantity, removeFromCart, cartTotals, clearCart, user, features, t, language } = useStore();
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [applied, setApplied] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const exportLang = getLocaleCode(language);
  const exportOptions = { t, lang: exportLang, dir: getDirection(exportLang) as "rtl" | "ltr" } as const;
  useEffect(()=>listenCoupons(setCoupons),[]);
  const totalNumber = useMemo(()=>Object.values(cartTotals.totals).reduce((a,b)=>a+b,0),[cartTotals]);
  const discount = applied ? (applied.type === "fixed" ? Number(applied.value||0) : totalNumber * Number(applied.value||0)/100) : 0;
  const finalTotal = Math.max(totalNumber-discount,0);
  function applyCoupon(){const code=couponCode.trim().toUpperCase(); const c=coupons.find(x=>(x.code||x.id||"").toUpperCase()===code); if(!c){setError("الكود غير موجود");return} if(c.isActive===false){setError("الكود غير مفعل");return} if(c.expiresAt && c.expiresAt<Date.now()){setError("انتهت صلاحية الكود");return} if(c.maxUses && (c.usedCount||0)>=c.maxUses){setError("انتهى عدد استخدام الكود");return} if(c.minOrderTotal && totalNumber<c.minOrderTotal){setError("الطلب أقل من الحد الأدنى للكود");return} setError("");setApplied(c)}
  function printCartInvoice(){const l=(key:string)=>exportLabel(exportOptions,key);const items=cart.map(x=>`<tr><td>${x.product.title||""}</td><td>${x.quantity}</td><td>${money(x.product.price||0,x.product.currency||"")}</td></tr>`).join("");printHtml(l("تفاصيل الفاتورة"),`<table><thead><tr><th>${l("المنتج")}</th><th>${l("الكمية")}</th><th>${l("السعر")}</th></tr></thead><tbody>${items}</tbody></table><p>${l("الخصم")}: ${discount}</p><p class="total">${l("المطلوب دفعه")}: ${finalTotal}</p>`, exportOptions)}
  async function submitOrder() {
    setError("");
    if (!user) { setError("انتظر تسجيل الزبون المجهول"); return; }
    if (!cart.length) { setError("السلة فارغة"); return; }
    if (!normalizePhone(form.phone)) { setError("اكتب رقم هاتف صحيح"); return; }
    setBusy(true);
    try {
      const entries = await getBlacklistPublic().catch(() => undefined);
      const normalized = normalizePhone(form.phone);
      const blocked = Object.values(entries || {}).find((e) => normalizePhone(e.normalizedPhone || e.identifier || "").endsWith(normalized.slice(-9)) || normalized.endsWith(normalizePhone(e.normalizedPhone || e.identifier || "").slice(-9)));
      if (blocked) { await logBlockedAttempt(user.uid, { customerName: form.name, phone: form.phone, normalizedPhone: normalized, address: form.address, reason: blocked.reason || "blocked", items: cart.map((x) => ({ productId: x.product.id, title: x.product.title, quantity: x.quantity })) }).catch(() => undefined); setError("لا يمكن إكمال الطلب. تواصل مع الإدارة."); return; }
      await createOrder(user.uid, form, cart, cartTotals, applied ? { code: applied.code || applied.id, discountAmount: discount, totalAfterCoupon: finalTotal } : undefined);
      clearCart(); router.push("/orders");
    } catch (e) { setError(e instanceof Error ? e.message : "فشل إرسال الطلب"); }
    finally { setBusy(false); }
  }
  return <main className="container"><PageHeader title="سلة المشتريات" />{!cart.length ? <div className="empty-state"><p>السلة فارغة.</p><Link href="/categories" className="btn">اضغط هنا لملء السلة</Link></div> : <div className="grid-2"><section className="card">{cart.map((line) => <div className="order-item" key={line.product.id}><div style={{ flex: 1 }}><b>{line.product.title}</b><p className="muted">{money(line.product.price,line.product.currency)}</p></div><button className="btn small ghost" onClick={()=>updateCartQuantity(line.product.id,line.quantity-1)}>−</button><b>{line.quantity}</b><button className="btn small ghost" onClick={()=>updateCartQuantity(line.product.id,line.quantity+1)}>+</button><button className="btn danger small" onClick={() => removeFromCart(line.product.id)}>حذف</button></div>)}<section className="coupon-box"><p>هل لديك كود خصم؟</p><input value={couponCode} onChange={e=>setCouponCode(e.target.value)} placeholder="SALE10"/><button className="btn" onClick={applyCoupon}>تطبيق</button>{applied?<p className="success">تم تطبيق {applied.code}</p>:null}</section><h3>المطلوب دفعه: {finalTotal.toLocaleString()} </h3><button className="btn ghost full" onClick={printCartInvoice}>عرض تفاصيل الفاتورة PDF</button>{features.internalChat !== false ? <button className="btn ghost full" onClick={()=>router.push('/chat')}>تواصل مع المتجر</button> : null}<button className="btn full" disabled={busy} onClick={submitOrder}>{busy ? "إرسال..." : "إتمام الطلب"}</button><button className="btn danger full" onClick={clearCart}>مسح السلة</button>{error ? <p className="error">{error}</p> : null}</section><section className="card form-grid"><label>الاسم<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>الهاتف<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="span-2">العنوان<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label className="span-2">ملاحظة<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} /></label></section></div>}</main>;
}
