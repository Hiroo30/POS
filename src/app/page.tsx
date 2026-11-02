"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Product, CartItem, SaleTransaction } from "@/lib/types";
import CategoryFilter from "@/components/CategoryFilter";
import PosProductCard from "@/components/PosProductCard";
import CartSidebar from "@/components/CartSidebar";
import CheckoutModal from "@/components/CheckoutModal";
import ReceiptModal from "@/components/ReceiptModal";

interface SummaryData {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAssetValue: number;
  totalPotentialRevenue: number;
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
}

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleTransaction | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [dateStr, setDateStr] = useState("Hari ini");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, sumRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/summary"),
      ]);
      const prodData = await prodRes.json();
      const sumData = await sumRes.json();
      if (prodData.success) setProducts(prodData.data);
      if (sumData.success) setSummary(sumData.data);
    } catch (err) {
      console.error("Gagal memuat data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== "semua") list = list.filter((p) => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, searchQuery, selectedCategory]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = { semua: products.length };
    products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [products]);

  const handleAddToCart = (product: Product, unitUsed: "BASE" | "PACK") => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (it) => it.product.id === product.id && it.unitUsed === unitUsed
      );
      const pricePerUnit =
        unitUsed === "PACK" && product.hasMultiUnit && product.sellPricePack
          ? product.sellPricePack
          : product.sellPrice;
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty, subtotal: newQty * pricePerUnit };
        return updated;
      } else {
        return [...prev, { product, quantity: 1, unitUsed, pricePerUnit, subtotal: pricePerUnit }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, unitUsed: "BASE" | "PACK", newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((it) => !(it.product.id === productId && it.unitUsed === unitUsed)));
    } else {
      setCart((prev) =>
        prev.map((it) =>
          it.product.id === productId && it.unitUsed === unitUsed
            ? { ...it, quantity: newQty, subtotal: newQty * it.pricePerUnit }
            : it
        )
      );
    }
  };

  const totalAmount = cart.reduce((s, it) => s + it.subtotal, 0);
  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);

  const handleCheckoutSuccess = (sale: SaleTransaction) => {
    setLastSale(sale);
    setCart([]);
    setShowCheckout(false);
    setShowReceipt(true);
    loadData();
  };

  return (
    <>
      {/* Top bar */}
      <div className="kp-topbar">
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span className="kp-topbar-title">Dashboard Kasir</span>
          <span style={{fontSize:11, color:"#94a3b8", background:"#f1f5f9", padding:"2px 8px", borderRadius:4, fontWeight:600}}>
            {dateStr}
          </span>
        </div>
        <div className="kp-topbar-actions">
          <button className="kp-btn-secondary" onClick={loadData} style={{fontSize:11, padding:"5px 10px"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
          {/* Mobile cart btn */}
          <button
            className="kp-btn-primary"
            style={{display:"none"}}
            onClick={() => setShowCart(true)}
            id="mobile-cart-btn"
          >
            Keranjang ({cartCount})
          </button>
        </div>
      </div>

      {/* Main POS Layout */}
      <div style={{display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 52px)"}}>
        {/* Left: Product Catalog */}
        <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
          {/* Summary Cards */}
          <div style={{padding:"12px 16px 0", background:"#f0f4f0"}}>
            <div className="grid-3" style={{marginBottom:12, gap:10}}>
              <div className="kp-card">
                <div className="kp-card-header">
                  <span className="kp-card-title">Transaksi Hari Ini</span>
                  <span className="kp-card-date">{dateStr}</span>
                </div>
                <div className="kp-card-body">
                  <div className="kp-card-icon yellow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  </div>
                  <div className="kp-card-value">
                    <div className="kp-card-number">{summary?.todaySales ?? 0}</div>
                    <div className="kp-card-sublabel">nota selesai</div>
                  </div>
                </div>
              </div>

              <div className="kp-card">
                <div className="kp-card-header">
                  <span className="kp-card-title">Pendapatan</span>
                  <span className="kp-card-date">{dateStr}</span>
                </div>
                <div className="kp-card-body">
                  <div className="kp-card-icon green">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div className="kp-card-value">
                    <div className="kp-card-number green" style={{fontSize:15}}>
                      {formatRupiah(summary?.todayRevenue ?? 0)}
                    </div>
                    <div className="kp-card-sublabel">omzet hari ini</div>
                  </div>
                </div>
              </div>

              <div className="kp-card">
                <div className="kp-card-header">
                  <span className="kp-card-title">Keuntungan</span>
                  <span className="kp-card-date">{dateStr}</span>
                </div>
                <div className="kp-card-body">
                  <div className="kp-card-icon green">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                      <polyline points="17 6 23 6 23 12"/>
                    </svg>
                  </div>
                  <div className="kp-card-value">
                    <div className="kp-card-number green" style={{fontSize:15}}>
                      {formatRupiah(summary?.todayProfit ?? 0)}
                    </div>
                    <div className="kp-card-sublabel">laba bersih</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Category */}
            <div style={{marginBottom:8}}>
              <div className="kp-search">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Cari produk, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{border:"none", background:"none", cursor:"pointer", color:"#94a3b8", padding:0, display:"flex"}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              productCounts={productCounts}
              products={products}
            />
          </div>

          {/* Product Grid */}
          <div style={{flex:1, overflowY:"auto", padding:"8px 16px 16px"}}>
            {isLoading ? (
              <div style={{textAlign:"center", padding:60, color:"#94a3b8"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{animation:"spin 1s linear infinite", display:"inline-block"}}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                <div style={{marginTop:8, fontSize:13}}>Memuat produk...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{textAlign:"center", padding:60, color:"#94a3b8"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{display:"inline-block"}}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <div style={{marginTop:12, fontSize:14, fontWeight:600}}>Produk tidak ditemukan</div>
                <div style={{fontSize:12, marginTop:4}}>Coba kata kunci lain</div>
              </div>
            ) : (
              <div className="kp-product-grid">
                {filteredProducts.map((product) => (
                  <PosProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    cartItems={cart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <CartSidebar
          cart={cart}
          totalAmount={totalAmount}
          onUpdateQuantity={handleUpdateQuantity}
          onCheckout={() => setShowCheckout(true)}
          onClearCart={() => setCart([])}
        />
      </div>

      {/* Modals */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          totalAmount={totalAmount}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
      {showReceipt && lastSale && (
        <ReceiptModal
          sale={lastSale}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Mobile floating cart button */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-cart-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
