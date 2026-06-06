"use client";

import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from "firebase/auth";

let persistenceReady: Promise<void> | null = null;

function getFirebaseErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code || "");
  }
  return "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapPasswordResetError(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (code === "auth/invalid-email") {
    return new Error("صيغة البريد الإلكتروني غير صحيحة");
  }

  if (code === "auth/missing-email") {
    return new Error("أدخل بريد المدير أولاً");
  }

  if (code === "auth/network-request-failed") {
    return new Error("تعذر الاتصال بالإنترنت. حاول مرة أخرى");
  }

  if (code === "auth/too-many-requests") {
    return new Error("تم إرسال محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى");
  }

  if (code === "auth/operation-not-allowed") {
    return new Error("إعادة تعيين كلمة المرور غير مفعلة في Firebase Authentication");
  }

  return new Error("فشل إرسال رابط إعادة التعيين. تأكد من البريد وإعدادات Firebase Authentication");
}

export function initAuthPersistence() {
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  }
  return persistenceReady;
}

export function onAuth(callback: (user: User | null) => void) {
  initAuthPersistence().catch(() => undefined);
  return onAuthStateChanged(auth, callback);
}

export async function ensureAnonymous() {
  await initAuthPersistence();
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function getAdminRole(uid: string) {
  const snap = await getDoc(doc(db, "admins", uid));
  const data = snap.data();
  const role = String(data?.role || "");
  const ok = snap.exists() && data?.active === true && ["owner", "admin"].includes(role);
  return ok ? { role, email: data?.email || "" } : null;
}

export async function loginAdmin(email: string, password: string) {
  await initAuthPersistence();
  const cleanEmail = normalizeEmail(email);
  const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const admin = await getAdminRole(result.user.uid);
  if (!admin) {
    await signOut(auth);
    throw new Error("هذا الحساب ليس مديراً فعالاً داخل admins/{uid}");
  }
  return { uid: result.user.uid, role: admin.role, email: result.user.email || cleanEmail };
}

export async function logoutToAnonymous() {
  await signOut(auth);
  return ensureAnonymous();
}

export async function resetPassword(email: string) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new Error("أدخل البريد الإلكتروني أولاً");
  await initAuthPersistence();
  try {
    return await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    throw mapPasswordResetError(error);
  }
}

export async function resetAdminPassword(email: string) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new Error("أدخل بريد المدير أولاً");

  await initAuthPersistence();

  try {
    return await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    throw mapPasswordResetError(error);
  }
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  const email = user?.email || "";
  if (!user || !email || user.isAnonymous) throw new Error("لا يوجد مدير مسجل دخول");
  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
