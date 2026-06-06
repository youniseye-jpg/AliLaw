"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductCard";
import { CategoryAdminDialog, type CategoryAdminDialogMode } from "@/components/CategoryAdminTools";
import { getAdminRole } from "@/lib/auth";
import { saveHomeCustomSection } from "@/lib/firestore";
import { ALL_CATEGORY, NEW_CATEGORY, OFFERS_CATEGORY, categoryNames, displayCategoryNames, fixedSectionTitle, fixedSectionVisible, normalizeImageUrl, sectionTitle, sectionVisible } from "@/lib/utils";

const fixedHomeSections = [
  { field: "showInTrendingNow", fallbackTitle: "الرائج الآن", empty: "لا توجد منتجات في هذا القسم", productFilter: (p: any) => Boolean(p.showInTrendingNow), orderField: "trendingNowOrder" },
  { field: "showInFeaturedOffers", fallbackTitle: "عروض مميزة", empty: "لا توجد عروض حالياً", productFilter: (p: any) => Boolean(p.showInFeaturedOffers || (p.discount || 0) > 0), orderField: "featuredOffersOrder" },
  { field: "showInHomeSelected", fallbackTitle: "منتجات مختارة", empty: "لا توجد منتجات مختارة", productFilter: (p: any) => Boolean(p.showInHomeSelected), orderField: "homeSelectedOrder" }
] as const;

type ProductLike = {
  title?: string;
  description?: string;
  category?: string;
  barcode?: string;
  keywords?: string[];
  searchTags?: string[];
  dominantColor?: string;
};

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

