"use client";

import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/AdminGuard";
import { ProductForm } from "@/components/ProductForm";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { saveProduct } from "@/lib/firestore";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products } = useStore();
  const router = useRouter();
  const product = products.find((p) => p.id === id);
  return <AdminGuard><PageHeader title="تعديل المنتج" subtitle={product?.title || id} />{product ? <section className="card"><ProductForm initial={product} onAutoSave={async (p) => { await saveProduct({ ...p, id }, product.createdAt); }} onSubmit={async (p) => { await saveProduct({ ...p, id }, product.createdAt); router.push("/admin/products"); }} /></section> : <div className="empty-state">المنتج غير موجود</div>}</AdminGuard>;
}
