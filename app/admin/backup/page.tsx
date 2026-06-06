"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { collection,getDocs,writeBatch,doc } from "firebase/firestore";
import { downloadText } from "@/lib/utils";
const names=["products","categories","orders","coupons","banners","home_custom_sections","links","blocked_attempts","admin_notes","notes"];
export default function BackupPage(){
  const [msg,setMsg]=useState("");
  const [mode,setMode]=useState<"export"|"import">("export");
  async function exportBackup(){const data:any={exportedAt:Date.now(),collections:{}};for(const n of names){const s=await getDocs(collection(db,n)).catch(()=>null);data.collections[n]=s?s.docs.map(d=>({id:d.id,data:d.data()})):[]}downloadText("matger-backup.json",JSON.stringify(data,null,2),"application/json;charset=utf-8");setMsg("تم تصدير النسخة الاحتياطية");}
  async function importBackup(file:File){const text=await file.text();const data=JSON.parse(text);for(const n of Object.keys(data.collections||{})){const batch=writeBatch(db);for(const item of data.collections[n]) batch.set(doc(db,n,item.id),item.data,{merge:true});await batch.commit();}setMsg("تم الاستيراد")}
  return <AdminGuard><PageHeader title="النسخة الاحتياطية" backHref="/admin/advanced"/>
    <section className="card">
      <div className="tabs"><button className={mode==="export"?"active":""} onClick={()=>setMode("export")}>تصدير</button><button className={mode==="import"?"active":""} onClick={()=>setMode("import")}>استيراد</button></div>
      {mode==="export" ? <button className="btn full" onClick={exportBackup}>تصدير نسخة احتياطية</button> : <label>اختر ملف النسخة للاستيراد<input type="file" accept="application/json" onChange={e=>{const f=e.target.files?.[0]; if(f) importBackup(f).catch(err=>setMsg(err.message))}}/></label>}
      {msg?<p className="success">{msg}</p>:null}
    </section>
  </AdminGuard>
}
