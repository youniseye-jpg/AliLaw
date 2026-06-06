"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteCategoryEverywhere, moveCategoryOrder, renameCategoryEverywhere, saveCategoryImage, saveCategoryOrder } from "@/lib/firestore";
import { isSpecialCategory, normalizeImageUrl } from "@/lib/utils";

export type CategoryAdminDialogMode = "edit" | "move";

export function CategoryAdminDialog({
  category,
  mode,
  categories,
  categoryImages,
  onClose
}: {
  category: string;
  mode: CategoryAdminDialogMode;
  categories: string[];
  categoryImages: Record<string, string>;
  onClose: () => void;
}) {
  const cleanCategory = category.trim();
  const special = isSpecialCategory(cleanCategory);
  const [name, setName] = useState(cleanCategory);
  const [image, setImage] = useState(categoryImages[cleanCategory] || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currentIndex = useMemo(() => categories.indexOf(cleanCategory), [categories, cleanCategory]);

  useEffect(() => {
    setName(cleanCategory);
    setImage(categoryImages[cleanCategory] || "");
    setMessage("");
  }, [cleanCategory, categoryImages]);

  async function run(task: () => Promise<void>, doneMessage: string, closeAfter = false) {
    setBusy(true);
    setMessage("");
    try {
      await task();
      setMessage(doneMessage);
      if (closeAfter) window.setTimeout(onClose, 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  async function saveImageOnly() {
    await run(async () => { await saveCategoryImage(cleanCategory, image); }, "تم حفظ رابط الصورة");
  }

  async function saveNameAndImage() {
    const nextName = name.trim();
    if (!nextName) { setMessage("اسم الفئة مطلوب"); return; }
    if (special && nextName !== cleanCategory) { setMessage("هذه فئة ثابتة؛ يمكن تعديل صورتها فقط"); return; }
    await run(async () => {
      if (nextName !== cleanCategory) await renameCategoryEverywhere(cleanCategory, nextName, categories, categoryImages);
      await saveCategoryImage(nextName, image);
    }, "تم حفظ الفئة", true);
  }

  async function deleteCategory() {
    if (special) { setMessage("لا يمكن حذف الفئات الثابتة"); return; }
    if (!confirm(`حذف الفئة "${cleanCategory}"؟ سيتم تفريغ اسم الفئة من منتجاتها.`)) return;
    await run(async () => { await deleteCategoryEverywhere(cleanCategory, categories, categoryImages); }, "تم حذف الفئة", true);
  }

  async function move(step: number) {
    await run(async () => { await moveCategoryOrder(cleanCategory, step, categories); }, "تم تغيير الترتيب");
  }

  async function resetOrder() {
    await run(async () => { await saveCategoryOrder(categories); }, "تم تثبيت الترتيب الحالي");
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
      <div className="section-toolbar">
        <div>
          <h2>{mode === "move" ? "تحريك الفئة" : "إدارة الفئة"}</h2>
          <p className="muted">{cleanCategory}</p>
        </div>
        <button type="button" className="btn small ghost" onClick={onClose}>إغلاق</button>
      </div>

      {mode === "move" ? <div className="move-category-box">
        <p className="muted">اضغط يمين أو يسار لتغيير ترتيب الفئة في الشريط. المنتجات تبقى ضمن فئتها، لكن موضع الفئة يتغير.</p>
        <div className="category-move-actions">
          <button type="button" className="btn" disabled={busy || currentIndex <= 0} onClick={() => move(-1)}>← يسار</button>
          <button type="button" className="btn" disabled={busy || currentIndex < 0 || currentIndex >= categories.length - 1} onClick={() => move(1)}>يمين →</button>
        </div>
        <button type="button" className="btn ghost full" disabled={busy} onClick={resetOrder}>تثبيت الترتيب الحالي</button>
      </div> : <div className="form-grid">
        <label className="span-2">اسم الفئة<input value={name} disabled={special} onChange={(e) => setName(e.target.value)} /></label>
        <label className="span-2">رابط الصورة<input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." /></label>
        {normalizeImageUrl(image) ? <div className="span-2 category-image-preview"><img src={normalizeImageUrl(image)} alt="" /></div> : null}
        {special ? <p className="muted span-2">هذه فئة ثابتة. يمكن تعديل صورتها فقط، ولا يمكن حذفها أو إعادة تسميتها.</p> : null}
        <button type="button" className="btn" disabled={busy} onClick={special ? saveImageOnly : saveNameAndImage}>حفظ</button>
        {!special ? <button type="button" className="btn danger" disabled={busy} onClick={deleteCategory}>حذف الفئة</button> : null}
      </div>}

      {message ? <p className={message.includes("فشل") || message.includes("لا يمكن") || message.includes("مطلوب") ? "error" : "success"}>{message}</p> : null}
    </section>
  </div>;
}
