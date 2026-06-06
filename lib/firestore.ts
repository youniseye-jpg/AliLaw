"use client";

import { db } from "@/lib/firebase";
import type { BannerItem, ChatConversation, ChatMessage, Coupon, HomeCustomSection, HomeFixedSectionItem, Order, Product, ProductRating, StoreContact } from "@/lib/types";
import { CHAT_COLLECTION, customerOwnerFields, homeSectionKeyFromField, isSpecialCategory, normalizeImageUrl, normalizePhone, nowMs, orderNumber, sanitizeProductPayload } from "@/lib/utils";
import {
  DocumentData,
  QueryConstraint,
  Unsubscribe,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  startAfter,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

function withId<T>(id: string, data: DocumentData | undefined): T {
  return { id, ...(data || {}) } as T;
}

const CHAT_MIRROR_COLLECTION = CHAT_COLLECTION === "chatConversations" ? "chat_conversations" : "chatConversations";
const CHAT_COLLECTIONS = [CHAT_COLLECTION, CHAT_MIRROR_COLLECTION] as const;

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]) {
  const map = new Map<string, T>();
  for (const item of secondary) map.set(item.id, item);
  for (const item of primary) {
    const previous = map.get(item.id);
    map.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return Array.from(map.values());
}

export function listenProducts(callback: (items: Product[]) => void, constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(20)]): Unsubscribe {
  return onSnapshot(query(collection(db, "products"), ...constraints), (snap) => {
    callback(snap.docs.map((d) => withId<Product>(d.id, d.data())));
  });
}


export async function fetchMoreProducts(lastCreatedAt = 0, pageSize = 20): Promise<Product[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(pageSize)];
  if (lastCreatedAt) constraints.splice(1, 0, startAfter(lastCreatedAt));
  const snap = await getDocs(query(collection(db, "products"), ...constraints));
  return snap.docs.map((d) => withId<Product>(d.id, d.data()));
}

export async function fetchAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => withId<Product>(d.id, d.data())).sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
}

export function listenBanners(callback: (items: BannerItem[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "banners"), (snap) => {
    callback(snap.docs.map((d) => withId<BannerItem>(d.id, d.data())).filter((b) => b.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (b.createdAt ?? 0) - (a.createdAt ?? 0)));
  });
}

export function listenHomeCustomSections(callback: (items: HomeCustomSection[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "home_custom_sections"), (snap) => {
    callback(snap.docs.map((d) => withId<HomeCustomSection>(d.id, d.data())).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0)));
  });
}

export function listenDoc<T>(path: string, id: string, callback: (data: T | null) => void): Unsubscribe {
  return onSnapshot(doc(db, path, id), (snap) => callback(snap.exists() ? (snap.data() as T) : null));
}

export async function getProduct(id: string) {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? withId<Product>(snap.id, snap.data()) : null;
}

export async function saveProduct(product: Partial<Product> & { id?: string }, existingCreatedAt?: number) {
  const payload = sanitizeProductPayload(product);
  const ref = product.id ? doc(db, "products", product.id) : doc(collection(db, "products"));
  await setDoc(ref, { ...payload, createdAt: existingCreatedAt || nowMs() }, { merge: true });
  return ref.id;
}

export function deleteProduct(id: string) {
  return deleteDoc(doc(db, "products", id));
}

