"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Product, CartItem, SaleTransaction } from "@/lib/types";
import CategoryFilter from "@/components/CategoryFilter";
import PosProductCard from "@/components/PosProductCard";
import CartSidebar from "@/components/CartSidebar";
import CheckoutModal from "@/components/CheckoutModal";
import ReceiptModal from "@/components/ReceiptModal";
import CashDrawerModal from "@/components/CashDrawerModal";
import { deviceFetch, getDeviceId, getDeviceLabel } from "@/lib/device";

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
  const [customers, setCustomers] = useState<string[]>(["Walk-in (Umum)"]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("Walk-in (Umum)");
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleTransaction | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [dateStr, setDateStr] = useState("Hari ini");
  const [timeStr, setTimeStr] = useState("14:30 WIB");
  const [deviceId, setDeviceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [cashDrawerAmount, setCashDrawerAmount] = useState<number>(0);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState<boolean>(false);

  // Load per-device cart, customers & cash drawer on mount
  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    setDeviceLabel(getDeviceLabel());
    try {
      const savedCart = localStorage.getItem(`pos_cart_${id}`);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
      const savedDrawer = localStorage.getItem(`pos_cash_drawer_${id}`);
      if (savedDrawer) {
        const num = parseInt(savedDrawer, 10);
        if (!isNaN(num)) setCashDrawerAmount(num);
      }
      try {
        localStorage.removeItem("pos_customers");
      } catch {}
      const savedCust = localStorage.getItem(`pos_customers_${id}`);
      if (savedCust) {
        try {
          const parsedCust = JSON.parse(savedCust);
          if (Array.isArray(parsedCust)) {
            // Remove old hardcoded demo customers if present
            const cleanCust = parsedCust.filter((c: string) => c !== "Pak RT Bambang" && c !== "Bu Siti Warung");
            if (!cleanCust.includes("Walk-in (Umum)")) cleanCust.unshift("Walk-in (Umum)");
            setCustomers(cleanCust);
            localStorage.setItem(`pos_customers_${id}`, JSON.stringify(cleanCust));
          }
        } catch {}
      } else {
        setCustomers(["Walk-in (Umum)"]);
      }
    } catch {
      // fallback
    }
  }, []);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustomerName.trim();
    if (!name) return;
    if (!customers.includes(name)) {
      const updated = [...customers, name];
      setCustomers(updated);
      try {
        if (deviceId) {
          localStorage.setItem(`pos_customers_${deviceId}`, JSON.stringify(updated));
        }
      } catch {}
    }
    setSelectedCustomer(name);
    setNewCustomerName("");
    setShowAddCustomerModal(false);
  };

  const handleDeleteCustomer = (nameToDelete: string) => {
    if (nameToDelete === "Walk-in (Umum)") return;
    const updated = customers.filter((c) => c !== nameToDelete);
    setCustomers(updated);
    if (selectedCustomer === nameToDelete) {
      setSelectedCustomer("Walk-in (Umum)");
    }
    try {
      if (deviceId) {
        localStorage.setItem(`pos_customers_${deviceId}`, JSON.stringify(updated));
      }
    } catch {}
  };

  const handleSaveCashDrawer = (newAmount: number) => {
    setCashDrawerAmount(newAmount);
    try {
      if (deviceId) {
        localStorage.setItem(`pos_cash_drawer_${deviceId}`, newAmount.toString());
      }
    } catch {
      // fallback
    }
  };

  // Save cart changes strictly scoped to this device
  useEffect(() => {
    if (!deviceId) return;
    try {
      localStorage.setItem(`pos_cart_${deviceId}`, JSON.stringify(cart));
    } catch {
      // fallback
    }
  }, [cart, deviceId]);

  useEffect(() => {
    const now = new Date();
    setDateStr(
      now.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
    setTimeStr(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB");
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, sumRes] = await Promise.all([
        deviceFetch("/api/products"),
        deviceFetch("/api/summary"),
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
    try {
      if (deviceId) localStorage.removeItem(`pos_cart_${deviceId}`);
    } catch {}
    setShowCheckout(false);
    setShowReceipt(true);
    loadData();
  };

  const handleClearCart = () => {
    setCart([]);
    try {
      if (deviceId) localStorage.removeItem(`pos_cart_${deviceId}`);
    } catch {}
  };

  return (
    <>
      {/* Top Header Navigation Bar (Stitch Design - Desktop Only) */}
      <header
        className="app-desktop-header items-center justify-between sticky top-0 z-30 px-5 bg-white border-b border-slate-200 shadow-2xs"
        style={{ height: 60 }}
      >
        {/* Search & Barcode Scan Bar */}
        <div style={{display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 440}}>
          <div style={{
            position: "relative", width: "100%", display: "flex", alignItems: "center",
            background: "#f1f5f9", borderRadius: 10, padding: "0 12px"
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Cari barang (F2) atau scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                padding: "8px 8px 8px 10px", fontSize: 12.5, color: "#0f172a"
              }}
            />
            <span style={{
              fontSize: 10, fontWeight: 800, background: "#e2e8f0", color: "#64748b",
              padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5
            }}>
              F2
            </span>
          </div>
        </div>

        {/* Right Status Actions */}
        <div style={{display: "flex", alignItems: "center", gap: 12}}>
          {/* Device Terminal Tag */}
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{deviceLabel || "Terminal POS"}</span>
          </div>

          {/* Cash Drawer Pill (Interactive / Editable) */}
          <button
            type="button"
            onClick={() => setShowCashDrawerModal(true)}
            className="desktop-only flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 text-emerald-900 transition-all cursor-pointer shadow-2xs group"
            title="Klik untuk ubah / sesuaikan saldo uang laci kasir"
          >
            <span className="text-[11px] text-emerald-800 font-semibold group-hover:text-emerald-900">
              Uang Laci:
            </span>
            <span className="text-xs font-black text-emerald-700 group-hover:text-emerald-800">
              {formatRupiah(cashDrawerAmount)}
            </span>
            <span className="material-symbols-outlined text-[15px] text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity">
              edit
            </span>
          </button>

          {/* Time & Shift */}
          <div className="desktop-only" style={{fontSize: 11, color: "#64748b", fontWeight: 600}}>
            {timeStr} • Shift Pagi
          </div>

          {/* Cloud Sync OK */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#f8fafc", padding: "5px 10px", borderRadius: 8,
            border: "1px solid #e2e8f0", fontSize: 11, fontWeight: 700, color: "#10b981"
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
            Sync OK
          </div>

          {/* Refresh button */}
          <button
            onClick={loadData}
            style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, fontSize: 11.5,
              fontWeight: 700, color: "#475569"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Muat Ulang
          </button>
        </div>
      </header>

      {/* Main POS Layout */}
      <div className="flex flex-col md:flex-row flex-1 md:h-[calc(100vh-60px)] md:overflow-hidden">
        {/* Left Column: Metrics + Customer Select + Categories + Catalog */}
        <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
          {/* Top Control Section */}
          <div className="p-3 md:p-4 bg-slate-50 border-b border-slate-200">
            {/* Mobile Barcode & Search Input (Visible on mobile only) */}
            <div className="mobile-only relative mb-2">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Scan barcode atau cari sembako..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            {/* Mobile Cash Drawer Bar */}
            <div className="mobile-only flex items-center justify-between mb-3 px-0.5">
              <button
                type="button"
                onClick={() => setShowCashDrawerModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-700">payments</span>
                <span>Uang Laci: <strong className="text-emerald-700">{formatRupiah(cashDrawerAmount)}</strong></span>
                <span className="material-symbols-outlined text-[13px] text-emerald-600">edit</span>
              </button>
              <span className="text-[11px] text-slate-500 font-medium">Shift 1 Pagi</span>
            </div>
            {/* Top Metrics Ribbon (Stitch Design: 4 KPIs) */}
            <div className="grid-3" style={{marginBottom: 10, gap: 10}}>
              {/* Metric 1: Transaksi Selesai */}
              <div style={{
                background: "#ffffff", padding: "10px 14px", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <div>
                  <div style={{fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5}}>
                    Transaksi Selesai
                  </div>
                  <div style={{fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 2}}>
                    {summary?.todaySales ?? 0} Nota
                  </div>
                  <div style={{fontSize: 10, color: "#10b981", fontWeight: 600, marginTop: 2}}>
                    ↑ Hari Ini
                  </div>
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#006c49"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
              </div>

              {/* Metric 2: Omzet Hari Ini */}
              <div style={{
                background: "#ffffff", padding: "10px 14px", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <div>
                  <div style={{fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5}}>
                    Omzet Penjualan
                  </div>
                  <div style={{fontSize: 16, fontWeight: 800, color: "#006c49", marginTop: 2}}>
                    {formatRupiah(summary?.todayRevenue ?? 0)}
                  </div>
                  <div style={{fontSize: 10, color: "#64748b", marginTop: 2}}>
                    Total kotor kasir
                  </div>
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "#f0fdf4",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
              </div>

              {/* Metric 3: Estimasi Laba */}
              <div style={{
                background: "#ffffff", padding: "10px 14px", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <div>
                  <div style={{fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5}}>
                    Estimasi Laba
                  </div>
                  <div style={{fontSize: 16, fontWeight: 800, color: "#10b981", marginTop: 2}}>
                    {formatRupiah(summary?.todayProfit ?? 0)}
                  </div>
                  <div style={{fontSize: 10, color: "#10b981", fontWeight: 600, marginTop: 2}}>
                    {summary?.todayRevenue && summary.todayRevenue > 0
                      ? `+${((summary.todayProfit / summary.todayRevenue) * 100).toFixed(1)}% net margin`
                      : "0.0% net margin"}
                  </div>
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "#ecfdf5",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#059669"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Quick Customer Fast Selector (Editable & Dynamic) */}
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap"}}>
              <span style={{fontSize: 11, fontWeight: 700, color: "#64748b", display: "flex", alignItems: "center", gap: 4}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Pelanggan:
              </span>
              {customers.map((c) => {
                const isSelected = selectedCustomer === c;
                const isWalkIn = c === "Walk-in (Umum)";
                return (
                  <div key={c} className="inline-flex items-center rounded-lg overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: isSelected ? "none" : "1px solid #e2e8f0",
                        background: isSelected ? "#006c49" : "#ffffff",
                        color: isSelected ? "#ffffff" : "#475569",
                        borderTopRightRadius: isWalkIn ? 8 : 0,
                        borderBottomRightRadius: isWalkIn ? 8 : 0,
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {c}
                    </button>
                    {!isWalkIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(c);
                        }}
                        style={{
                          padding: "4px 7px",
                          fontSize: 10,
                          fontWeight: 800,
                          cursor: "pointer",
                          border: isSelected ? "none" : "1px solid #e2e8f0",
                          borderLeft: "none",
                          background: isSelected ? "#005237" : "#f8fafc",
                          color: isSelected ? "#a7f3d0" : "#94a3b8",
                          borderTopRightRadius: 8,
                          borderBottomRightRadius: 8,
                          transition: "all 0.15s ease",
                        }}
                        title={`Hapus pelanggan ${c}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              {/* + Tambah Pelanggan Button */}
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px dashed #10b981",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.15s ease",
                }}
                title="Tambah nama pelanggan atau langganan warung baru"
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                <span>+ Pelanggan</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              productCounts={productCounts}
              products={products}
            />
          </div>

          {/* Product Grid Area */}
          <div style={{flex: 1, overflowY: "auto", padding: "14px 18px 110px", background: "#f4f6fb"}}>
            {isLoading ? (
              <div style={{textAlign: "center", padding: 60, color: "#94a3b8"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation: "spin 1s linear infinite", display: "inline-block"}}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                <div style={{marginTop: 8, fontSize: 13, fontWeight: 600}}>Memuat katalog produk Toko Dewi...</div>
              </div>
            ) : products.length === 0 ? (
              <div style={{textAlign: "center", padding: "60px 20px", color: "#64748b"}}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20, background: "#ecfdf5",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "#059669", marginBottom: 16
                }}>
                  <span className="material-symbols-outlined text-[36px]">inventory_2</span>
                </div>
                <div style={{fontSize: 16, fontWeight: 800, color: "#1e293b"}}>Katalog Toko Masih Kosong</div>
                <div style={{fontSize: 12.5, color: "#64748b", marginTop: 4, maxWidth: 360, margin: "4px auto 16px"}}>
                  Data mulai bersih dari nol. Silakan tambahkan barang jualan pertama Anda di menu Katalog & Stok.
                </div>
                <a
                  href="/produk"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", borderRadius: 10, background: "#006c49",
                    color: "#ffffff", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(0,108,73,0.25)"
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>+ Tambah Produk ke Katalog</span>
                </a>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{textAlign: "center", padding: 60, color: "#94a3b8"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{display: "inline-block"}}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <div style={{marginTop: 12, fontSize: 14, fontWeight: 700}}>Produk tidak ditemukan</div>
                <div style={{fontSize: 12, marginTop: 4}}>Coba kata kunci atau pilih kategori lain</div>
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

        {/* Right Column: Persistent Desktop Cart */}
        <CartSidebar
          cart={cart}
          totalAmount={totalAmount}
          onUpdateQuantity={handleUpdateQuantity}
          onCheckout={() => setShowCheckout(true)}
          onClearCart={handleClearCart}
        />
      </div>

      {/* Mobile Floating Cart Trigger (Visible on Phones < 768px when items added) */}
      {cart.length > 0 && (
        <div className="kp-floating-cart app-floating-cart" onClick={() => setShowCart(true)}>
          <div style={{display: "flex", alignItems: "center", gap: 10}}>
            <div style={{
              background: "#ffffff", color: "#006c49",
              borderRadius: "50%", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
            }}>
              {cartCount}
            </div>
            <div>
              <div style={{fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.9, lineHeight: 1}}>
                Pesanan: {selectedCustomer}
              </div>
              <div style={{fontSize: 14, fontWeight: 900, marginTop: 2}}>
                {formatRupiah(totalAmount)}
              </div>
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.25)", padding: "6px 12px",
            borderRadius: 8, fontSize: 12, fontWeight: 800
          }}>
            <span>Lihat Keranjang</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer (Bottom Sheet) */}
      {showCart && (
        <div className="kp-drawer-overlay" onClick={() => setShowCart(false)}>
          <div className="kp-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={{
              padding: "14px 18px",
              background: "linear-gradient(135deg, #006c49 0%, #059669 100%)",
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div>
                <div style={{fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5}}>
                  Keranjang Toko DEWI
                </div>
                <div style={{fontSize: 11, color: "#a7f3d0", marginTop: 2}}>
                  {cartCount} item • {selectedCustomer}
                </div>
              </div>
              <div style={{display: "flex", alignItems: "center", gap: 8}}>
                {cart.length > 0 && (
                  <button
                    onClick={() => { setCart([]); setShowCart(false); }}
                    style={{
                      background: "rgba(255,255,255,0.18)", border: "none",
                      borderRadius: 6, padding: "5px 10px", color: "#fff",
                      fontSize: 10.5, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  onClick={() => setShowCart(false)}
                  style={{
                    background: "rgba(255,255,255,0.22)", border: "none",
                    borderRadius: 6, width: 30, height: 30, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 14, fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Drawer Items List */}
            <div style={{maxHeight: "48vh", overflowY: "auto", padding: "8px 0"}}>
              {cart.map((item, idx) => {
                const unitLabel = item.unitUsed === "PACK" && item.product.packUnit
                  ? item.product.packUnit
                  : item.product.baseUnit;
                return (
                  <div key={`${item.product.id}-${item.unitUsed}`} className="kp-cart-item">
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", background: "#006c49",
                      color: "#fff", fontSize: 10, fontWeight: 800, display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div className="kp-cart-item-name" style={{fontSize: 12.5, fontWeight: 700}}>
                        {item.product.name}
                      </div>
                      <div className="kp-cart-item-price">
                        {new Intl.NumberFormat("id-ID").format(item.pricePerUnit)} × {item.quantity} {unitLabel}
                      </div>
                    </div>
                    <div style={{textAlign: "right", flexShrink: 0}}>
                      <div style={{fontSize: 13, fontWeight: 800, color: "#006c49", marginBottom: 4}}>
                        {new Intl.NumberFormat("id-ID").format(item.subtotal)}
                      </div>
                      <div className="kp-cart-qty-control">
                        <button className="kp-qty-btn" onClick={() => handleUpdateQuantity(item.product.id, item.unitUsed, item.quantity - 1)}>−</button>
                        <span style={{fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: "center"}}>{item.quantity}</span>
                        <button className="kp-qty-btn" onClick={() => handleUpdateQuantity(item.product.id, item.unitUsed, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div style={{padding: "14px 18px", borderTop: "1px solid #e2e8f0", background: "#fff"}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12}}>
                <span style={{fontSize: 13, color: "#64748b", fontWeight: 600}}>Total Tagihan:</span>
                <span style={{fontSize: 20, fontWeight: 900, color: "#006c49"}}>{formatRupiah(totalAmount)}</span>
              </div>
              <button
                className="kp-pay-btn"
                style={{marginTop: 0, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"}}
                onClick={() => { setShowCart(false); setShowCheckout(true); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                PROSES PEMBAYARAN
              </button>
            </div>
          </div>
        </div>
      )}

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
      <CashDrawerModal
        isOpen={showCashDrawerModal}
        onClose={() => setShowCashDrawerModal(false)}
        currentAmount={cashDrawerAmount}
        onSave={handleSaveCashDrawer}
        deviceLabel={deviceLabel || "Kasir"}
      />

      {/* Modal Tambah Pelanggan Baru */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="bg-gradient-to-r from-[#1b2e1f] to-emerald-800 p-4 text-white flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/50 flex items-center justify-center text-white border border-emerald-400/30">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Tambah Pelanggan Baru</h3>
                  <p className="text-[11px] text-emerald-200">Tombol cepat kasir POS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Pelanggan / Warung
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Contoh: Bu Siti Warung / Mas Joko"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl text-sm font-semibold text-slate-800 outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nama akan muncul sebagai tombol pilihan cepat di samping Walk-in (Umum) dan bisa dihapus kapan saja dengan tombol ✕.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
                >
                  Simpan & Pilih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
