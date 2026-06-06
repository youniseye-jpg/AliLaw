"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { ProductGrid, renderStars } from "@/components/ProductCard";
import { listenProductRatings, saveProductRating } from "@/lib/firestore";
import type { ProductRating } from "@/lib/types";
import { effectiveStock, finalPrice, money, normalizeImageUrl, nowMs, statusLabel } from "@/lib/utils";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { products, addToCart, user, features } = useStore();
  const product = products.find((p) => p.id === id);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [ratings, setRatings] = useState<ProductRating[]>([]);

  useEffect(() => {
    if (!id || features.ratings === false) return;
    return listenProductRatings(id, setRatings);
  }, [id, features.ratings]);

  useEffect(() => {
    if (!user?.uid || !ratings.length) return;
    const ownRating = ratings.find((item) => [item.customerUid, item.userUid, item.uid, item.userId, item.ownerUid, item.customerDeviceId].includes(user.uid));
    if (ownRating?.rating) {
      setRating(Math.max(1, Math.min(5, Number(ownRating.rating || 0))));
      if (ownRating.userName && ownRating.userName !== "زبون") setName(ownRating.userName);
    }
  }, [ratings, user?.uid]);

  const related = useMemo(() => product ? products.filter((p) => p.id !== product.id && (product.relatedProductIds?.includes(p.id) || p.category === product.category)).slice(0, 8) : [], [products, product]);
  const uniqueRatings = useMemo(() => {
    const map = new Map<string, ProductRating>();
    ratings.forEach((item) => {
      const ownerKey = String(item.customerUid || item.userUid || item.uid || item.userId || item.ownerUid || item.customerDeviceId || item.id || "");
      const previous = map.get(ownerKey);
      const previousTime = Number(previous?.updatedAt || previous?.timestamp || 0);
      const itemTime = Number(item.updatedAt || item.timestamp || 0);
      if (!previous || itemTime >= previousTime) map.set(ownerKey, item);
    });
    return Array.from(map.values());
  }, [ratings]);
  const storedRatingCount = Number(product?.ratingCount || product?.reviewCount || 0);
  const storedRatingAverage = Number(product?.ratingAverage || (product?.ratingSum && storedRatingCount ? product.ratingSum / storedRatingCount : 0));
  const liveRatingCount = uniqueRatings.length || storedRatingCount;
  const liveRatingAverage = uniqueRatings.length ? uniqueRatings.reduce((sum, item) => sum + Number(item.rating || 0), 0) / uniqueRatings.length : storedRatingAverage;

  if (!product) return <main className="container"><div className="empty-state">المنتج غير موجود أو لم يتم تحميله بعد.</div></main>;

  async function saveRating(selectedRating: number, withComment = false) {
    const cleanRating = Math.max(1, Math.min(5, Number(selectedRating || 0)));
    setMsg("");
    setRating(cleanRating);
    if (!user) {
      setMsg("لم يكتمل تجهيز حساب الزبون بعد. حاول بعد ثوانٍ.");
      return;
    }
    if (!cleanRating) {
      setMsg("اختر عدد النجوم أولاً.");
      return;
    }
    await saveProductRating(product!.id, { uid: user.uid, userName: name, rating: cleanRating, ...(withComment ? { comment } : {}) });
    setMsg(`تم حفظ تقييم ${cleanRating} من 5`);
    if (withComment) setComment("");
  }

  async function submitRating() {
    await saveRating(rating, true);
  }

  return (
    <main className="container">
      <section className="grid-2">
        <div className="card">{normalizeImageUrl(product.imageUrl) ? <img src={normalizeImageUrl(product.imageUrl)} alt={product.title} style={{ width: "100%", borderRadius: 18 }} /> : <div className="image-placeholder">بدون صورة</div>}</div>
        <div className="card">
          <h1 data-dynamic-content>{product.title}</h1>
          <p className="muted" data-dynamic-content>{product.description}</p>
          {features.ratings !== false ? <p className="rating-row large"><span className="rating-stars">{renderStars(liveRatingAverage)}</span> <span>{liveRatingCount > 0 ? `${liveRatingAverage.toFixed(1)} من 5 — ${liveRatingCount} تقييم` : "لا توجد تقييمات بعد"}</span></p> : null}
          <h2>{money(finalPrice(product), product.currency || "USD")}</h2>
          <p>الحالة: {statusLabel(product.status)} — المخزون: {effectiveStock(product)}</p>
          {product.barcode ? <p>الباركود: {product.barcode}</p> : null}
          <button className="btn" onClick={() => addToCart(product)}>أضف للسلة</button>
        </div>
      </section>

      {features.ratings !== false ? <section className="card" style={{ marginTop: 18 }}>
        <h2>تقييمات المنتج</h2>
        <div className="form-grid">
          <label>الاسم<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="rating-field">
            <span>التقييم</span>
            <div className="rating-picker" role="radiogroup" aria-label="اختيار التقييم">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`star-button ${v <= rating ? "active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => saveRating(v)}
                  aria-label={`${v} نجوم`}
                  aria-pressed={v <= rating}
                  title={`${v} نجوم`}
                >
                  {v <= rating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <small className="muted">اضغط على أي نجمة لحفظ التقييم مباشرة.</small>
          </div>
          <label className="span-2">تعليق اختياري<textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} /></label>
          <div className="span-2"><button className="btn" onClick={submitRating} disabled={!rating}>حفظ التعليق مع التقييم</button> {msg ? <span className="success">{msg}</span> : null}</div>
        </div>
        <h3>التقييمات السابقة</h3>
        {uniqueRatings.length ? <div className="notes-list">{uniqueRatings.map((r) => <article className="note-card" key={r.id}><b data-dynamic-content>{r.userName || "زبون"} — <span className="rating-stars">{renderStars(Number(r.rating || 0))}</span></b>{r.comment ? <p data-dynamic-content>{r.comment}</p> : <p className="muted">بدون تعليق</p>}<small>{new Date(r.timestamp || r.updatedAt || nowMs()).toLocaleString()}</small></article>)}</div> : <p className="muted">لا توجد تقييمات بعد.</p>}
      </section> : null}

      {features.relatedProducts !== false ? <><h2>منتجات مشابهة</h2><ProductGrid products={related} empty="لا توجد منتجات مشابهة" /></> : null}
    </main>
  );
}