export async function createOrder(uid: string, form: { name: string; phone: string; address: string; note?: string }, cartItems: Array<{ product: Product; quantity: number }>, totals: { totals: Record<string, number>; originals: Record<string, number>; savings: Record<string, number> }, coupon?: { code?: string; discountAmount?: number; totalAfterCoupon?: number }) {
  const now = nowMs();
  const items = cartItems.map(({ product, quantity }) => ({
    productId: product.id,
    id: product.id,
    title: product.title || "",
    imageUrl: normalizeImageUrl(product.imageUrl),
    price: product.price || 0,
    originalPrice: product.price || 0,
    finalPrice: Math.max((product.price || 0) - ((product.price || 0) * (product.discount || 0)) / 100, 0),
    currency: product.currency || "USD",
    discount: product.discount || 0,
    quantity
  }));
  const owner = customerOwnerFields(uid);
  const number = orderNumber();
  const payload = {
    orderNumber: number,
    customerDeviceId: uid,
    customerName: form.name.trim(),
    phone: form.phone.trim(),
    normalizedPhone: normalizePhone(form.phone),
    address: form.address.trim(),
    customerNote: form.note?.trim() || "",
    orderNote: form.note?.trim() || "",
    note: form.note?.trim() || "",
    total: coupon?.totalAfterCoupon ?? Object.values(totals.totals).reduce((a, b) => a + b, 0),
    totalBeforeCoupon: Object.values(totals.totals).reduce((a, b) => a + b, 0),
    totalAfterCoupon: coupon?.totalAfterCoupon ?? Object.values(totals.totals).reduce((a, b) => a + b, 0),
    couponCode: coupon?.code || "",
    couponApplied: Boolean(coupon?.code),
    couponDiscountAmount: coupon?.discountAmount || 0,
    originalTotal: Object.values(totals.originals).reduce((a, b) => a + b, 0),
    savings: Object.values(totals.savings).reduce((a, b) => a + b, 0),
    totalByCurrency: totals.totals,
    originalByCurrency: totals.originals,
    savingsByCurrency: totals.savings,
    paymentSummaryText: Object.entries(totals.totals).map(([cur, total]) => `${total} ${cur}`).join(" + "),
    status: "pending",
    items,
    stockDeducted: false,
    stockDeductedItems: {},
    isReadByAdmin: false,
    timestamp: now,
    statusUpdatedAt: now,
    lastStatusUpdatedAt: now,
    statusHistory: [{ status: "pending", timestamp: now }],
    ...owner
  };
  const ref = await addDoc(collection(db, "orders"), payload);
  await addDoc(collection(db, "notifications"), {
    title: "طلب جديد",
    body: `طلب ${number} من ${form.name}`,
    topic: "admins",
    orderId: ref.id,
    orderNumber: number,
    isSent: false,
    timestamp: now,
    ...owner
  }).catch(() => undefined);
  return ref.id;
}

export function listenCustomerOrders(uid: string, callback: (items: Order[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "orders"), where("customerUid", "==", uid)), (snap) => {
    callback(snap.docs.map((d) => withId<Order>(d.id, d.data())).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
  });
}

