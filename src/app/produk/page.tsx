"use client";

import { useState, useEffect, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import QuickStockModal from "@/components/QuickStockModal";
import ProductFormModal from "@/components/ProductFormModal";
import CategoryFilter from "@/components/CategoryFilter";
import type { Product, TransactionType } from "@/lib/types";

interface Summary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAssetValue: number;
  totalPotentialRevenue: number;
}

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [filterMode, setFilterMode] = useState<"ALL" | "LOW" | "OUT">("ALL");
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalMode, setQuickModalMode] = useState<TransactionType>("IN");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, sumRes] = await Promise.all([fetch("/api/products"), fetch("/api/summary")]);
      const prodData = await prodRes.json();
      const sumData = await sumRes.json();
      if (prodData.success) setProducts(prodData.data);
      if (sumData.success) setSummary(sumData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (filterMode === "LOW") list = list.filter((p) => p.stockInBase > 0 && p.stockInBase <= (p.minStockInBase ?? 5));
    else if (filterMode === "OUT") list = list.filter((p) => p.stockInBase <= 0);
    if (selectedCategory !== "semua") list = list.filter((p) => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode?.toLowerCase().includes(q)));
    }
    return list;
  }, [products, searchQuery, selectedCategory, filterMode]);

  const productCounts = useMemo(() => {
    const c: Record<string, number> = { semua: products.length };
    products.forEach((p) => { c[p.category] = (c[p.category] || 0) + 1; });
    return c;
  }, [products]);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:60, right:16, zIndex:99,
          background:"#1b2e1f", color:"#fff", fontWeight:700,
          padding:"10px 16px", borderRadius:8, fontSize:12,
          display:"flex", alignItems:"center", gap:8,
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
          animation:"slideDown 0.2s ease-out"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {toast}
        </div>
      )}

      {/* Top Bar */}
      <div className="kp-topbar">
        <span className="kp-topbar-title">Katalog & Manajemen Stok</span>
        <div className="kp-topbar-actions">
          <button className="kp-btn-primary" onClick={() => { setProductToEdit(null); setFormModalOpen(true); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Barang
          </button>
          <button className="kp-btn-secondary" onClick={loadData} style={{padding:"8px 10px"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="kp-content">
        {/* Summary Cards */}
        <div className="grid-3" style={{marginBottom:16, gap:10}}>
          <div className="kp-card">
            <div className="kp-card-header">
              <span className="kp-card-title">Total Produk</span>
            </div>
            <div className="kp-card-body">
              <div className="kp-card-icon blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <div className="kp-card-value">
                <div className="kp-card-number">{summary?.totalItems ?? 0}</div>
                <div className="kp-card-sublabel">jenis barang</div>
              </div>
            </div>
          </div>

          <div className="kp-card">
            <div className="kp-card-header">
              <span className="kp-card-title">Stok Menipis</span>
            </div>
            <div className="kp-card-body">
              <div className="kp-card-icon yellow">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="kp-card-value">
                <div className="kp-card-number yellow">{summary?.lowStockCount ?? 0}</div>
                <div className="kp-card-sublabel">perlu restock</div>
              </div>
            </div>
          </div>

          <div className="kp-card">
            <div className="kp-card-header">
              <span className="kp-card-title">Nilai Aset Stok</span>
            </div>
            <div className="kp-card-body">
              <div className="kp-card-icon green">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="kp-card-value">
                <div className="kp-card-number green" style={{fontSize:14}}>{formatRupiah(summary?.totalAssetValue ?? 0)}</div>
                <div className="kp-card-sublabel">modal stok</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="kp-card" style={{marginBottom:12, padding:"12px 14px"}}>
          {/* Filter tabs */}
          <div style={{display:"flex", gap:6, marginBottom:10, flexWrap:"wrap"}}>
            {[
              { key:"ALL", label:`Semua (${products.length})`, color:"#1b2e1f" },
              { key:"LOW", label:`Stok Menipis (${summary?.lowStockCount ?? 0})`, color:"#d97706" },
              { key:"OUT", label:`Stok Habis (${summary?.outOfStockCount ?? 0})`, color:"#dc2626" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterMode(tab.key as "ALL" | "LOW" | "OUT")}
                style={{
                  padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700,
                  border: filterMode === tab.key ? "none" : "1px solid #e2e8f0",
                  background: filterMode === tab.key ? tab.color : "#f8fafc",
                  color: filterMode === tab.key ? "#fff" : tab.color,
                  cursor:"pointer"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="kp-search" style={{marginBottom:10}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Cari nama barang atau barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} productCounts={productCounts} />
        </div>

        {/* Product List */}
        {isLoading ? (
          <div style={{textAlign:"center", padding:60, color:"#94a3b8"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{animation:"spin 1s linear infinite", display:"inline-block"}}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{marginTop:8, fontSize:13}}>Memuat data...</div>
          </div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10}}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onStockIn={(p) => { setSelectedProduct(p); setQuickModalMode("IN"); setQuickModalOpen(true); }}
                onStockOut={(p) => { setSelectedProduct(p); setQuickModalMode("OUT"); setQuickModalOpen(true); }}
                onEdit={(p) => { setProductToEdit(p); setFormModalOpen(true); }}
                onAdjust={(p) => { setSelectedProduct(p); setQuickModalMode("ADJUST"); setQuickModalOpen(true); }}
              />
            ))}
          </div>
        )}
      </div>

      <QuickStockModal
        product={selectedProduct}
        mode={quickModalMode}
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        onSuccess={() => {
          loadData();
          showToast(quickModalMode === "IN" ? `Stok ${selectedProduct?.name} bertambah!` : `Stok ${selectedProduct?.name} diperbarui!`);
        }}
      />
      <ProductFormModal
        productToEdit={productToEdit}
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          loadData();
          showToast(productToEdit ? `Data "${productToEdit.name}" berhasil diubah!` : "Barang baru berhasil ditambahkan!");
        }}
      />
    </>
  );
}
