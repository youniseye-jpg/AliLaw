"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { listenCoupons, listenDoc, saveCoupon } from "@/lib/firestore";
import type { Coupon } from "@/lib/types";
import { db } from "@/lib/firebase";
import { deleteDoc, doc, setDoc } from "firebase/firestore";

const quick = [[0,"بدون انتهاء"],[5,"5 دقائق"],[10,"10 دقائق"],[30,"30 دقيقة"],[60,"ساعة"],[1440,"يوم"],[10080,"أسبوع"]] as const;
function exp(minutes:number){return minutes<=0?0:Date.now()+minutes*60*1000;}
function minutesFromExpiresAt(value?: number){ if(!value) return 0; return Math.max(0, Math.round((Number(value)-Date.now())/60000)); }

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [compat, setCompat] = useState({ allowWithDiscountedProducts:false, allowWithFlashOffers:false, allowStackingDiscounts:false });
  const [customMinutes, setCustomMinutes] = useState(0);
  const [form, setForm] = useState<Partial<Coupon>>({ type: "percent", isActive: true, value: 0, maxFinalDiscountPercent: 80 });
  useEffect(() => listenCoupons(setCoupons), []);
  useEffect(() => listenDoc<typeof compat>("appSettings","couponCompatibility",d=>{ if(d) setCompat(x=>({...x,...d})); }), []);
  async function saveCompatibility(){ const payload={...compat,updatedAt:Date.now()}; await Promise.all([setDoc(doc(db,"appSettings","couponCompatibility"),payload,{merge:true}), setDoc(doc(db,"config","coupon_compatibility"),payload,{merge:true})]); }
  function applyMinutes(m:number){ setCustomMinutes(m); setForm({...form,expiresAt:exp(m)}); }
  async function save(){ await saveCoupon({...form,...compat}); setForm({ type: "percent", isActive: true, value: 0, maxFinalDiscountPercent: 80 }); setCustomMinutes(0); }
  return <AdminGuard><PageHeader title="أكواد الخصم" backHref="/admin/advanced"/>
    <section className="card"><label className="switch-row"><input type="checkbox" checked={compat.allowWithDiscountedProducts} onChange={e=>setCompat({...compat,allowWithDiscountedProducts:e.target.checked})}/>السماح مع المنتجات المخفضة</label><label className="switch-row"><input type="checkbox" checked={compat.allowWithFlashOffers} onChange={e=>setCompat({...compat,allowWithFlashOffers:e.target.checked})}/>السماح مع عروض الفلاش</label><label className="switch-row"><input type="checkbox" checked={compat.allowStackingDiscounts} onChange={e=>setCompat({...compat,allowStackingDiscounts:e.target.checked})}/>السماح بتجميع الخصومات</label><button className="btn" onClick={saveCompatibility}>حفظ توافق الخصومات</button></section>
    <section className="card form-grid"><h2 className="span-2">تعديل كود الخصم</h2><label>كود الخصم<input value={form.code || form.id || ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase(), id: e.target.value.toUpperCase() })} /></label><label>قيمة الخصم<input type="number" value={form.value || 0} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></label><label className="switch-row span-2"><input type="checkbox" checked={form.type==="fixed"} onChange={(e)=>setForm({...form,type:e.target.checked?"fixed":"percent"})}/>خصم مبلغ ثابت بدل نسبة</label><label className="switch-row span-2"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />مفعل</label><div className="span-2"><p>مدة صلاحية الكود</p><div className="quick-buttons">{quick.map(([m,l])=><button type="button" className="chip" key={m} onClick={()=>applyMinutes(m)}>{l}</button>)}</div></div><label className="span-2">مدة مخصصة بالدقائق<input type="number" value={customMinutes || minutesFromExpiresAt(form.expiresAt)} onChange={e=>applyMinutes(Number(e.target.value))}/></label><label>أقصى عدد استخدام<input type="number" value={form.maxUses || 0} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} /></label><label>الحد الأدنى للطلب<input type="number" value={form.minOrderTotal || 0} onChange={(e) => setForm({ ...form, minOrderTotal: Number(e.target.value) })} /></label><label className="span-2">أقصى خصم نهائي %<input type="number" value={form.maxFinalDiscountPercent || 80} onChange={(e) => setForm({ ...form, maxFinalDiscountPercent: Number(e.target.value) })} /></label><label className="switch-row span-2"><input type="checkbox" checked={Boolean(form.oneUsePerCustomer)} onChange={(e) => setForm({ ...form, oneUsePerCustomer: e.target.checked })} />مرة واحدة لكل زبون</label><label className="switch-row span-2"><input type="checkbox" checked={Boolean(form.allowWithDiscountedProducts||compat.allowWithDiscountedProducts)} onChange={(e) => setForm({ ...form, allowWithDiscountedProducts: e.target.checked })} />السماح مع المنتجات المخفضة</label><label className="switch-row span-2"><input type="checkbox" checked={Boolean(form.allowWithFlashOffers||compat.allowWithFlashOffers)} onChange={(e) => setForm({ ...form, allowWithFlashOffers: e.target.checked })} />السماح مع عروض الفلاش</label><label className="switch-row span-2"><input type="checkbox" checked={Boolean(form.allowStackingDiscounts||compat.allowStackingDiscounts)} onChange={(e) => setForm({ ...form, allowStackingDiscounts: e.target.checked })} />السماح بتجميع الخصومات</label><button className="btn span-2" onClick={save}>حفظ التغييرات</button></section>
    <div className="card" style={{ marginTop: 16 }}>{coupons.map((c) => <div className="order-item" key={c.id}><div style={{ flex: 1 }}><b>{c.code}</b><p className="muted">{c.isActive===false?"غير مفعل":"مفعل"} — {c.type} — {c.value}{c.type==="percent"?"%":""} — الاستخدام: {c.usedCount || 0}/{c.maxUses||0}</p></div><button className="btn small ghost" onClick={() => { setForm(c); setCustomMinutes(minutesFromExpiresAt(c.expiresAt)); }}>تعديل</button><button className="btn small danger" onClick={() => deleteDoc(doc(db, "coupons", c.id))}>حذف</button></div>)}</div>
  </AdminGuard>;
}
