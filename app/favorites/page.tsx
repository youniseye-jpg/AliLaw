"use client";

import { useState } from "react";
import { PageHeader } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductCard";
import { useStore } from "@/components/Providers";

export default function FavoritesPage() {
  const { products, favorites } = useStore();
  const [q, setQ] = useState("");
  const fav = products.filter((p) => favorites.includes(p.id)).filter((p) => `${p.title || ""} ${p.category || ""}`.toLowerCase().includes(q.toLowerCase()));
  return <main className="container"><PageHeader title="المفضلة" /><input className="search-input" placeholder="البحث في المفضلة" value={q} onChange={(e) => setQ(e.target.value)} /><ProductGrid products={fav} empty="لا توجد منتجات في المفضلة" /></main>;
}