export function listenAdminOrders(callback: (items: Order[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "orders"), (snap) => {
    callback(snap.docs.map((d) => withId<Order>(d.id, d.data())).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
  });
}

export async function resetSalesAccounts() {
  const ordersSnap = await getDocs(collection(db, "orders"));
  for (let i = 0; i < ordersSnap.docs.length; i += 450) {
    const batch = writeBatch(db);
    ordersSnap.docs.slice(i, i + 450).forEach((orderDoc) => batch.delete(doc(db, "orders", orderDoc.id)));
    await batch.commit();
  }

  const productsSnap = await getDocs(collection(db, "products"));
  for (let i = 0; i < productsSnap.docs.length; i += 450) {
    const batch = writeBatch(db);
    productsSnap.docs.slice(i, i + 450).forEach((productDoc) => {
      batch.set(doc(db, "products", productDoc.id), {
        soldCount: 0,
        soldQuantity: 0,
        updatedAt: nowMs()
      }, { merge: true });
    });
    await batch.commit();
  }
}

export async function updateOrderStatus(order: Order, newStatus: string) {
  const now = nowMs();
  const oldStatus = order.status || "pending";
  const stockDeducted = order.stockDeducted === true;
  const shouldDeduct = ["accepted", "delivering", "completed"].includes(newStatus) && !stockDeducted;
  const shouldReturn = stockDeducted && ["rejected", "cancelled"].includes(newStatus) && !["rejected", "cancelled"].includes(oldStatus);
  const batch = writeBatch(db);
  if (shouldDeduct || shouldReturn) {
    for (const item of order.items || []) {
      const productId = item.productId || item.id;
      if (!productId) continue;
      const qty = Number(item.quantity || 1);
      const sign = shouldDeduct ? -1 : 1;
      const soldSign = shouldDeduct ? 1 : -1;
      batch.update(doc(db, "products", productId), {
        quantity: increment(sign * qty),
        stockQuantity: increment(sign * qty),
        soldCount: increment(soldSign * qty),
        soldQuantity: increment(soldSign * qty),
        updatedAt: now
      });
    }
  }
  batch.update(doc(db, "orders", order.id), {
    status: newStatus,
    statusUpdatedAt: now,
    lastStatusUpdatedAt: now,
    stockDeducted: shouldDeduct ? true : shouldReturn ? false : stockDeducted,
    stockDeductedItems: shouldDeduct ? Object.fromEntries((order.items || []).map((it) => [it.productId || it.id || "", Number(it.quantity || 1)])) : shouldReturn ? {} : order.stockDeductedItems || {},
    statusHistory: arrayUnion({ status: newStatus, timestamp: now })
  });
  await batch.commit();
  const uid = order.customerUid || order.userUid || order.uid || order.ownerUid || "";
  await addDoc(collection(db, "notifications"), {
    title: "تغيرت حالة الطلب",
    body: newStatus,
    orderId: order.id,
    customerDeviceId: order.customerDeviceId || "",
    topic: "order_status",
    isSent: false,
    timestamp: now,
    ...(uid ? customerOwnerFields(uid) : {})
  }).catch(() => undefined);
}

export async function createOrGetConversation(uid: string, name = "", phone = "", conversationKey = "") {
  const id = conversationKey.trim() || `customer_${uid}`;
  const now = nowMs();
  const payload = {
    customerName: name.trim(),
    customerPhone: phone.trim(),
    customerKey: id,
    status: "open",
    updatedAt: now,
    createdAt: now,
    cleanupEligibleAt: now + 30 * 24 * 60 * 60 * 1000,
    ...customerOwnerFields(uid)
  };
  await Promise.all(CHAT_COLLECTIONS.map((name) => setDoc(doc(db, name, id), payload, { merge: true })));
  return id;
}

export function listenConversation(id: string, callback: (item: ChatConversation | null) => void): Unsubscribe {
  let primary: ChatConversation | null = null;
  let secondary: ChatConversation | null = null;
  const emit = () => callback(primary || secondary);
  const unsubs = CHAT_COLLECTIONS.map((name, index) => onSnapshot(doc(db, name, id), (snap) => {
    const value = snap.exists() ? withId<ChatConversation>(snap.id, snap.data()) : null;
    if (index === 0) primary = value;
    else secondary = value;
    emit();
  }));
  return () => unsubs.forEach((fn) => fn());
}

export function listenConversations(callback: (items: ChatConversation[]) => void): Unsubscribe {
  let primary: ChatConversation[] = [];
  let secondary: ChatConversation[] = [];
  const emit = () => {
    const merged = mergeById(primary, secondary)
      .filter((c) => c.status !== "archived")
      .sort((a, b) => (b.lastMessageAt || b.updatedAt || 0) - (a.lastMessageAt || a.updatedAt || 0));
    callback(merged);
  };
  const unsubs = CHAT_COLLECTIONS.map((name, index) => onSnapshot(collection(db, name), (snap) => {
    const list = snap.docs.map((d) => withId<ChatConversation>(d.id, d.data()));
    if (index === 0) primary = list;
    else secondary = list;
    emit();
  }));
  return () => unsubs.forEach((fn) => fn());
}

export function listenMessages(conversationId: string, callback: (items: ChatMessage[]) => void): Unsubscribe {
  let primary: ChatMessage[] = [];
  let secondary: ChatMessage[] = [];
  const emit = () => {
    const merged = mergeById(primary, secondary).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(merged);
  };
  const unsubs = CHAT_COLLECTIONS.map((name, index) => onSnapshot(query(collection(db, name, conversationId, "messages"), orderBy("createdAt"), limit(100)), (snap) => {
    const list = snap.docs.map((d) => withId<ChatMessage>(d.id, d.data()));
    if (index === 0) primary = list;
    else secondary = list;
    emit();
  }));
  return () => unsubs.forEach((fn) => fn());
}

export async function sendChatMessage(conversationId: string, text: string, senderType: "customer" | "admin", uid?: string) {
  const clean = text.trim();
  if (!clean) return;
  const now = nowMs();
  const owner = senderType === "customer" && uid ? customerOwnerFields(uid) : {};
  const primaryMsgRef = doc(collection(db, CHAT_COLLECTION, conversationId, "messages"));
  const batch = writeBatch(db);
  for (const name of CHAT_COLLECTIONS) {
    const msgRef = doc(db, name, conversationId, "messages", primaryMsgRef.id);
    batch.set(msgRef, {
      conversationId,
      senderType,
      text: clean,
      type: "text",
      createdAt: now,
      isRead: false,
      ...owner
    });
    batch.set(doc(db, name, conversationId), {
      lastMessage: clean,
      lastMessageAt: now,
      updatedAt: now,
      cleanupEligibleAt: now + 30 * 24 * 60 * 60 * 1000,
      ...(uid ? customerOwnerFields(uid) : {}),
      [senderType === "admin" ? "unreadForCustomer" : "unreadForAdmin"]: increment(1)
    }, { merge: true });
  }
  await batch.commit();
}


export async function deleteConversation(conversationId: string) {
  for (const name of CHAT_COLLECTIONS) {
    const messages = await getDocs(collection(db, name, conversationId, "messages"));
    const batch = writeBatch(db);
    messages.docs.forEach((m) => batch.delete(doc(db, name, conversationId, "messages", m.id)));
    batch.delete(doc(db, name, conversationId));
    await batch.commit();
  }
}

export async function deleteConversations(conversationIds: string[]) {
  for (const id of conversationIds) await deleteConversation(id);
}

export function markChatRead(conversationId: string, forAdmin: boolean) {
  return Promise.all(CHAT_COLLECTIONS.map((name) => setDoc(doc(db, name, conversationId), { [forAdmin ? "unreadForAdmin" : "unreadForCustomer"]: 0 }, { merge: true }))).then(() => undefined);
}

export async function saveCategoryOrder(categories: string[]) {
  const payload = Object.fromEntries(categories.map((name, index) => [name, index]));
  await setDoc(doc(db, "config", "category_order"), payload);
}

export async function saveCategoryImage(name: string, url: string) {
  await setDoc(doc(db, "config", "category_images"), { [name]: normalizeImageUrl(url) }, { merge: true });
}


export async function saveHomeFixedSection(field: string, section: Partial<HomeFixedSectionItem>) {
  const title = (section.title || "").trim();
  const visible = section.visible !== false && section.isVisible !== false;
  const now = nowMs();
  const sectionKey = homeSectionKeyFromField(field);

  // Android reads fixed home section names/visibility from config/home_section_settings.
  // Keep the older web config/home_fixed_sections mirror for backward compatibility.
  const androidPayload: Record<string, unknown> = {
    fixedVisible: { [sectionKey]: visible },
    [`fixedVisible.${sectionKey}`]: visible,
    [`${sectionKey}_visible`]: visible,
    updatedAt: now
  };
  if (title) {
    androidPayload.fixedTitles = { [sectionKey]: { ar: title } };
    androidPayload[`fixedTitles.${sectionKey}.ar`] = title;
    androidPayload[`${sectionKey}_title_ar`] = title;
  }

  await Promise.all([
    setDoc(doc(db, "config", "home_section_settings"), androidPayload, { merge: true }),
    setDoc(doc(db, "config", "home_fixed_sections"), {
      [field]: {
        ...(title ? { title, localizedTitles: { ar: title }, titleByLocale: { ar: title } } : {}),
        visible,
        isVisible: visible,
        updatedAt: now
      }
    }, { merge: true })
  ]);
}

export async function saveCategoryImageMap(images: Record<string, string>) {
  await setDoc(doc(db, "config", "category_images"), images, { merge: false });
}

export async function renameCategoryEverywhere(oldName: string, newName: string, categories: string[], categoryImages: Record<string, string> = {}) {
  const oldClean = oldName.trim();
  const newClean = newName.trim();
  if (!oldClean || !newClean || oldClean === newClean || isSpecialCategory(oldClean)) return;

  const productsSnap = await getDocs(collection(db, "products"));
  for (let i = 0; i < productsSnap.docs.length; i += 430) {
    const batch = writeBatch(db);
    productsSnap.docs.slice(i, i + 430).forEach((productDoc) => {
      if ((productDoc.data().category || "").trim() === oldClean) {
        batch.update(doc(db, "products", productDoc.id), { category: newClean, updatedAt: nowMs() });
      }
    });
    await batch.commit();
  }

  const ordered = categories.map((name) => name === oldClean ? newClean : name).filter((name, index, arr) => name && arr.indexOf(name) === index);
  await saveCategoryOrder(ordered);

  const nextImages = { ...categoryImages };
  if (nextImages[oldClean] && !nextImages[newClean]) nextImages[newClean] = nextImages[oldClean];
  delete nextImages[oldClean];
  await saveCategoryImageMap(nextImages);
}

export async function deleteCategoryEverywhere(name: string, categories: string[], categoryImages: Record<string, string> = {}) {
  const clean = name.trim();
  if (!clean || isSpecialCategory(clean)) return;

  const productsSnap = await getDocs(collection(db, "products"));
  for (let i = 0; i < productsSnap.docs.length; i += 430) {
    const batch = writeBatch(db);
    productsSnap.docs.slice(i, i + 430).forEach((productDoc) => {
      if ((productDoc.data().category || "").trim() === clean) {
        batch.update(doc(db, "products", productDoc.id), { category: "", updatedAt: nowMs() });
      }
    });
    await batch.commit();
  }

  await saveCategoryOrder(categories.filter((category) => category !== clean));
  const nextImages = { ...categoryImages };
  delete nextImages[clean];
  await saveCategoryImageMap(nextImages);
}

export async function moveCategoryOrder(name: string, step: number, categories: string[]) {
  const clean = name.trim();
  const next = [...categories];
  const from = next.indexOf(clean);
  const to = Math.max(0, Math.min(next.length - 1, from + step));
  if (from < 0 || from === to) return;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  await saveCategoryOrder(next);
}

export async function saveHomeCustomSection(section: Partial<HomeCustomSection> & { id?: string }) {
  const now = nowMs();
  const payload = {
    title: section.title || "قسم جديد",
    localizedTitles: section.localizedTitles || { ar: section.title || "قسم جديد" },
    titleByLocale: section.titleByLocale || { ar: section.title || "قسم جديد" },
    isVisible: section.isVisible !== false,
    visible: section.visible !== false,
    productIds: section.productIds || [],
    sortOrder: section.sortOrder || now,
    updatedAt: now,
    createdAt: section.createdAt || now
  };
  if (section.id) await setDoc(doc(db, "home_custom_sections", section.id), payload, { merge: true });
  else await addDoc(collection(db, "home_custom_sections"), payload);
}



export function listenProductRatings(productId: string, callback: (items: ProductRating[]) => void): Unsubscribe {
  if (!productId) return () => undefined;
  return onSnapshot(query(collection(db, "product_ratings"), where("productId", "==", productId), limit(80)), (snap) => {
    const items = snap.docs
      .map((d) => withId<ProductRating>(d.id, d.data()))
      .sort((a, b) => (b.timestamp || b.updatedAt || 0) - (a.timestamp || a.updatedAt || 0));
    callback(items);
  });
}

function ratingOwnerKey(item: Partial<ProductRating>) {
  return String(item.customerUid || item.userUid || item.uid || item.userId || item.ownerUid || item.customerDeviceId || "").trim();
}

export async function saveProductRating(productId: string, data: { userName?: string; rating: number; comment?: string; uid: string }) {
  const now = nowMs();
  const cleanRating = Math.max(1, Math.min(5, Number(data.rating || 0)));
  const safeUid = String(data.uid || "anonymous").replace(/[\/#?]/g, "_");
  const safeProductId = String(productId).replace(/[\/#?]/g, "_");

  // Android writes ratings as: customerUid_productId. Use the same id so one customer has one real rating across app + web.
  const ratingRef = doc(db, "product_ratings", `${safeUid}_${safeProductId}`);
  const oldWebRatingRef = doc(db, "product_ratings", `${safeProductId}_${safeUid}`);
  const previousSnap = await getDoc(ratingRef);
  const previousTimestamp = previousSnap.exists() ? Number((previousSnap.data() as ProductRating).timestamp || now) : now;

  await setDoc(ratingRef, {
    productId,
    userName: data.userName?.trim() || "زبون",
    customerDeviceId: data.uid,
    rating: cleanRating,
    ...(data.comment !== undefined ? { comment: data.comment.trim() } : {}),
    isVerified: false,
    orderId: "",
    timestamp: previousTimestamp,
    updatedAt: now,
    ...customerOwnerFields(data.uid)
  }, { merge: true });

  if (oldWebRatingRef.path !== ratingRef.path) {
    try {
      const oldSnap = await getDoc(oldWebRatingRef);
      if (oldSnap.exists()) await deleteDoc(oldWebRatingRef);
    } catch {
      // Ignore cleanup failures; the aggregate below de-duplicates by customer uid.
    }
  }

  const ratingSnap = await getDocs(query(collection(db, "product_ratings"), where("productId", "==", productId)));
  const latestByOwner = new Map<string, ProductRating>();
  ratingSnap.docs.forEach((ratingDoc) => {
    const item = withId<ProductRating>(ratingDoc.id, ratingDoc.data());
    const ownerKey = ratingOwnerKey(item) || ratingDoc.id;
    const previous = latestByOwner.get(ownerKey);
    const previousTime = Number(previous?.updatedAt || previous?.timestamp || 0);
    const itemTime = Number(item.updatedAt || item.timestamp || 0);
    if (!previous || itemTime >= previousTime) latestByOwner.set(ownerKey, item);
  });

  const validRatings = Array.from(latestByOwner.values())
    .map((item) => Math.max(1, Math.min(5, Number(item.rating || 0))))
    .filter((value) => value >= 1 && value <= 5);
  const nextCount = validRatings.length;
  const nextSum = validRatings.reduce((sum, value) => sum + value, 0);

  await setDoc(doc(db, "products", productId), {
    ratingSum: nextSum,
    ratingCount: nextCount,
    reviewCount: nextCount,
    ratingAverage: nextCount ? Number((nextSum / nextCount).toFixed(2)) : 0,
    updatedAt: now
  }, { merge: true });
}

export function listenCoupons(callback: (items: Coupon[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "coupons"), (snap) => {
    callback(snap.docs.map((d) => withId<Coupon>(d.id, d.data())).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  });
}

export function saveCoupon(coupon: Partial<Coupon> & { id?: string }) {
  const now = nowMs();
  const id = (coupon.id || coupon.code || "").trim().toUpperCase();
  if (!id) throw new Error("اكتب كود الكوبون");
  return setDoc(doc(db, "coupons", id), {
    code: id,
    type: coupon.type || "percent",
    value: Number(coupon.value || 0),
    isActive: coupon.isActive !== false,
    expiresAt: Number(coupon.expiresAt || 0),
    maxUses: Number(coupon.maxUses || 0),
    usedCount: Number(coupon.usedCount || 0),
    oneUsePerCustomer: Boolean(coupon.oneUsePerCustomer),
    minOrderTotal: Number(coupon.minOrderTotal || 0),
    allowedProductIds: coupon.allowedProductIds || [],
    allowedCategories: coupon.allowedCategories || [],
    allowWithDiscountedProducts: Boolean(coupon.allowWithDiscountedProducts),
    allowWithFlashOffers: Boolean(coupon.allowWithFlashOffers),
    allowStackingDiscounts: Boolean(coupon.allowStackingDiscounts),
    maxFinalDiscountPercent: Number(coupon.maxFinalDiscountPercent || 80),
    updatedAt: now,
    createdAt: coupon.createdAt || now
  }, { merge: true });
}

export async function mirrorLocalState(uid: string, type: "favorites" | "cart", id: string, data: Record<string, unknown>) {
  try {
    await setDoc(doc(db, "customers", uid, type, id), { ...data, ...customerOwnerFields(uid), updatedAt: nowMs() }, { merge: true });
  } catch {
    // Local UX remains available if current Rules do not allow these helper mirrors.
  }
}

export async function getBlacklistPublic() {
  const snap = await getDoc(doc(db, "config", "blacklist_entries"));
  return snap.data()?.entries as Record<string, { identifier?: string; normalizedPhone?: string; reason?: string }> | undefined;
}

export async function logBlockedAttempt(uid: string, data: Record<string, unknown>) {
  return addDoc(collection(db, "blocked_attempts"), { ...data, ...customerOwnerFields(uid), timestamp: nowMs() });
}

export async function saveStoreContact(contact: StoreContact) {
  await setDoc(doc(db, "config", "store_contact"), contact, { merge: true });
}
