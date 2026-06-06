"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { PageHeader } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductCard";

export default function ProductsPage() {
  const { products, productsHasMore, loadMoreProducts, t } = useStore();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.title, p.description, p.category, p.barcode, ...(p.keywords || []), ...(p.searchTags || [])].join(" ").toLowerCase().includes(q));
  }, [products, query]);
  return <main className="container"><PageHeader title="المنتجات" subtitle="بحث بالاسم، الباركود، الفئة أو الكلمات" /><div className="search-bar"><input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث هنا..." /></div><ProductGrid products={filtered} />{productsHasMore ? <button className="btn full wide" onClick={loadMoreProducts}>{t("loadMore")}</button> : null}</main>;
}
