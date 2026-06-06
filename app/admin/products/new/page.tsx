"use client";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/AdminGuard";
import { PageHeader } from "@/components/Navbar";
import { ProductForm } from "@/components/ProductForm";
import { saveProduct } from "@/lib/firestore";
export default function NewProductPage(){const router=useRouter();return <AdminGuard><PageHeader title="إضافة منتج جديد" backHref="/admin/dashboard"/><section className="card"><ProductForm onSubmit={async(p)=>{const id=await saveProduct(p);router.push(`/admin/products/${id}`);}}/></section></AdminGuard>}
