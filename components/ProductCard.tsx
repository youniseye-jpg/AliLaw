"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { getAdminRole } from "@/lib/auth";
import { saveProductRating } from "@/lib/firestore";
import { effectiveStock, finalPrice, hasActiveFlash, isPurchasable, money, normalizeImageUrl, productAspectRatio, statusLabel } from "@/lib/utils";
import { useStore } from "@/components/Providers";

export function renderStars(value?: number) {
  const score = Math.max(0, Math.min(5, Number(value || 0)));
  const filled = Math.round(score);
  return Array.from({ length: 5 }, (_, index) => index < filled ? "★" : "☆").join("");
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addToCart, toggleFavorite, isFavorite, theme, features, t, user } = useStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [localRating, setLocalRating] = useState(0);
  const [ratingMessage, setRatingMessage] = useState("");
  const price = finalPrice(product);
  const original = product.price || 0;
  const cur = product.currency || "USD";
  const stock = effectiveStock(product);
  const available = isPurchasable(product.status) && stock > 0;
  const cardColor = product.customCardColorHex || product.customCardColor || "";
  const flashOn = features.flashOffers !== false && hasActiveFlash(product);
  const ratingCount = Number(product.ratingCount || product.reviewCount || 0);
  const storedAverage = Number(product.ratingAverage || (product.ratingSum && ratingCount ? product.ratingSum / ratingCount : 0));
  const ratingAverage = localRating || storedAverage;
  const productHref = isAdmin ? `/admin/products/${product.id}` : `/product/${product.id}`;

  useEffect(() => {
    let live = true;
    if (!user || user.isAnonymous) { setIsAdmin(false); return; }
    getAdminRole(user.uid).then((role) => { if (live) setIsAdmin(Boolean(role)); }).catch(() => { if (live) setIsAdmin(false); });
    return () => { live = false; };
  }, [user?.uid, user?.isAnonymous]);

  async function rateFromCard(value: number) {
    const cleanRating = Math.max(1, Math.min(5, Number(value || 0)));
    setLocalRating(cleanRating);
    setRatingMessage("");
    if (!user) {
      setRatingMessage("لم يكتمل تجهيز حساب الزبون بعد");
      return;
    }
    try {
      await saveProductRating(product.id, { uid: user.uid, rating: cleanRating });
      setRatingMessage("تم حفظ التقييم");
      window.setTimeout(() => setRatingMessage(""), 1600);
    } catch (error) {
      setRatingMessage(error instanceof Error ? error.message : "فشل حفظ التقييم");
    }
  }

  return (
    <article className="product-card" style={cardColor ? { background: product.customCardColorIncludesImageFrame ? cardColor : undefined } : undefined}>
      <Link href={productHref} className="product-image-wrap" style={{ aspectRatio: productAspectRatio(product.imageAspectRatioKey, product.customImageAspectRatio) }}>
        {normalizeImageUrl(product.imageUrl) ? <img src={normalizeImageUrl(product.imageUrl)} alt={product.title || "product"} className="product-image" /> : <div className="image-placeholder">بدون صورة</div>}
        {flashOn ? <span className="badge flash">عرض فلاش</span> : null}
        {product.discount ? <span className="badge discount">خصم {product.discount}%</span> : null}
      </Link>
      <div className="product-info" style={cardColor && !product.customCardColorIncludesImageFrame ? { background: cardColor } : undefined}>
        <button className={isFavorite(product.id) ? "heart active" : "heart"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product); }} title={t("مفضلة")} aria-label={t("مفضلة")}>
          <span className="heart-shape" aria-hidden="true" />
        </button>
        <Link href={productHref}><h3 data-dynamic-content style={theme.productNameColorHex ? { color: theme.productNameColorHex } : undefined}>{product.title || "منتج بدون اسم"}</h3></Link>
        {!compact ? <p className="muted line-clamp" data-dynamic-content style={theme.productDescriptionColorHex ? { color: theme.productDescriptionColorHex } : undefined}>{product.description || ""}</p> : null}
        {features.ratings !== false ? <div className="rating-row product-card-rating" title={ratingCount > 0 ? `${storedAverage.toFixed(1)} من 5` : "لا توجد تقييمات بعد"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="card-rating-picker" role="radiogroup" aria-label="تقييم المنتج من البطاقة">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                className={v <= ratingAverage ? "active" : ""}
                onClick={() => rateFromCard(v)}
                aria-label={`${v} نجوم`}
                title={`${v} نجوم`}
              >
                {v <= ratingAverage ? "★" : "☆"}
              </button>
            ))}
          </div>
          <span>{ratingCount > 0 ? `${storedAverage.toFixed(1)} (${ratingCount})` : "قيّم المنتج"}</span>
          {ratingMessage ? <small className={ratingMessage === "تم حفظ التقييم" ? "success" : "error"}>{ratingMessage}</small> : null}
        </div> : null}
        <div className="price-row"><strong style={theme.productPriceColorHex ? { color: theme.productPriceColorHex } : undefined}>{money(price, cur)}</strong>{original > price ? <span className="old-price">{money(original, cur)}</span> : null}</div>
        <div className="meta-row"><span data-dynamic-content style={theme.productCategoryColorHex ? { color: theme.productCategoryColorHex } : undefined}>{product.category || "عام"}</span><span style={theme.productStockColorHex ? { color: theme.productStockColorHex } : undefined}>{stock > 0 ? `المتوفر: ${stock}` : statusLabel(product.status || "out_of_stock")}</span></div>
        <button className="btn small full" disabled={!available} onClick={() => addToCart(product)}>{available ? t("addToCart") : t("unavailable")}</button>
      </div>
    </article>
  );
}

export function ProductGrid({ products, empty = "لا توجد منتجات" }: { products: Product[]; empty?: string }) {
  if (!products.length) return <div className="empty-state">{empty}</div>;
  return <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}
