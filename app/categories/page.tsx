"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductCard";
import { CategoryAdminDialog, type CategoryAdminDialogMode } from "@/components/CategoryAdminTools";
import { getAdminRole } from "@/lib/auth";
import { ALL_CATEGORY, NEW_CATEGORY, OFFERS_CATEGORY, categoryNames, displayCategoryNames, finalPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

const sorts = [
  ["new", "الأحدث"],
  ["sold", "الأكثر مبيعاً"],
  ["rating", "الأعلى تقييماً"],
  ["low", "الأقل سعراً"],
  ["high", "الأعلى سعراً"]
] as const;

type SortKey = typeof sorts[number][0];

type ProductLike = Pick<Product, "title" | "description" | "category" | "barcode" | "keywords" | "searchTags" | "dominantColor">;

const colorLabels: Record<string, string> = {
  black: "أسود",
  white: "أبيض",
  gray: "رمادي",
  red: "أحمر",
  blue: "أزرق",
  green: "أخضر",
  orange: "برتقالي",
  pink: "وردي",
  brown: "بني",
  mixed: "مختلط"
};

function colorNameFromRgb(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 45) return "black";
  if (min > 210) return "white";
  if (max - min < 25) return "gray";
  if (r > 180 && g > 120 && b < 90) return "orange";
  if (r > 160 && g < 100 && b < 120) return "red";
  if (r > 150 && b > 150 && g < 130) return "pink";
  if (b > r && b > g) return "blue";
  if (g > r && g > b) return "green";
  if (r > g && g > b) return "brown";
  return "mixed";
}

function colorAliases(name: string) {
  const aliases: Record<string, string[]> = {
    black: ["black", "اسود", "أسود", "كحلي"],
    white: ["white", "ابيض", "أبيض"],
    gray: ["gray", "grey", "رمادي", "رصاصي"],
    red: ["red", "احمر", "أحمر"],
    blue: ["blue", "ازرق", "أزرق", "سماوي"],
    green: ["green", "اخضر", "أخضر"],
    orange: ["orange", "برتقالي"],
    pink: ["pink", "وردي", "زهري"],
    brown: ["brown", "بني", "جلد"],
    mixed: ["mixed", "مختلط"]
  };
  return aliases[name] || [name];
}

function productSearchText(product: ProductLike) {
  return [
    product.title,
    product.description,
    product.category,
    product.barcode,
    product.dominantColor,
    ...(product.keywords || []),
    ...(product.searchTags || [])
  ].join(" ").toLowerCase();
}

