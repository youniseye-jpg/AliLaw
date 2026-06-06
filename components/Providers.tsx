"use client";

import { ensureAnonymous, onAuth } from "@/lib/auth";
import { hasFirebaseConfig } from "@/lib/firebase";
import type { AppIdentity, BannerItem, FeatureToggles, HomeCustomSection, HomeFixedSectionsConfig, Product, StoreContact, StoreTheme } from "@/lib/types";
import { cartTotals } from "@/lib/utils";
import { fetchMoreProducts, listenBanners, listenDoc, listenHomeCustomSections, listenProducts, mirrorLocalState } from "@/lib/firestore";
import type { User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getDirection, getLocaleCode, t as translateKey, translateText, type LocaleCode } from "@/lib/i18n";

export type CartLine = { product: Product; quantity: number };

type StoreContextType = {
  user: User | null;
  authReady: boolean;
  products: Product[];
  productsHasMore: boolean;
  loadMoreProducts: () => Promise<void>;
  banners: BannerItem[];
  customSections: HomeCustomSection[];
  homeFixedSections: HomeFixedSectionsConfig;
  identity: AppIdentity;
  theme: StoreTheme;
  features: FeatureToggles;
  contact: StoreContact;
  categoryImages: Record<string, string>;
  categoryOrder: Record<string, number>;
  language: string;
  setLocalLanguage: (language: string) => void;
  darkMode: boolean;
  setLocalDarkMode: (dark: boolean) => void;
  t: (key: string) => string;
  favorites: string[];
  cart: CartLine[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  cartCount: number;
  cartTotals: ReturnType<typeof cartTotals>;
};

const StoreContext = createContext<StoreContextType | null>(null);

const CART_KEY = "matger_web_cart";
const FAVORITES_KEY = "matger_web_favorites";
const DARK_KEY = "matger_dark";
const LANG_KEY = "matger_lang";

function localeCode(language?: string): LocaleCode {
  return getLocaleCode(language);
}

const textOriginals = new WeakMap<Text, string>();

function translatedAttributeName(attr: string) {
  return `data-i18n-original-${attr.replace(/[^a-z0-9_-]/gi, "-")}`;
}

function applyDomTranslations(locale: LocaleCode) {
  if (typeof document === "undefined" || !document.body) return;

  const shouldSkipElement = (element: Element | null) => {
    if (!element) return true;
    return Boolean(element.closest("[data-no-i18n], [data-dynamic-content]"));
  };

  const applyTextNode = (node: Node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (!parent || shouldSkipElement(parent) || ["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) return;
    const current = textNode.textContent || "";
    const original = textOriginals.get(textNode) || current;
    textOriginals.set(textNode, original);
    const nextFromOriginal = translateText(original, locale);
    const nextFromCurrent = translateText(current, locale);
    const nextText = nextFromOriginal !== original ? nextFromOriginal : nextFromCurrent;
    if (textNode.textContent !== nextText) textNode.textContent = nextText;
  };

  const applyElementAttributes = (element: Element) => {
    if (!(element instanceof HTMLElement) || shouldSkipElement(element)) return;
    (["placeholder", "title", "aria-label"] as const).forEach((attr) => {
      const current = element.getAttribute(attr);
      if (!current) return;
      const dataKey = translatedAttributeName(attr);
      const original = element.getAttribute(dataKey) || current;
      element.setAttribute(dataKey, original);
      const nextFromOriginal = translateText(original, locale);
      const nextFromCurrent = translateText(current, locale);
      const nextValue = nextFromOriginal !== original ? nextFromOriginal : nextFromCurrent;
      if (element.getAttribute(attr) !== nextValue) element.setAttribute(attr, nextValue);
    });
  };

  const walk = () => {
    document.body.querySelectorAll("*:not(script):not(style)").forEach((element) => {
      applyElementAttributes(element);
      element.childNodes.forEach(applyTextNode);
    });
  };

  walk();
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}
function saveJson(key: string, value: unknown) { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value)); }

function normalizeAndroidBannerSpeed(mode?: string) {
  const map: Record<string, string> = { speed1: "slow", speed2: "slow", speed3: "normal", speed4: "intermittent", speed5: "fast", stopped: "static" };
  return mode ? map[mode] || mode : "";
}

function normalizeFeatures(data: Partial<FeatureToggles> | null | undefined): FeatureToggles {
  const f = data || {};
  return {
    purchaseWithoutAccount: true,
    flashOffers: f.flashOffers ?? f.flashOffersEnabled ?? true,
    relatedProducts: f.relatedProducts ?? f.relatedProductsEnabled ?? true,
    ratings: f.ratings ?? f.ratingsEnabled ?? f.productRatings ?? f.productReviews ?? true,
    homeBanners: f.homeBanners ?? f.bannersEnabled ?? true,
    autoBanners: f.autoBanners ?? f.autoBannersEnabled ?? f.bannersAutoScrollEnabled ?? true,
    bannerSpeed: f.bannerSpeed || normalizeAndroidBannerSpeed(f.bannerSpeedMode) || "intermittent",
    visualSearch: f.visualSearch ?? f.visualSearchEnabled ?? true,
    internalChat: f.internalChat ?? f.internalChatEnabled ?? f.chatEnabled ?? true,
    sideCategories: f.sideCategories ?? f.sideCategoriesEnabled ?? false
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsHasMore, setProductsHasMore] = useState(true);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [customSections, setCustomSections] = useState<HomeCustomSection[]>([]);
  const [homeFixedSections, setHomeFixedSections] = useState<HomeFixedSectionsConfig>({});
  const [identity, setIdentity] = useState<AppIdentity>({ storeName: "MATGER" });
  const [theme, setTheme] = useState<StoreTheme>({ primaryColor: "#EF6C00", accentColor: "#EF6C00" });
  const [features, setFeatures] = useState<FeatureToggles>(normalizeFeatures({}));
  const [contact, setContact] = useState<StoreContact>({});
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [categoryOrder, setCategoryOrder] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [language, setLanguage] = useState("العربية");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!hasFirebaseConfig()) return;
    const unsub = onAuth(async (u) => {
      if (!u) { try { const anonymous = await ensureAnonymous(); setUser(anonymous); } finally { setAuthReady(true); } }
      else { setUser(u); setAuthReady(true); }
    });
    return unsub;
  }, []);

  useEffect(() => {
    setCart(loadJson<CartLine[]>(CART_KEY, []));
    setFavorites(loadJson<string[]>(FAVORITES_KEY, []));
    setDarkMode(localStorage.getItem(DARK_KEY) === "1");
    setLanguage(localStorage.getItem(LANG_KEY) || "العربية");
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig()) return;
    const unsubs = [
      listenProducts((items) => { setProducts(items); setProductsHasMore(items.length >= 20); }),
      listenBanners(setBanners),
      listenHomeCustomSections(setCustomSections),
      listenDoc<HomeFixedSectionsConfig>("config", "home_section_settings", (data) => setHomeFixedSections(data || {})),
      listenDoc<AppIdentity>("public_config", "appIdentity", (data) => setIdentity((current) => ({ ...current, ...(data || {}) }))),
      listenDoc<AppIdentity>("appSettings", "appIdentity", (data) => setIdentity((current) => ({ ...current, ...(data || {}) }))),
      listenDoc<AppIdentity>("public_config", "splash", (data) => setIdentity((current) => ({ ...current, ...(data || {}) }))),
      listenDoc<StoreTheme>("public_config", "theme", (data) => {
        if (!data) return;
        setTheme((current) => ({ ...current, ...data }));
        if (!localStorage.getItem(DARK_KEY) && typeof data.darkMode === "boolean") setDarkMode(Boolean(data.darkMode));
        if (!localStorage.getItem(LANG_KEY) && data.language) setLanguage(data.language);
      }),
      listenDoc<StoreTheme>("config", "product_color_system", (data) => setTheme((current) => ({ ...current, ...(data || {}) }))),
      listenDoc<FeatureToggles>("appSettings", "featureToggles", (data) => setFeatures((current) => ({ ...current, ...normalizeFeatures(data) }))),
      listenDoc<FeatureToggles>("config", "feature_toggles", (data) => { if (data) setFeatures((current) => ({ ...current, ...normalizeFeatures(data) })); }),
      listenDoc<StoreContact>("config", "store_contact", (data) => setContact(data || {})),
      listenDoc<Record<string, string>>("config", "category_images", (data) => setCategoryImages((data || {}) as Record<string, string>)),
      listenDoc<Record<string, number>>("config", "category_order", (data) => setCategoryOrder((data || {}) as Record<string, number>))
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    const code = localeCode(language);
    document.documentElement.lang = code;
    document.documentElement.dir = getDirection(code);
    document.title = identity.storeName || identity.appName || "MATGER";
    const icon = identity.externalAppImageUrl || identity.storeLogoUrl || identity.logoUrl || identity.splashLogoUrl;
    if (icon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = icon;
    }
  }, [darkMode, language, identity]);

  const activeLocale = localeCode(language);
  const translationFrame = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const run = () => { applyDomTranslations(activeLocale); };
    run();
    const timers = [50, 200, 600, 1200].map((ms) => window.setTimeout(run, ms));
    const observer = new MutationObserver(() => {
      if (translationFrame.current) window.cancelAnimationFrame(translationFrame.current);
      translationFrame.current = window.requestAnimationFrame(run);
    });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      if (translationFrame.current) window.cancelAnimationFrame(translationFrame.current);
    };
  }, [activeLocale]);

  async function loadMoreProducts() {
    const lastCreatedAt = products.length ? Number(products[products.length - 1]?.createdAt || 0) : 0;
    const more = await fetchMoreProducts(lastCreatedAt, 20);
    setProducts((current) => {
      const map = new Map(current.map((p) => [p.id, p]));
      more.forEach((p) => map.set(p.id, p));
      return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
    setProductsHasMore(more.length >= 20);
  }

  const addToCart = (product: Product, quantity = 1) => {
    setCart((current) => {
      const exists = current.find((item) => item.product.id === product.id);
      const next = exists ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { product, quantity }];
      saveJson(CART_KEY, next);
      if (user?.uid) mirrorLocalState(user.uid, "cart", product.id, { productId: product.id, quantity: next.find((x) => x.product.id === product.id)?.quantity || quantity }).catch(() => undefined);
      return next;
    });
  };
  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart((current) => {
      const next = quantity <= 0 ? current.filter((item) => item.product.id !== productId) : current.map((item) => item.product.id === productId ? { ...item, quantity } : item);
      saveJson(CART_KEY, next);
      if (user?.uid) mirrorLocalState(user.uid, "cart", productId, { productId, quantity }).catch(() => undefined);
      return next;
    });
  };
  const removeFromCart = (productId: string) => updateCartQuantity(productId, 0);
  const clearCart = () => { setCart([]); saveJson(CART_KEY, []); };
  const toggleFavorite = (product: Product) => {
    setFavorites((current) => {
      const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id];
      saveJson(FAVORITES_KEY, next);
      if (user?.uid) mirrorLocalState(user.uid, "favorites", product.id, { productId: product.id, title: product.title || "", imageUrl: product.imageUrl || "" }).catch(() => undefined);
      return next;
    });
  };
  const setLocalLanguage = (l: string) => { setLanguage(l); localStorage.setItem(LANG_KEY, l); };
  const setLocalDarkMode = (dark: boolean) => { setDarkMode(dark); localStorage.setItem(DARK_KEY, dark ? "1" : "0"); };
  const primary = typeof theme.primaryColor === "string" && theme.primaryColor.startsWith("#") ? theme.primaryColor : "#EF6C00";
  const langCode = localeCode(language);
  const value = useMemo<StoreContextType>(() => ({
    user, authReady, products, productsHasMore, loadMoreProducts, banners, customSections, homeFixedSections, identity, theme, features, contact, categoryImages, categoryOrder, language, setLocalLanguage, darkMode, setLocalDarkMode,
    t: (key: string) => translateText(key, langCode),
    favorites, cart, addToCart, updateCartQuantity, removeFromCart, clearCart, toggleFavorite, isFavorite: (id: string) => favorites.includes(id), cartCount: cart.reduce((sum, item) => sum + item.quantity, 0), cartTotals: cartTotals(cart)
  }), [user, authReady, products, productsHasMore, loadMoreProducts, banners, customSections, homeFixedSections, identity, theme, features, contact, categoryImages, categoryOrder, language, darkMode, langCode, favorites, cart]);

  return <StoreContext.Provider value={value}><div style={{ ["--primary" as string]: primary, ["--accent" as string]: theme.accentColor || primary }}>{children}<SplashOverlay identity={identity} /></div></StoreContext.Provider>;
}

function SplashOverlay({ identity }: { identity: AppIdentity }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("matger_splash_done") === "1") return;
    const duration = Number(identity.splashDurationMs || identity.durationMs || 3000);
    if (identity.splashText || identity.splashSubtitle || identity.splashBackgroundUrl || identity.backgroundUrl || identity.splashLogoUrl || identity.storeLogoUrl) {
      setShow(true);
      const t = setTimeout(() => { setShow(false); sessionStorage.setItem("matger_splash_done", "1"); }, Math.max(800, duration));
      return () => clearTimeout(t);
    }
  }, [identity]);
  if (!show) return null;
  const bg = identity.splashBackgroundUrl || identity.backgroundUrl;
  const logo = identity.splashLogoUrl || identity.storeLogoUrl || identity.logoUrl;
  return <div className="splash-screen" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>{logo ? <img src={logo} alt="logo" /> : <div className="splash-mark">M</div>}<h1>{identity.storeName || identity.appName || "MATGER"}</h1><p>{identity.splashText || identity.splashSubtitle || identity.splashTitle || ""}</p></div>;
}

export function useStore() { const ctx = useContext(StoreContext); if (!ctx) throw new Error("useStore must be used inside Providers"); return ctx; }