export default function HomePage() {
  const router = useRouter();
  const { identity, banners, products, customSections, homeFixedSections, categoryImages, categoryOrder, user, features, t, productsHasMore, loadMoreProducts } = useStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [q, setQ] = useState("");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [cameraChoiceOpen, setCameraChoiceOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraMessage, setCameraMessage] = useState("");
  const [visualSearchColor, setVisualSearchColor] = useState("");
  const [activeCategory, setActiveCategory] = useState<{ category: string; mode: CategoryAdminDialogMode } | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const cameraBrowseInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let live = true;
    if (!user || user.isAnonymous) { setIsAdmin(false); return; }
    getAdminRole(user.uid).then((r) => { if (live) setIsAdmin(Boolean(r)); }).catch(() => setIsAdmin(false));
    return () => { live = false; };
  }, [user]);

  useEffect(() => {
    if (!features.autoBanners || features.bannerSpeed === "static" || banners.length <= 1) return;
    const delay: Record<string, number> = { slow: 5200, normal: 3200, medium: 3200, fast: 1500, intermittent: 2600, speed1: 6000, speed2: 4500, speed3: 3200, speed4: 2200, speed5: 1400 };
    const timer = setInterval(() => setBannerIndex((current) => (current + 1) % banners.length), delay[features.bannerSpeed || "intermittent"] || 2600);
    return () => clearInterval(timer);
  }, [features.autoBanners, features.bannerSpeed, banners.length]);

  useEffect(() => {
    const el = bannerRef.current;
    const child = el?.children.item(bannerIndex) as HTMLElement | null;
    if (!el || !child) return;
    const target = child.offsetLeft - Math.max((el.clientWidth - child.clientWidth) / 2, 0);
    el.scrollTo({ left: target, behavior: "smooth" });
  }, [bannerIndex, banners.length]);

  useEffect(() => () => stopCamera(), []);

  const storeName = identity.storeName || identity.appName || "MATGER";
  const logo = normalizeImageUrl(identity.storeLogoUrl || identity.logoUrl);
  const realCategories = categoryNames(products, categoryOrder, categoryImages);
  const homeCategories = displayCategoryNames([ALL_CATEGORY, OFFERS_CATEGORY, NEW_CATEGORY], realCategories, categoryOrder);
  const searched = useMemo(() => {
    if (visualSearchColor) return matchProductsByColor(products, visualSearchColor);
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => productSearchText(p).includes(query));
  }, [products, q, visualSearchColor]);
  const custom = useMemo(() => customSections.filter(sectionVisible), [customSections]);
  const hasActiveSearch = Boolean(q.trim() || visualSearchColor);

  function categoryImage(name: string) {
    if (normalizeImageUrl(categoryImages[name])) return normalizeImageUrl(categoryImages[name]);
    if (name === ALL_CATEGORY) return logo || normalizeImageUrl(products.find((p) => p.imageUrl)?.imageUrl);
    if (name === OFFERS_CATEGORY) return normalizeImageUrl(products.find((p) => (p.discount || 0) > 0 || p.showInFeaturedOffers)?.imageUrl);
    if (name === NEW_CATEGORY) return normalizeImageUrl([...products].sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0)).find((p) => p.imageUrl)?.imageUrl);
    return normalizeImageUrl(products.find((p) => p.category === name && p.imageUrl)?.imageUrl);
  }

  function categoryHref(name: string) {
    return `/categories?category=${encodeURIComponent(name)}`;
  }

  function startLongPress(category: string) {
    if (!isAdmin) return;
    setLongPressTriggered(false);
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      setActiveCategory({ category, mode: "edit" });
    }, 650);
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function openCategory(category: string) {
    if (longPressTriggered) { setLongPressTriggered(false); return; }
    router.push(categoryHref(category));
  }

  function openCameraSearch() {
    setCameraChoiceOpen(true);
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
    setCameraMessage("جاري تحليل الصورة...");
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
      setQ(colorLabels[color] || color);
      const count = matchProductsByColor(products, color).length;
      setCameraMessage(count ? `تم البحث حسب لون الصورة: ${colorLabels[color] || color}` : `لم أجد منتجات مطابقة للون الصورة: ${colorLabels[color] || color}`);
    } catch {
      setCameraMessage("");
      setCameraError("تعذر تحليل الصورة. جرّب صورة أوضح أو اكتب كلمة البحث يدوياً.");
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
      setCameraError("تعذر فتح الكاميرا من المتصفح. يمكنك اختيار صورة من الاستعراض.");
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
      setQ(colorLabels[color] || color);
      const count = matchProductsByColor(products, color).length;
      setCameraMessage(count ? `تم البحث حسب لون الصورة: ${colorLabels[color] || color}` : `لم أجد منتجات مطابقة للون الصورة: ${colorLabels[color] || color}`);
    }
    stopCamera();
  }

  async function addSection() {
    const title = prompt("اسم القسم الجديد");
    if (title?.trim()) await saveHomeCustomSection({ title: title.trim(), isVisible: true, visible: true, productIds: [] });
  }

  return <main className="container">
    <PageHeader title={storeName} actions={isAdmin ? <Link className="btn small" href="/admin/products/new">+</Link> : null} />

    {features.homeBanners !== false && banners.length ? <div className="banner-strip" ref={bannerRef}>
      {banners.map((b) => <Link className="banner" key={b.id} href={b.type === "product" && b.targetProductId ? `/product/${b.targetProductId}` : b.type === "category" && b.targetCategory ? `/categories?category=${encodeURIComponent(b.targetCategory)}` : b.externalUrl || b.targetUrl || "#"}>{b.imageUrl ? <img src={normalizeImageUrl(b.imageUrl)} alt={b.title || "banner"} /> : null}<span>{b.title || "عرض"}</span></Link>)}
    </div> : <section className="hero"><div><h1>{storeName}</h1><p>متصل بنفس Firebase للتطبيق.</p><Link className="btn" href="/categories">تصفح المنتجات</Link></div>{logo ? <img src={logo} alt={storeName} className="hero-logo" /> : <div className="hero-logo brand-mark">M</div>}</section>}

    <div className="search-bar">
      <button type="button" className="camera-icon camera-button" onClick={openCameraSearch} aria-label="فتح الكاميرا للبحث" title="فتح الكاميرا">📷</button>
      <input ref={cameraCaptureInputRef} type="file" accept="image/*" capture="environment" className="camera-file-input" onChange={(e) => analyzeImageFile(e.target.files?.[0])} />
      <input ref={cameraBrowseInputRef} type="file" accept="image/*" className="camera-file-input" onChange={(e) => analyzeImageFile(e.target.files?.[0])} />
      <input className="search-input" placeholder={t("search")} value={q} onChange={(e) => { setVisualSearchColor(""); setCameraMessage(""); setQ(e.target.value); }} />
    </div>
    {cameraError ? <p className="error">{cameraError}</p> : null}
    {cameraMessage ? <p className="success">{cameraMessage}</p> : null}

    {hasActiveSearch ? <section>
      <PageHeader title={visualSearchColor ? "نتائج البحث بالكاميرا" : "نتائج البحث"} />
      <ProductGrid products={searched.slice(0, 30)} empty="لا توجد نتائج مطابقة" />
    </section> : null}

    <PageHeader title={t("categories")} />
    <div className="category-row">{homeCategories.map((c, index) => <button
      type="button"
      key={`${c}-${index}`}
      className="category-card category-button-card"
      onMouseDown={() => startLongPress(c)}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
      onTouchStart={() => startLongPress(c)}
      onTouchEnd={clearLongPress}
      onContextMenu={(e) => { if (isAdmin) { e.preventDefault(); setActiveCategory({ category: c, mode: "edit" }); } }}
      onClick={() => openCategory(c)}
    >{categoryImage(c) ? <img src={categoryImage(c)} alt={c} /> : <div className="image-placeholder" style={{ height: 100 }}>فئة</div>}<strong>{c}</strong></button>)}</div>

    {fixedHomeSections.map((section) => {
      if (!fixedSectionVisible(homeFixedSections, section.field)) return null;
      const list = searched.filter(section.productFilter).sort((a: any, b: any) => ((a[section.orderField] ?? 9999) - (b[section.orderField] ?? 9999)) || ((b.createdAt || 0) - (a.createdAt || 0)));
      return <section key={section.field}><PageHeader title={fixedSectionTitle(homeFixedSections, section.field, section.fallbackTitle)} actions={isAdmin ? <Link className="btn small" href={`/admin/home?fixed=${section.field}`}>+</Link> : null} /><ProductGrid products={list.slice(0, 8)} empty={section.empty} /></section>;
    })}

    {custom.map((section) => {
      const ids = section.productIds || [];
      const sectionProducts = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products;
      return <section key={section.id}><PageHeader title={sectionTitle(section)} actions={isAdmin ? <Link className="btn small" href={`/admin/home?section=${encodeURIComponent(section.id)}`}>+</Link> : null} /><ProductGrid products={sectionProducts} empty="هذا القسم فارغ" /></section>;
    })}
    {productsHasMore ? <button className="btn full wide" onClick={loadMoreProducts}>{t("loadMore")}</button> : null}
    {isAdmin ? <button className="btn full wide" onClick={addSection}>إضافة قسم جديد</button> : null}

    {cameraChoiceOpen ? <div className="modal-backdrop" onMouseDown={() => setCameraChoiceOpen(false)}>
      <section className="modal-card small-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>بحث بالكاميرا</h2>
        <button type="button" className="btn full" onClick={startLiveCamera}>فتح الكاميرا مباشرة</button>
        <button type="button" className="btn ghost full" onClick={() => { setCameraChoiceOpen(false); cameraBrowseInputRef.current?.click(); }}>اختيار صورة من الجهاز</button>
        <button type="button" className="btn ghost full" onClick={() => setCameraChoiceOpen(false)}>إلغاء</button>
      </section>
    </div> : null}

    {cameraOpen ? <div className="modal-backdrop" onMouseDown={stopCamera}>
      <section className="modal-card camera-modal" onMouseDown={(e) => e.stopPropagation()}>
        <video ref={videoRef} playsInline muted className="camera-preview" />
        <canvas ref={canvasRef} className="camera-canvas" />
        <div className="category-move-actions">
          <button type="button" className="btn" onClick={captureFromCamera}>التقاط</button>
          <button type="button" className="btn ghost" onClick={stopCamera}>إغلاق</button>
        </div>
      </section>
    </div> : null}

    {activeCategory ? <CategoryAdminDialog category={activeCategory.category} mode={activeCategory.mode} categories={homeCategories} categoryImages={categoryImages} onClose={() => setActiveCategory(null)} /> : null}
  </main>;
}