function matchProductsByColor<T extends ProductLike>(items: T[], color: string) {
  const aliases = colorAliases(color).map((value) => value.toLowerCase());
  return [...items]
    .map((product) => {
      const text = productSearchText(product);
      const dominant = String(product.dominantColor || "").toLowerCase();
      const score = aliases.reduce((sum, alias) => sum + (text.includes(alias) ? 1 : 0), 0) + (dominant === color ? 3 : 0);
      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

export default function CategoriesPage() {
  const { products, categoryImages, categoryOrder, productsHasMore, loadMoreProducts, t, user } = useStore();
  const [selected, setSelected] = useState(ALL_CATEGORY);
  const [sort, setSort] = useState<SortKey>("new");
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeCategory, setActiveCategory] = useState<{ category: string; mode: CategoryAdminDialogMode } | null>(null);
  const [cameraChoiceOpen, setCameraChoiceOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraMessage, setCameraMessage] = useState("");
  const [visualSearchColor, setVisualSearchColor] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const clickTracker = useRef<{ category: string; count: number; at: number }>({ category: "", count: 0, at: 0 });
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const cameraBrowseInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("category");
    if (value) setSelected(value);
  }, []);

  useEffect(() => {
    let live = true;
    if (!user || user.isAnonymous) { setIsAdmin(false); return; }
    getAdminRole(user.uid).then((role) => { if (live) setIsAdmin(Boolean(role)); }).catch(() => { if (live) setIsAdmin(false); });
    return () => { live = false; };
  }, [user?.uid, user?.isAnonymous]);

  useEffect(() => () => stopCamera(), []);

  const dynamicCategories = useMemo(() => categoryNames(products, categoryOrder, categoryImages), [products, categoryImages, categoryOrder]);
  const cats = useMemo(() => displayCategoryNames([ALL_CATEGORY, OFFERS_CATEGORY, NEW_CATEGORY], dynamicCategories, categoryOrder), [dynamicCategories, categoryOrder]);

  const newestIds = useMemo(() => [...products].sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0)).slice(0, 7).map((p) => p.id), [products]);
  const fixedNewAliases = useMemo(() => new Set([NEW_CATEGORY, "الأحدث", "جديد", "new", "latest", "New", "Latest"]), []);

  const categoryFiltered = products.filter((p) => selected === ALL_CATEGORY ? true : selected === OFFERS_CATEGORY ? (p.discount || 0) > 0 || p.showInFeaturedOffers : selected === NEW_CATEGORY ? newestIds.includes(p.id) || fixedNewAliases.has((p.category || "").trim()) : p.category === selected);
  const filtered = (visualSearchColor ? matchProductsByColor(categoryFiltered, visualSearchColor) : categoryFiltered)
    .filter((p) => productSearchText(p).includes(q.toLowerCase()));

  const shown = [...filtered].sort((a, b) => sort === "sold" ? ((b.soldCount || b.soldQuantity || 0) - (a.soldCount || a.soldQuantity || 0)) : sort === "rating" ? ((b.ratingAverage || 0) - (a.ratingAverage || 0)) : sort === "low" ? (finalPrice(a) - finalPrice(b)) : sort === "high" ? (finalPrice(b) - finalPrice(a)) : ((b.createdAt || 0) - (a.createdAt || 0)));

  function startLongPress(category: string) {
    if (!isAdmin) return;
    longPressTriggered.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setActiveCategory({ category, mode: "edit" });
    }, 650);
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function handleCategoryClick(category: string) {
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    setSelected(category);
    if (!isAdmin) return;
    const now = Date.now();
    const current = clickTracker.current;
    const count = current.category === category && now - current.at < 900 ? current.count + 1 : 1;
    clickTracker.current = { category, count, at: now };
    if (count >= 3) {
      clickTracker.current = { category: "", count: 0, at: 0 };
      setActiveCategory({ category, mode: "move" });
    }
  }

  function analyzeCanvasForColor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return "mixed";
    const width = Math.max(1, canvas.width);
    const height = Math.max(1, canvas.height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    if (!count) return "mixed";
    return colorNameFromRgb(Math.round(r / count), Math.round(g / count), Math.round(b / count));
  }

  async function analyzeImageFile(file?: File) {
    if (!file) return;
    setCameraError("");
    setCameraMessage(t("جاري تحليل الصورة..."));
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image-load-failed")); };
        img.src = url;
      });
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-not-supported");
      ctx.drawImage(image, 0, 0, 40, 40);
      const color = analyzeCanvasForColor(canvas);
      setVisualSearchColor(color);
      setQ("");
      const count = matchProductsByColor(categoryFiltered, color).length;
      setCameraMessage(count ? `${t("تم البحث حسب لون الصورة")}: ${colorLabels[color] || color}` : `${t("لم أجد منتجات مطابقة للون الصورة")}: ${colorLabels[color] || color}`);
    } catch {
      setCameraMessage("");
      setCameraError(t("تعذر تحليل الصورة. جرّب صورة أوضح أو اكتب كلمة البحث يدوياً."));
    } finally {
      if (cameraCaptureInputRef.current) cameraCaptureInputRef.current.value = "";
      if (cameraBrowseInputRef.current) cameraBrowseInputRef.current.value = "";
    }
  }

  async function startLiveCamera() {
    setCameraChoiceOpen(false);
    setCameraError("");
    setCameraMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraCaptureInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 50);
    } catch {
      setCameraError(t("تعذر فتح الكاميرا من المتصفح. يمكنك اختيار صورة من الاستعراض."));
      cameraCaptureInputRef.current?.click();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function captureFromCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const color = analyzeCanvasForColor(canvas);
      setVisualSearchColor(color);
      setQ("");
      const count = matchProductsByColor(categoryFiltered, color).length;
      setCameraMessage(count ? `${t("تم البحث حسب لون الصورة")}: ${colorLabels[color] || color}` : `${t("لم أجد منتجات مطابقة للون الصورة")}: ${colorLabels[color] || color}`);
    }
    stopCamera();
  }

  return <main className="container">
    <PageHeader title={t("الفئات")} />
    <div className="search-bar">
      <button type="button" className="camera-icon camera-button" onClick={() => setCameraChoiceOpen(true)} aria-label={t("فتح الكاميرا للبحث")} title={t("فتح الكاميرا")}>📷</button>
      <input ref={cameraCaptureInputRef} type="file" accept="image/*" capture="environment" className="camera-file-input" onChange={(e) => analyzeImageFile(e.target.files?.[0])} />
      <input ref={cameraBrowseInputRef} type="file" accept="image/*" className="camera-file-input" onChange={(e) => analyzeImageFile(e.target.files?.[0])} />
      <input className="search-input" placeholder={t("إبحث عن منتج...")} value={q} onChange={(e) => { setVisualSearchColor(""); setCameraMessage(""); setQ(e.target.value); }} />
    </div>
    {cameraError ? <p className="error">{cameraError}</p> : null}
    {cameraMessage ? <p className="success">{cameraMessage}</p> : null}
    <div className="sticky-tabs">{cats.map((c, index) => <button
      key={`${c}-${index}`}
      className={selected === c ? "active" : ""}
      onMouseDown={() => startLongPress(c)}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
      onTouchStart={() => startLongPress(c)}
      onTouchEnd={clearLongPress}
      onContextMenu={(e) => { if (isAdmin) { e.preventDefault(); setActiveCategory({ category: c, mode: "edit" }); } }}
      onClick={() => handleCategoryClick(c)}
      title={isAdmin ? t("ضغطة مطولة للتعديل، ثلاث ضغطات للتحريك") : undefined}
    >{c}</button>)}</div>
    <div className="tabs">{sorts.map(([k, l]) => <button key={k} className={sort === k ? "active" : ""} onClick={() => setSort(k)}>{t(l)}</button>)}</div>
    <ProductGrid products={shown} />
    {productsHasMore ? <button className="btn full wide" onClick={loadMoreProducts}>{t("loadMore")}</button> : null}

    {cameraChoiceOpen ? <div className="modal-backdrop" onMouseDown={() => setCameraChoiceOpen(false)}>
      <section className="modal-card small-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{t("بحث بالكاميرا")}</h2>
        <button type="button" className="btn full" onClick={startLiveCamera}>{t("فتح الكاميرا مباشرة")}</button>
        <button type="button" className="btn ghost full" onClick={() => { setCameraChoiceOpen(false); cameraBrowseInputRef.current?.click(); }}>{t("اختيار صورة من الجهاز")}</button>
        <button type="button" className="btn ghost full" onClick={() => setCameraChoiceOpen(false)}>{t("إلغاء")}</button>
      </section>
    </div> : null}

    {cameraOpen ? <div className="modal-backdrop" onMouseDown={stopCamera}>
      <section className="modal-card camera-modal" onMouseDown={(e) => e.stopPropagation()}>
        <video ref={videoRef} playsInline muted className="camera-preview" />
        <canvas ref={canvasRef} className="camera-canvas" />
        <div className="category-move-actions">
          <button type="button" className="btn" onClick={captureFromCamera}>{t("التقاط")}</button>
          <button type="button" className="btn ghost" onClick={stopCamera}>{t("إغلاق")}</button>
        </div>
      </section>
    </div> : null}

    {activeCategory ? <CategoryAdminDialog category={activeCategory.category} mode={activeCategory.mode} categories={cats} categoryImages={categoryImages} onClose={() => setActiveCategory(null)} /> : null}
  </main>;
}
