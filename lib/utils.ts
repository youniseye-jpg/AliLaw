import type { HomeCustomSection, HomeFixedSectionsConfig, Order, OrderItem, Product } from "@/lib/types";

export const CHAT_COLLECTION = "chatConversations";

export const ALL_CATEGORY = "الكل";
export const OFFERS_CATEGORY = "العروض";
export const NEW_CATEGORY = "جديد";
export const SPECIAL_CATEGORY_NAMES = [ALL_CATEGORY, OFFERS_CATEGORY, NEW_CATEGORY] as const;
const SPECIAL_CATEGORY_ALIASES = new Set([ALL_CATEGORY, OFFERS_CATEGORY, NEW_CATEGORY, "الأحدث", "new", "latest", "New", "Latest"]);

export function isSpecialCategory(name: string) {
  return SPECIAL_CATEGORY_ALIASES.has(name.trim());
}

export function nowMs() {
  return Date.now();
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function normalizeImageUrl(input?: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  const html = raw.match(/src=["']([^"']+)["']/i);
  if (html?.[1]) return html[1].trim();
  const md = raw.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (md?.[1]) return md[1].trim();
  const bb = raw.match(/\[img\]([^[]+)\[\/img\]/i);
  if (bb?.[1]) return bb[1].trim();
  const direct = raw.match(/https?:\/\/[^\s"'<>\]]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>\]]*)?/i);
  if (direct) return direct[0].replace(/\?.*thumb.*$/i, "");
  const anyUrl = raw.match(/https?:\/\/[^\s"'<>\]]+/i);
  return anyUrl ? anyUrl[0] : raw;
}


export function productAspectRatio(key?: string, custom?: string) {
  const map: Record<string, string> = {
    square_1_1: "1 / 1", portrait_3_4: "3 / 4", wide_16_9: "16 / 9", classic_4_3: "4 / 3", tall_2_3: "2 / 3", wide_21_9: "21 / 9", vertical_9_16: "9 / 16", product_5_4: "5 / 4", banner_3_1: "3 / 1", free: "auto"
  };
  if (key === "custom" && custom) return custom.replace(":", " / ");
  return map[key || "square_1_1"] || "1 / 1";
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "").trim();
}

export function customerOwnerFields(uid: string) {
  return {
    customerUid: uid,
    userUid: uid,
    uid,
    userId: uid,
    ownerUid: uid
  };
}

export function isPurchasable(status?: string) {
  const clean = (status || "available").toLowerCase().replace(/\s+/g, "_");
  return clean === "available" || clean === "available_product" || clean === "متاح";
}

export function effectiveSold(product: Product) {
  return Math.max(asNumber(product.soldQuantity), asNumber(product.soldCount), 0);
}

export function effectiveTotal(product: Product) {
  const total = asNumber(product.totalQuantity);
  if (total > 0) return total;
  const visible = Math.max(asNumber(product.stockQuantity), asNumber(product.quantity), 0);
  const sold = effectiveSold(product);
  if (visible <= 0) return 0;
  return sold > 0 && visible < sold ? visible + sold : visible;
}

export function effectiveStock(product: Product) {
  return Math.max(effectiveTotal(product) - effectiveSold(product), 0);
}

export function discountedPrice(product: Product) {
  const price = asNumber(product.price);
  const discount = Math.max(asNumber(product.discount), 0);
  return Math.max(price - price * discount / 100, 0);
}

function normalizeFlashEnd(raw: number, product: Product, now = nowMs()) {
  if (raw <= 0) return 0;
  if (raw >= 1 && raw <= 72) return now + raw * 60 * 60 * 1000;
  if (raw >= 73 && raw <= 10080) return now + raw * 60 * 1000;
  if (raw >= 1_000_000_000 && raw <= 9_999_999_999) return raw * 1000;
  if (raw < 946_684_800_000) {
    const base = Math.max(asNumber(product.flashStartAt), asNumber(product.updatedAt), asNumber(product.createdAt), now);
    const fromBase = base + raw;
    return fromBase > now ? fromBase : now + raw;
  }
  return raw;
}

export function hasActiveFlash(product: Product) {
  const enabled = Boolean(product.flashOfferEnabled || product.flashOffersEnabled);
  const flashPrice = asNumber(product.flashPrice);
  const endRaw = asNumber(product.flashEndAt) || asNumber(product.flashSaleEndTime);
  const start = asNumber(product.flashStartAt);
  const now = nowMs();
  const end = normalizeFlashEnd(endRaw, product, now);
  return enabled && flashPrice > 0 && end > now && (!start || start <= now);
}

export function finalPrice(product: Product) {
  return hasActiveFlash(product) ? asNumber(product.flashPrice) : discountedPrice(product);
}

export function currency(productOrItem?: Product | OrderItem) {
  return (productOrItem?.currency || "USD").trim() || "USD";
}

export function money(amount?: number, cur = "USD") {
  const n = asNumber(amount);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`;
}

export function orderTotal(order: Order) {
  if (order.totalByCurrency && Object.keys(order.totalByCurrency).length) {
    return Object.entries(order.totalByCurrency).map(([cur, total]) => money(Number(total), cur)).join(" + ");
  }
  return money(order.total ?? order.totalPrice ?? order.totalAfterCoupon ?? 0, "");
}

export function cartTotals(items: Array<{ product: Product; quantity: number }>) {
  const totals: Record<string, number> = {};
  const originals: Record<string, number> = {};
  const savings: Record<string, number> = {};
  for (const item of items) {
    const cur = currency(item.product);
    const original = asNumber(item.product.price) * item.quantity;
    const final = finalPrice(item.product) * item.quantity;
    originals[cur] = (originals[cur] || 0) + original;
    totals[cur] = (totals[cur] || 0) + final;
    savings[cur] = (savings[cur] || 0) + Math.max(original - final, 0);
  }
  return { totals, originals, savings };
}

export function totalsText(totals: Record<string, number>) {
  const entries = Object.entries(totals);
  if (!entries.length) return "0";
  return entries.map(([cur, total]) => money(total, cur)).join(" + ");
}

export function orderNumber() {
  const d = new Date();
  return `MTG-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

export function dateText(ms?: number, locale?: string) {
  if (!ms) return "";
  return new Date(ms).toLocaleString(locale || undefined);
}

export type Translator = (key: string) => string;
export type ExportOptions = {
  t?: Translator;
  lang?: string;
  dir?: "rtl" | "ltr";
};


const EXPORT_TRANSLATIONS: Record<string, Record<string, string>> = {
  ar: {
    "فاتورة": "فاتورة", "تفاصيل الفاتورة": "تفاصيل الفاتورة", "رقم الطلب": "رقم الطلب", "الزبون": "الزبون", "العميل": "العميل", "الهاتف": "الهاتف", "العنوان": "العنوان", "الحالة": "الحالة", "المنتج": "المنتج", "اسم المنتج": "اسم المنتج", "الكمية": "الكمية", "السعر": "السعر", "الخصم": "الخصم", "المجموع": "المجموع", "المطلوب دفعه": "المطلوب دفعه", "التاريخ": "التاريخ", "المعالجة": "المعالجة", "تقرير المبيعات": "تقرير المبيعات", "تصدير كل الطلبات": "تصدير كل الطلبات", "تصدير طلبات اليوم": "تصدير طلبات اليوم", "تصدير الطلبات المقبولة فقط": "تصدير الطلبات المقبولة فقط", "تصدير الطلبات المكتملة فقط": "تصدير الطلبات المكتملة فقط", "تصدير الطلبات المرفوضة": "تصدير الطلبات المرفوضة", "تصدير الطلبات الملغية": "تصدير الطلبات الملغية", "تصدير طلبات قيد التوصيل": "تصدير طلبات قيد التوصيل", "تقرير المنتجات الكامل": "تقرير المنتجات الكامل", "إجمالي المنتجات": "إجمالي المنتجات", "الفئة": "الفئة", "الوصف": "الوصف", "الإجمالي": "الإجمالي", "المباع": "المباع", "المتبقي": "المتبقي", "المخزون": "المخزون", "الباركود": "الباركود", "رابط الصورة": "رابط الصورة", "العملة": "العملة", "تقرير المخزون": "تقرير المخزون", "مراقبة المخزون": "مراقبة المخزون", "قيد الانتظار": "قيد الانتظار", "مقبول": "مقبول", "مرفوض": "مرفوض", "قيد التوصيل": "قيد التوصيل", "مكتمل": "مكتمل", "ملغي": "ملغي", "متاح": "متاح", "غير متاح": "غير متاح", "قريباً": "قريباً", "نفدت الكمية": "نفدت الكمية", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  en: {
    "فاتورة": "Invoice", "تفاصيل الفاتورة": "Invoice details", "رقم الطلب": "Order number", "الزبون": "Customer", "العميل": "Customer", "الهاتف": "Phone", "العنوان": "Address", "الحالة": "Status", "المنتج": "Product", "اسم المنتج": "Product name", "الكمية": "Quantity", "السعر": "Price", "الخصم": "Discount", "المجموع": "Total", "المطلوب دفعه": "Amount due", "التاريخ": "Date", "المعالجة": "Processed", "تقرير المبيعات": "Sales report", "تصدير كل الطلبات": "Export all orders", "تصدير طلبات اليوم": "Export today's orders", "تصدير الطلبات المقبولة فقط": "Export accepted orders only", "تصدير الطلبات المكتملة فقط": "Export completed orders only", "تصدير الطلبات المرفوضة": "Export rejected orders", "تصدير الطلبات الملغية": "Export cancelled orders", "تصدير طلبات قيد التوصيل": "Export delivering orders", "تقرير المنتجات الكامل": "Full products report", "إجمالي المنتجات": "Total products", "الفئة": "Category", "الوصف": "Description", "الإجمالي": "Total", "المباع": "Sold", "المتبقي": "Remaining", "المخزون": "Stock", "الباركود": "Barcode", "رابط الصورة": "Image URL", "العملة": "Currency", "تقرير المخزون": "Inventory report", "مراقبة المخزون": "Inventory monitoring", "قيد الانتظار": "Pending", "مقبول": "Accepted", "مرفوض": "Rejected", "قيد التوصيل": "Delivering", "مكتمل": "Completed", "ملغي": "Cancelled", "متاح": "Available", "غير متاح": "Unavailable", "قريباً": "Coming soon", "نفدت الكمية": "Out of stock", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  ku: {
    "فاتورة": "پسووڵە", "تفاصيل الفاتورة": "وردەکاریی پسووڵە", "رقم الطلب": "ژمارەی داواکاری", "الزبون": "کڕیار", "العميل": "کڕیار", "الهاتف": "تەلەفۆن", "العنوان": "ناونیشان", "الحالة": "دۆخ", "المنتج": "بەرهەم", "اسم المنتج": "ناوی بەرهەم", "الكمية": "بڕ", "السعر": "نرخ", "الخصم": "داشکاندن", "المجموع": "کۆی گشتی", "المطلوب دفعه": "بڕی پێویست بۆ پارەدان", "التاريخ": "بەروار", "المعالجة": "چارەسەرکراو", "تقرير المبيعات": "ڕاپۆرتی فرۆشتن", "تصدير كل الطلبات": "هەناردەکردنی هەموو داواکارییەکان", "تصدير طلبات اليوم": "هەناردەکردنی داواکارییەکانی ئەمڕۆ", "تصدير الطلبات المقبولة فقط": "هەناردەکردنی داواکارییە پەسەندکراوەکان", "تصدير الطلبات المكتملة فقط": "هەناردەکردنی داواکارییە تەواوەکان", "تصدير الطلبات المرفوضة": "هەناردەکردنی داواکارییە ڕەتکراوەکان", "تصدير الطلبات الملغية": "هەناردەکردنی داواکارییە هەڵوەشاوەکان", "تصدير طلبات قيد التوصيل": "هەناردەکردنی داواکارییەکانی گەیاندن", "تقرير المنتجات الكامل": "ڕاپۆرتی تەواوی بەرهەمەکان", "إجمالي المنتجات": "کۆی بەرهەمەکان", "الفئة": "پۆل", "الوصف": "وەسف", "الإجمالي": "کۆی گشتی", "المباع": "فرۆشراو", "المتبقي": "ماوە", "المخزون": "کۆگا", "الباركود": "بارکۆد", "رابط الصورة": "بەستەری وێنە", "العملة": "دراو", "تقرير المخزون": "ڕاپۆرتی کۆگا", "مراقبة المخزون": "چاودێری کۆگا", "قيد الانتظار": "چاوەڕوان", "مقبول": "پەسەندکراو", "مرفوض": "ڕەتکراو", "قيد التوصيل": "لە گەیاندندایە", "مكتمل": "تەواو", "ملغي": "هەڵوەشاوە", "متاح": "بەردەست", "غير متاح": "بەردەست نییە", "قريباً": "بەم زووانە", "نفدت الكمية": "بڕەکە تەواو بوو", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  tk: {
    "فاتورة": "Hasap-faktura", "تفاصيل الفاتورة": "Hasap-faktura jikme-jigi", "رقم الطلب": "Sargyt belgisi", "الزبون": "Müşderi", "العميل": "Müşderi", "الهاتف": "Telefon", "العنوان": "Salgy", "الحالة": "Ýagdaý", "المنتج": "Haryt", "اسم المنتج": "Haryt ady", "الكمية": "Mukdar", "السعر": "Bahasy", "الخصم": "Arzanladyş", "المجموع": "Jemi", "المطلوب دفعه": "Tölenmeli mukdar", "التاريخ": "Sene", "المعالجة": "Işlenen", "تقرير المبيعات": "Satuw hasabaty", "تصدير كل الطلبات": "Ähli sargytlary eksport et", "تصدير طلبات اليوم": "Şu günüň sargytlaryny eksport et", "تصدير الطلبات المقبولة فقط": "Diňe kabul edilenleri eksport et", "تصدير الطلبات المكتملة فقط": "Diňe tamamlananlary eksport et", "تصدير الطلبات المرفوضة": "Ýatyrylan/ret edilenleri eksport et", "تصدير الطلبات الملغية": "Ýatyrylan sargytlary eksport et", "تصدير طلبات قيد التوصيل": "Eltip berilýän sargytlary eksport et", "تقرير المنتجات الكامل": "Doly haryt hasabaty", "إجمالي المنتجات": "Harytlaryň jemi", "الفئة": "Kategoriýa", "الوصف": "Düşündiriş", "الإجمالي": "Jemi", "المباع": "Satylan", "المتبقي": "Galan", "المخزون": "Ammar", "الباركود": "Ştrih-kod", "رابط الصورة": "Surat URL", "العملة": "Walýuta", "تقرير المخزون": "Ammar hasabaty", "مراقبة المخزون": "Ammar gözegçiligi", "قيد الانتظار": "Garaşylýar", "مقبول": "Kabul edildi", "مرفوض": "Ret edildi", "قيد التوصيل": "Eltip berilýär", "مكتمل": "Tamamlandy", "ملغي": "Ýatyryldy", "متاح": "Elýeterli", "غير متاح": "Elýeterli däl", "قريباً": "Tiz wagtda", "نفدت الكمية": "Gutardy", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  ru: {
    "فاتورة": "Счет", "تفاصيل الفاتورة": "Детали счета", "رقم الطلب": "Номер заказа", "الزبون": "Клиент", "العميل": "Клиент", "الهاتف": "Телефон", "العنوان": "Адрес", "الحالة": "Статус", "المنتج": "Товар", "اسم المنتج": "Название товара", "الكمية": "Количество", "السعر": "Цена", "الخصم": "Скидка", "المجموع": "Итого", "المطلوب دفعه": "К оплате", "التاريخ": "Дата", "المعالجة": "Обработано", "تقرير المبيعات": "Отчет о продажах", "تصدير كل الطلبات": "Экспорт всех заказов", "تصدير طلبات اليوم": "Экспорт заказов за сегодня", "تصدير الطلبات المقبولة فقط": "Экспорт принятых заказов", "تصدير الطلبات المكتملة فقط": "Экспорт завершенных заказов", "تصدير الطلبات المرفوضة": "Экспорт отклоненных заказов", "تصدير الطلبات الملغية": "Экспорт отмененных заказов", "تصدير طلبات قيد التوصيل": "Экспорт заказов в доставке", "تقرير المنتجات الكامل": "Полный отчет по товарам", "إجمالي المنتجات": "Всего товаров", "الفئة": "Категория", "الوصف": "Описание", "الإجمالي": "Всего", "المباع": "Продано", "المتبقي": "Осталось", "المخزون": "Склад", "الباركود": "Штрихкод", "رابط الصورة": "URL изображения", "العملة": "Валюта", "تقرير المخزون": "Отчет по складу", "مراقبة المخزون": "Контроль склада", "قيد الانتظار": "В ожидании", "مقبول": "Принят", "مرفوض": "Отклонен", "قيد التوصيل": "Доставляется", "مكتمل": "Завершен", "ملغي": "Отменен", "متاح": "Доступен", "غير متاح": "Недоступен", "قريباً": "Скоро", "نفدت الكمية": "Нет в наличии", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  nl: {
    "فاتورة": "Factuur", "تفاصيل الفاتورة": "Factuurgegevens", "رقم الطلب": "Bestelnummer", "الزبون": "Klant", "العميل": "Klant", "الهاتف": "Telefoon", "العنوان": "Adres", "الحالة": "Status", "المنتج": "Product", "اسم المنتج": "Productnaam", "الكمية": "Aantal", "السعر": "Prijs", "الخصم": "Korting", "المجموع": "Totaal", "المطلوب دفعه": "Te betalen", "التاريخ": "Datum", "المعالجة": "Verwerkt", "تقرير المبيعات": "Verkooprapport", "تصدير كل الطلبات": "Alle bestellingen exporteren", "تصدير طلبات اليوم": "Bestellingen van vandaag exporteren", "تصدير الطلبات المقبولة فقط": "Alleen geaccepteerde bestellingen exporteren", "تصدير الطلبات المكتملة فقط": "Alleen voltooide bestellingen exporteren", "تصدير الطلبات المرفوضة": "Afgewezen bestellingen exporteren", "تصدير الطلبات الملغية": "Geannuleerde bestellingen exporteren", "تصدير طلبات قيد التوصيل": "Bestellingen in levering exporteren", "تقرير المنتجات الكامل": "Volledig productrapport", "إجمالي المنتجات": "Totaal producten", "الفئة": "Categorie", "الوصف": "Beschrijving", "الإجمالي": "Totaal", "المباع": "Verkocht", "المتبقي": "Resterend", "المخزون": "Voorraad", "الباركود": "Barcode", "رابط الصورة": "Afbeeldings-URL", "العملة": "Valuta", "تقرير المخزون": "Voorraadrapport", "مراقبة المخزون": "Voorraadcontrole", "قيد الانتظار": "In afwachting", "مقبول": "Geaccepteerd", "مرفوض": "Afgewezen", "قيد التوصيل": "In levering", "مكتمل": "Voltooid", "ملغي": "Geannuleerd", "متاح": "Beschikbaar", "غير متاح": "Niet beschikbaar", "قريباً": "Binnenkort", "نفدت الكمية": "Uitverkocht", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  no: {
    "فاتورة": "Faktura", "تفاصيل الفاتورة": "Fakturadetaljer", "رقم الطلب": "Ordrenummer", "الزبون": "Kunde", "العميل": "Kunde", "الهاتف": "Telefon", "العنوان": "Adresse", "الحالة": "Status", "المنتج": "Produkt", "اسم المنتج": "Produktnavn", "الكمية": "Antall", "السعر": "Pris", "الخصم": "Rabatt", "المجموع": "Totalt", "المطلوب دفعه": "Beløp å betale", "التاريخ": "Dato", "المعالجة": "Behandlet", "تقرير المبيعات": "Salgsrapport", "تصدير كل الطلبات": "Eksporter alle bestillinger", "تصدير طلبات اليوم": "Eksporter dagens bestillinger", "تصدير الطلبات المقبولة فقط": "Eksporter kun godkjente bestillinger", "تصدير الطلبات المكتملة فقط": "Eksporter kun fullførte bestillinger", "تصدير الطلبات المرفوضة": "Eksporter avviste bestillinger", "تصدير الطلبات الملغية": "Eksporter kansellerte bestillinger", "تصدير طلبات قيد التوصيل": "Eksporter bestillinger under levering", "تقرير المنتجات الكامل": "Full produktrapport", "إجمالي المنتجات": "Totalt produkter", "الفئة": "Kategori", "الوصف": "Beskrivelse", "الإجمالي": "Totalt", "المباع": "Solgt", "المتبقي": "Gjenstår", "المخزون": "Lager", "الباركود": "Strekkode", "رابط الصورة": "Bilde-URL", "العملة": "Valuta", "تقرير المخزون": "Lagerrapport", "مراقبة المخزون": "Lagerovervåking", "قيد الانتظار": "Venter", "مقبول": "Godkjent", "مرفوض": "Avvist", "قيد التوصيل": "Under levering", "مكتمل": "Fullført", "ملغي": "Kansellert", "متاح": "Tilgjengelig", "غير متاح": "Ikke tilgjengelig", "قريباً": "Kommer snart", "نفدت الكمية": "Utsolgt", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  fil: {
    "فاتورة": "Invoice", "تفاصيل الفاتورة": "Mga detalye ng invoice", "رقم الطلب": "Numero ng order", "الزبون": "Customer", "العميل": "Customer", "الهاتف": "Telepono", "العنوان": "Address", "الحالة": "Status", "المنتج": "Produkto", "اسم المنتج": "Pangalan ng produkto", "الكمية": "Dami", "السعر": "Presyo", "الخصم": "Diskwento", "المجموع": "Kabuuan", "المطلوب دفعه": "Halagang babayaran", "التاريخ": "Petsa", "المعالجة": "Naproseso", "تقرير المبيعات": "Ulat ng benta", "تصدير كل الطلبات": "I-export lahat ng order", "تصدير طلبات اليوم": "I-export ang mga order ngayong araw", "تصدير الطلبات المقبولة فقط": "I-export ang tinanggap na order lamang", "تصدير الطلبات المكتملة فقط": "I-export ang natapos na order lamang", "تصدير الطلبات المرفوضة": "I-export ang tinanggihang order", "تصدير الطلبات الملغية": "I-export ang kinanselang order", "تصدير طلبات قيد التوصيل": "I-export ang mga order na dini-deliver", "تقرير المنتجات الكامل": "Kumpletong ulat ng produkto", "إجمالي المنتجات": "Kabuuang produkto", "الفئة": "Kategorya", "الوصف": "Paglalarawan", "الإجمالي": "Kabuuan", "المباع": "Nabenta", "المتبقي": "Natitira", "المخزون": "Stock", "الباركود": "Barcode", "رابط الصورة": "URL ng larawan", "العملة": "Currency", "تقرير المخزون": "Ulat ng stock", "مراقبة المخزون": "Pagsubaybay sa stock", "قيد الانتظار": "Nakabinbin", "مقبول": "Tinanggap", "مرفوض": "Tinanggihan", "قيد التوصيل": "Dini-deliver", "مكتمل": "Nakumpleto", "ملغي": "Kinansela", "متاح": "Available", "غير متاح": "Unavailable", "قريباً": "Malapit na", "نفدت الكمية": "Walang stock", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  tr: {
    "فاتورة": "Fatura", "تفاصيل الفاتورة": "Fatura detayları", "رقم الطلب": "Sipariş numarası", "الزبون": "Müşteri", "العميل": "Müşteri", "الهاتف": "Telefon", "العنوان": "Adres", "الحالة": "Durum", "المنتج": "Ürün", "اسم المنتج": "Ürün adı", "الكمية": "Miktar", "السعر": "Fiyat", "الخصم": "İndirim", "المجموع": "Toplam", "المطلوب دفعه": "Ödenecek tutar", "التاريخ": "Tarih", "المعالجة": "İşlenen", "تقرير المبيعات": "Satış raporu", "تصدير كل الطلبات": "Tüm siparişleri dışa aktar", "تصدير طلبات اليوم": "Bugünün siparişlerini dışa aktar", "تصدير الطلبات المقبولة فقط": "Yalnızca kabul edilen siparişleri dışa aktar", "تصدير الطلبات المكتملة فقط": "Yalnızca tamamlanan siparişleri dışa aktar", "تصدير الطلبات المرفوضة": "Reddedilen siparişleri dışa aktar", "تصدير الطلبات الملغية": "İptal edilen siparişleri dışa aktar", "تصدير طلبات قيد التوصيل": "Teslimattaki siparişleri dışa aktar", "تقرير المنتجات الكامل": "Tam ürün raporu", "إجمالي المنتجات": "Toplam ürün", "الفئة": "Kategori", "الوصف": "Açıklama", "الإجمالي": "Toplam", "المباع": "Satılan", "المتبقي": "Kalan", "المخزون": "Stok", "الباركود": "Barkod", "رابط الصورة": "Görsel URL", "العملة": "Para birimi", "تقرير المخزون": "Stok raporu", "مراقبة المخزون": "Stok izleme", "قيد الانتظار": "Beklemede", "مقبول": "Kabul edildi", "مرفوض": "Reddedildi", "قيد التوصيل": "Teslimatta", "مكتمل": "Tamamlandı", "ملغي": "İptal edildi", "متاح": "Mevcut", "غير متاح": "Mevcut değil", "قريباً": "Yakında", "نفدت الكمية": "Stokta yok", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  fa: {
    "فاتورة": "فاکتور", "تفاصيل الفاتورة": "جزئیات فاکتور", "رقم الطلب": "شماره سفارش", "الزبون": "مشتری", "العميل": "مشتری", "الهاتف": "تلفن", "العنوان": "آدرس", "الحالة": "وضعیت", "المنتج": "محصول", "اسم المنتج": "نام محصول", "الكمية": "تعداد", "السعر": "قیمت", "الخصم": "تخفیف", "المجموع": "جمع کل", "المطلوب دفعه": "مبلغ قابل پرداخت", "التاريخ": "تاریخ", "المعالجة": "پردازش‌شده", "تقرير المبيعات": "گزارش فروش", "تصدير كل الطلبات": "خروجی همه سفارش‌ها", "تصدير طلبات اليوم": "خروجی سفارش‌های امروز", "تصدير الطلبات المقبولة فقط": "خروجی سفارش‌های پذیرفته‌شده", "تصدير الطلبات المكتملة فقط": "خروجی سفارش‌های تکمیل‌شده", "تصدير الطلبات المرفوضة": "خروجی سفارش‌های ردشده", "تصدير الطلبات الملغية": "خروجی سفارش‌های لغوشده", "تصدير طلبات قيد التوصيل": "خروجی سفارش‌های در حال ارسال", "تقرير المنتجات الكامل": "گزارش کامل محصولات", "إجمالي المنتجات": "کل محصولات", "الفئة": "دسته", "الوصف": "توضیحات", "الإجمالي": "کل", "المباع": "فروخته‌شده", "المتبقي": "باقی‌مانده", "المخزون": "موجودی", "الباركود": "بارکد", "رابط الصورة": "آدرس تصویر", "العملة": "واحد پول", "تقرير المخزون": "گزارش موجودی", "مراقبة المخزون": "کنترل موجودی", "قيد الانتظار": "در انتظار", "مقبول": "پذیرفته‌شده", "مرفوض": "ردشده", "قيد التوصيل": "در حال ارسال", "مكتمل": "تکمیل‌شده", "ملغي": "لغوشده", "متاح": "در دسترس", "غير متاح": "ناموجود", "قريباً": "به‌زودی", "نفدت الكمية": "اتمام موجودی", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  zh: {
    "فاتورة": "发票", "تفاصيل الفاتورة": "发票详情", "رقم الطلب": "订单号", "الزبون": "客户", "العميل": "客户", "الهاتف": "电话", "العنوان": "地址", "الحالة": "状态", "المنتج": "商品", "اسم المنتج": "商品名称", "الكمية": "数量", "السعر": "价格", "الخصم": "折扣", "المجموع": "合计", "المطلوب دفعه": "应付金额", "التاريخ": "日期", "المعالجة": "已处理", "تقرير المبيعات": "销售报告", "تصدير كل الطلبات": "导出所有订单", "تصدير طلبات اليوم": "导出今日订单", "تصدير الطلبات المقبولة فقط": "仅导出已接受订单", "تصدير الطلبات المكتملة فقط": "仅导出已完成订单", "تصدير الطلبات المرفوضة": "导出已拒绝订单", "تصدير الطلبات الملغية": "导出已取消订单", "تصدير طلبات قيد التوصيل": "导出配送中订单", "تقرير المنتجات الكامل": "完整商品报告", "إجمالي المنتجات": "商品总数", "الفئة": "分类", "الوصف": "描述", "الإجمالي": "总计", "المباع": "已售", "المتبقي": "剩余", "المخزون": "库存", "الباركود": "条形码", "رابط الصورة": "图片链接", "العملة": "货币", "تقرير المخزون": "库存报告", "مراقبة المخزون": "库存监控", "قيد الانتظار": "待处理", "مقبول": "已接受", "مرفوض": "已拒绝", "قيد التوصيل": "配送中", "مكتمل": "已完成", "ملغي": "已取消", "متاح": "可用", "غير متاح": "不可用", "قريباً": "即将推出", "نفدت الكمية": "缺货", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  ja: {
    "فاتورة": "請求書", "تفاصيل الفاتورة": "請求書の詳細", "رقم الطلب": "注文番号", "الزبون": "顧客", "العميل": "顧客", "الهاتف": "電話", "العنوان": "住所", "الحالة": "ステータス", "المنتج": "商品", "اسم المنتج": "商品名", "الكمية": "数量", "السعر": "価格", "الخصم": "割引", "المجموع": "合計", "المطلوب دفعه": "支払金額", "التاريخ": "日付", "المعالجة": "処理済み", "تقرير المبيعات": "売上レポート", "تصدير كل الطلبات": "すべての注文をエクスポート", "تصدير طلبات اليوم": "本日の注文をエクスポート", "تصدير الطلبات المقبولة فقط": "承認済み注文のみエクスポート", "تصدير الطلبات المكتملة فقط": "完了した注文のみエクスポート", "تصدير الطلبات المرفوضة": "拒否された注文をエクスポート", "تصدير الطلبات الملغية": "キャンセル済み注文をエクスポート", "تصدير طلبات قيد التوصيل": "配送中の注文をエクスポート", "تقرير المنتجات الكامل": "全商品レポート", "إجمالي المنتجات": "商品合計", "الفئة": "カテゴリー", "الوصف": "説明", "الإجمالي": "合計", "المباع": "販売済み", "المتبقي": "残り", "المخزون": "在庫", "الباركود": "バーコード", "رابط الصورة": "画像URL", "العملة": "通貨", "تقرير المخزون": "在庫レポート", "مراقبة المخزون": "在庫管理", "قيد الانتظار": "保留中", "مقبول": "承認済み", "مرفوض": "拒否", "قيد التوصيل": "配送中", "مكتمل": "完了", "ملغي": "キャンセル", "متاح": "利用可能", "غير متاح": "利用不可", "قريباً": "近日公開", "نفدت الكمية": "在庫切れ", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  },
  hi: {
    "فاتورة": "इनवॉइस", "تفاصيل الفاتورة": "इनवॉइस विवरण", "رقم الطلب": "ऑर्डर नंबर", "الزبون": "ग्राहक", "العميل": "ग्राहक", "الهاتف": "फ़ोन", "العنوان": "पता", "الحالة": "स्थिति", "المنتج": "उत्पाद", "اسم المنتج": "उत्पाद नाम", "الكمية": "मात्रा", "السعر": "कीमत", "الخصم": "छूट", "المجموع": "कुल", "المطلوب دفعه": "देय राशि", "التاريخ": "दिनांक", "المعالجة": "प्रसंस्कृत", "تقرير المبيعات": "बिक्री रिपोर्ट", "تصدير كل الطلبات": "सभी ऑर्डर निर्यात करें", "تصدير طلبات اليوم": "आज के ऑर्डर निर्यात करें", "تصدير الطلبات المقبولة فقط": "केवल स्वीकृत ऑर्डर निर्यात करें", "تصدير الطلبات المكتملة فقط": "केवल पूर्ण ऑर्डर निर्यात करें", "تصدير الطلبات المرفوضة": "अस्वीकृत ऑर्डर निर्यात करें", "تصدير الطلبات الملغية": "रद्द ऑर्डर निर्यात करें", "تصدير طلبات قيد التوصيل": "डिलीवरी में ऑर्डर निर्यात करें", "تقرير المنتجات الكامل": "पूर्ण उत्पाद रिपोर्ट", "إجمالي المنتجات": "कुल उत्पाद", "الفئة": "श्रेणी", "الوصف": "विवरण", "الإجمالي": "कुल", "المباع": "बिका", "المتبقي": "शेष", "المخزون": "स्टॉक", "الباركود": "बारकोड", "رابط الصورة": "छवि URL", "العملة": "मुद्रा", "تقرير المخزون": "स्टॉक रिपोर्ट", "مراقبة المخزون": "स्टॉक निगरानी", "قيد الانتظار": "लंबित", "مقبول": "स्वीकृत", "مرفوض": "अस्वीकृत", "قيد التوصيل": "डिलीवरी में", "مكتمل": "पूर्ण", "ملغي": "रद्द", "متاح": "उपलब्ध", "غير متاح": "अनुपलब्ध", "قريباً": "जल्द आ रहा है", "نفدت الكمية": "स्टॉक समाप्त", "PDF": "PDF", "Excel": "Excel", "Word": "Word"
  }
};

export function exportLabel(options: ExportOptions | undefined, key: string) {
  const lang = exportLang(options);
  const local = EXPORT_TRANSLATIONS[lang]?.[key] || EXPORT_TRANSLATIONS[lang]?.[EXPORT_TRANSLATIONS.ar[key]];
  if (local) return local;
  const translated = options?.t ? options.t(key) : key;
  if (lang !== "ar" && translated === key) return EXPORT_TRANSLATIONS.en[key] || key;
  if (lang !== "ar" && EXPORT_TRANSLATIONS.ar[key] === translated) return EXPORT_TRANSLATIONS.en[key] || translated;
  return translated;
}

function tr(options: ExportOptions | undefined, key: string) {
  return exportLabel(options, key);
}

function exportDir(options?: ExportOptions) {
  return options?.dir || "rtl";
}

function exportLang(options?: ExportOptions) {
  return options?.lang || "ar";
}

function alignForDir(options?: ExportOptions) {
  return exportDir(options) === "rtl" ? "right" : "left";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusSourceLabel(status?: string) {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    accepted: "مقبول",
    rejected: "مرفوض",
    delivering: "قيد التوصيل",
    completed: "مكتمل",
    cancelled: "ملغي",
    available: "متاح",
    unavailable: "غير متاح",
    coming_soon: "قريباً",
    out_of_stock: "نفدت الكمية"
  };
  return map[status || ""] || status || "";
}

export function statusLabel(status?: string, translator?: Translator) {
  const value = statusSourceLabel(status);
  return translator && value ? translator(value) : value;
}

export function exportStatusLabel(status: string | undefined, options?: ExportOptions) {
  const value = statusSourceLabel(status);
  return value ? exportLabel(options, value) : "";
}

export function sortCategoriesByOrder(categories: string[], categoryOrder: Record<string, number> = {}) {
  return Array.from(new Set(categories.map((name) => name.trim()).filter(Boolean))).sort((a, b) => {
    const orderA = categoryOrder[a] ?? Number.MAX_SAFE_INTEGER;
    const orderB = categoryOrder[b] ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}

export function categoryNames(products: Product[], categoryOrder: Record<string, number> = {}, categoryImages: Record<string, string> = {}) {
  return sortCategoriesByOrder([
    ...Object.keys(categoryOrder),
    ...Object.keys(categoryImages),
    ...products.map((p) => (p.category || "").trim())
  ].filter((name) => Boolean(name) && !isSpecialCategory(name)), categoryOrder);
}

export function displayCategoryNames(baseCategories: string[], dynamicCategories: string[], categoryOrder: Record<string, number> = {}) {
  return sortCategoriesByOrder([...baseCategories, ...dynamicCategories], categoryOrder);
}


export function homeSectionKeyFromField(field: string) {
  const map: Record<string, string> = {
    showInTrendingNow: "TRENDING_NOW",
    showInFeaturedOffers: "FEATURED_OFFERS",
    showInHomeSelected: "SELECTED_PRODUCTS",
    TRENDING_NOW: "TRENDING_NOW",
    FEATURED_OFFERS: "FEATURED_OFFERS",
    SELECTED_PRODUCTS: "SELECTED_PRODUCTS"
  };
  return map[field] || field;
}

export function homeSectionFieldFromKey(key: string) {
  const map: Record<string, string> = {
    TRENDING_NOW: "showInTrendingNow",
    FEATURED_OFFERS: "showInFeaturedOffers",
    SELECTED_PRODUCTS: "showInHomeSelected",
    showInTrendingNow: "showInTrendingNow",
    showInFeaturedOffers: "showInFeaturedOffers",
    showInHomeSelected: "showInHomeSelected"
  };
  return map[key] || key;
}

export function sectionTitle(section: HomeCustomSection, locale = "ar") {
  return section.localizedTitles?.[locale] || section.titleByLocale?.[locale] || section.title || "قسم";
}

export function sectionVisible(section: HomeCustomSection) {
  return section.visible !== false && section.isVisible !== false;
}

export function fixedSectionTitle(config: HomeFixedSectionsConfig | undefined, field: string, fallback: string, locale = "ar") {
  const raw = (config || {}) as Record<string, any>;
  const key = homeSectionKeyFromField(field);
  const item = raw[field] || raw[key];
  const nested = raw.fixedTitles?.[key]?.[locale] || raw[`fixedTitles.${key}.${locale}`];
  const legacy = raw[`${key}_title_${locale}`] || raw[`${field}_title_${locale}`];
  return nested || legacy || item?.localizedTitles?.[locale] || item?.titleByLocale?.[locale] || item?.title || fallback;
}

export function fixedSectionVisible(config: HomeFixedSectionsConfig | undefined, field: string) {
  const raw = (config || {}) as Record<string, any>;
  const key = homeSectionKeyFromField(field);
  const item = raw[field] || raw[key];
  const nested = raw.fixedVisible?.[key];
  const dotted = raw[`fixedVisible.${key}`];
  const legacy = raw[`${key}_visible`];
  if (typeof nested === "boolean") return nested;
  if (typeof dotted === "boolean") return dotted;
  if (typeof legacy === "boolean") return legacy;
  return item?.visible !== false && item?.isVisible !== false;
}

export function sanitizeProductPayload(input: Partial<Product>) {
  const now = nowMs();
  const total = asNumber(input.totalQuantity ?? input.quantity ?? input.stockQuantity);
  const sold = asNumber(input.soldQuantity ?? input.soldCount);
  const available = Math.max(total - sold, 0);
  return {
    title: (input.title || "").trim(),
    description: (input.description || "").trim(),
    price: asNumber(input.price),
    currency: (input.currency || "USD").trim(),
    category: (input.category || "").trim(),
    discount: asNumber(input.discount),
    imageUrl: normalizeImageUrl(input.imageUrl),
    quantity: available,
    stockQuantity: available,
    totalQuantity: total,
    soldCount: sold,
    soldQuantity: sold,
    barcode: (input.barcode || "").trim(),
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    searchTags: Array.isArray(input.searchTags) ? input.searchTags : [],
    dominantColor: (input.dominantColor || "").trim(),
    status: input.status || "available",
    flashOfferEnabled: Boolean(input.flashOfferEnabled),
    flashOffersEnabled: Boolean(input.flashOfferEnabled || input.flashOffersEnabled),
    flashPrice: asNumber(input.flashPrice),
    flashStartAt: input.flashOfferEnabled ? now : 0,
    flashEndAt: asNumber(input.flashEndAt),
    flashSaleEndTime: asNumber(input.flashSaleEndTime || input.flashEndAt),
    showInTrendingNow: Boolean(input.showInTrendingNow),
    showInFeaturedOffers: Boolean(input.showInFeaturedOffers),
    showInHomeSelected: Boolean(input.showInHomeSelected),
    customCardColorHex: (input.customCardColorHex || input.customCardColor || "").trim(),
    customCardColor: (input.customCardColorHex || input.customCardColor || "").trim(),
    customCardColorIncludesImageFrame: Boolean(input.customCardColorIncludesImageFrame),
    imageAspectRatioKey: input.imageAspectRatioKey || input.aspectRatio || "square_1_1",
    aspectRatio: input.imageAspectRatioKey || input.aspectRatio || "square_1_1",
    customImageAspectRatio: input.customImageAspectRatio || "",
    updatedAt: now
  };
}

export function parseCustomLinks(text?: string) {
  return (text || "").split("\n").map((line) => {
    const [name, ...urlParts] = line.split("|");
    return { name: (name || "").trim(), url: (urlParts.join("|") || "").trim() };
  }).filter((item) => item.name || item.url);
}

export function serializeCustomLinks(items: Array<{ name?: string; url?: string }>) {
  return items
    .map((item) => ({ name: (item.name || "").trim(), url: (item.url || "").trim() }))
    .filter((item) => item.name && item.url)
    .map((item) => `${item.name}|${item.url}`)
    .join("\n");
}

export function safeLink(url?: string) {
  const clean = (url || "").trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || /^mailto:/i.test(clean) || /^tel:/i.test(clean)) return clean;
  if (clean.includes("@")) return `mailto:${clean}`;
  return `https://${clean}`;
}

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
  downloadText(filename, "\ufeff" + csv, "text/csv;charset=utf-8");
}

export function exportExcel(filename: string, title: string, rows: Array<Record<string, unknown>>, options?: ExportOptions) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const trs = rows.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`).join("");
  const html = `<!doctype html><html dir="${exportDir(options)}" lang="${exportLang(options)}"><head><meta charset="utf-8"></head><body><h2>${escapeHtml(title)}</h2><table border="1"><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  downloadText(filename.endsWith(".xls") ? filename : `${filename}.xls`, "\ufeff" + html, "application/vnd.ms-excel;charset=utf-8");
}

export function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export function exportWord(filename: string, title: string, html: string, options?: ExportOptions) {
  const dir = exportDir(options);
  const body = `<!doctype html><html dir="${dir}" lang="${exportLang(options)}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;direction:${dir};padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:${alignForDir(options)}}.muted{color:#666}.total{font-size:20px;font-weight:bold}</style></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`;
  downloadText(filename.endsWith(".doc") ? filename : `${filename}.doc`, body, "application/msword;charset=utf-8");
}

export function printHtml(title: string, html: string, options?: ExportOptions) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const dir = exportDir(options);
  win.document.write(`<!doctype html><html dir="${dir}" lang="${exportLang(options)}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;direction:${dir};padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:8px;text-align:${alignForDir(options)}}.muted{color:#666}.total{font-size:20px;font-weight:bold}</style></head><body><h1>${escapeHtml(title)}</h1>${html}<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
  win.document.close();
}

export function ordersHtml(orders: Order[], options?: ExportOptions) {
  const rows = orders.map((o) => `<tr><td>${escapeHtml(o.orderNumber || o.id)}</td><td>${escapeHtml(o.customerName || "")}</td><td>${escapeHtml(o.phone || "")}</td><td>${escapeHtml(exportStatusLabel(o.status, options))}</td><td>${escapeHtml(orderTotal(o))}</td><td>${escapeHtml(dateText(o.timestamp, options?.lang))}</td></tr>`).join("");
  return `<p class="muted">${escapeHtml(tr(options, "المعالجة"))}: ${orders.length}</p><table><thead><tr><th>${escapeHtml(tr(options, "رقم الطلب"))}</th><th>${escapeHtml(tr(options, "الزبون"))}</th><th>${escapeHtml(tr(options, "الهاتف"))}</th><th>${escapeHtml(tr(options, "الحالة"))}</th><th>${escapeHtml(tr(options, "المطلوب دفعه"))}</th><th>${escapeHtml(tr(options, "التاريخ"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function invoiceHtml(order: Order, options?: ExportOptions) {
  const items = (order.items || []).map((it) => `<tr><td>${escapeHtml(it.title || it.name || it.productId || "")}</td><td>${escapeHtml(it.quantity || 1)}</td><td>${escapeHtml(money(it.finalPrice ?? it.price ?? 0, it.currency || ""))}</td></tr>`).join("");
  return `<p>${escapeHtml(tr(options, "رقم الطلب"))}: ${escapeHtml(order.orderNumber || order.id)}</p><p>${escapeHtml(tr(options, "الزبون"))}: ${escapeHtml(order.customerName || "")}</p><p>${escapeHtml(tr(options, "الهاتف"))}: ${escapeHtml(order.phone || "")}</p><p>${escapeHtml(tr(options, "الحالة"))}: ${escapeHtml(exportStatusLabel(order.status, options))}</p><table><thead><tr><th>${escapeHtml(tr(options, "المنتج"))}</th><th>${escapeHtml(tr(options, "الكمية"))}</th><th>${escapeHtml(tr(options, "السعر"))}</th></tr></thead><tbody>${items}</tbody></table><p class="total">${escapeHtml(tr(options, "المطلوب دفعه"))}: ${escapeHtml(orderTotal(order))}</p>`;
}

export function productsHtml(products: Product[], options?: ExportOptions) {
  const rows = products.map((p) => `<tr><td>${escapeHtml(p.title || "")}</td><td>${escapeHtml(p.category || "")}</td><td>${escapeHtml(p.description || "")}</td><td>${escapeHtml(money(p.price || 0, p.currency || ""))}</td><td>${escapeHtml(asNumber(p.discount))}</td><td>${escapeHtml(exportStatusLabel(p.status, options))}</td><td>${escapeHtml(effectiveTotal(p))}</td><td>${escapeHtml(effectiveSold(p))}</td><td>${escapeHtml(effectiveStock(p))}</td><td>${escapeHtml(p.barcode || "")}</td><td>${escapeHtml(p.imageUrl || "")}</td></tr>`).join("");
  return `<p class="muted">${escapeHtml(tr(options, "إجمالي المنتجات"))}: ${products.length}</p><table><thead><tr><th>${escapeHtml(tr(options, "المنتج"))}</th><th>${escapeHtml(tr(options, "الفئة"))}</th><th>${escapeHtml(tr(options, "الوصف"))}</th><th>${escapeHtml(tr(options, "السعر"))}</th><th>${escapeHtml(tr(options, "الخصم"))}</th><th>${escapeHtml(tr(options, "الحالة"))}</th><th>${escapeHtml(tr(options, "الإجمالي"))}</th><th>${escapeHtml(tr(options, "المباع"))}</th><th>${escapeHtml(tr(options, "المتبقي"))}</th><th>${escapeHtml(tr(options, "الباركود"))}</th><th>${escapeHtml(tr(options, "رابط الصورة"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}
