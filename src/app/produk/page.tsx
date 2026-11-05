"use client";

import { useState, useEffect, useMemo } from "react";
import QuickStockModal from "@/components/QuickStockModal";
import ProductFormModal from "@/components/ProductFormModal";
import type { Product, TransactionType } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";
import CategoryIcon from "@/components/CategoryIcon";
import { deviceFetch } from "@/lib/device";

interface Summary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAssetValue: number;
  totalPotentialRevenue: number;
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [filterMode, setFilterMode] = useState<"ALL" | "LOW" | "OUT" | "SAFE">("ALL");
  const [sortBy, setSortBy] = useState<"stok_asc" | "stok_desc" | "margin_desc" | "name_asc">("stok_asc");

  // Modals
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalMode, setQuickModalMode] = useState<TransactionType>("IN");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSeedStarterProducts = async () => {
    setIsSeeding(true);
    try {
      const res = await deviceFetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("15 produk sembako contoh berhasil dimuat!", "success");
        await loadData();
      }
    } catch (err) {
      console.error("Gagal memuat produk contoh:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const loadData = async () => {
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
      console.error("Gagal memuat data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.stockInBase <= (p.minStockInBase ?? 5));
  }, [products]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Status filter
    if (filterMode === "LOW") {
      list = list.filter((p) => p.stockInBase > 0 && p.stockInBase <= (p.minStockInBase ?? 5));
    } else if (filterMode === "OUT") {
      list = list.filter((p) => p.stockInBase <= 0);
    } else if (filterMode === "SAFE") {
      list = list.filter((p) => p.stockInBase > (p.minStockInBase ?? 5));
    }

    // Category filter
    if (selectedCategory !== "semua") {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "stok_asc") return a.stockInBase - b.stockInBase;
      if (sortBy === "stok_desc") return b.stockInBase - a.stockInBase;
      if (sortBy === "margin_desc") {
        const marginA = a.costPrice ? (a.sellPrice - a.costPrice) / a.costPrice : 0;
        const marginB = b.costPrice ? (b.sellPrice - b.costPrice) / b.costPrice : 0;
        return marginB - marginA;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [products, searchQuery, selectedCategory, filterMode, sortBy]);

  const handleSendSupplierWhatsApp = () => {
    if (lowStockItems.length === 0) {
      showToast("Tidak ada stok menipis saat ini! Semua komoditas aman.", "info");
      return;
    }

    let message = `*DAFTAR KULAKAN / RESTOK TOKO DEWI*\nTanggal: ${new Date().toLocaleDateString("id-ID")}\n\n`;
    lowStockItems.forEach((item, index) => {
      const needed = Math.max(1, (item.minStockInBase ?? 10) * 2 - item.stockInBase);
      message += `${index + 1}. *${item.name}*\n   Sisa: ${item.stockInBase} ${item.baseUnit} | Order: +${needed} ${item.hasMultiUnit && item.packUnit ? item.packUnit : item.baseUnit}\n`;
    });
    message += `\nMohon dicek ketersediaannya agen/supplier. Terima kasih!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handlePrintShoppingList = () => {
    window.print();
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-[#131b2e] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/30 text-sm font-semibold animate-bounce">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            {toast.type === "success" ? "check_circle" : "info"}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Action Context & Meta Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                inventory_2
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Katalog & Stok Gudang
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {products.length} SKU Aktif
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  Toko DEWI
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Monitoring fisik komoditas sembako, pergerakan margin grosir, dan otomatisasi restok agen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.open("/api/maintenance?format=csv", "_blank")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold transition-all shadow-xs"
              title="Unduh file spreadsheet Excel / CSV"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh CSV</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold transition-all shadow-xs"
              title="Perbarui data dari server"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                setProductToEdit(null);
                setFormModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs md:text-sm font-bold transition-all shadow-sm active:scale-95"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* KPI 1: Nilai Aset */}
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Nilai Total Aset Stok
                </span>
                <div className="mt-1 text-lg md:text-2xl font-bold text-slate-800">
                  {formatRupiah(summary?.totalAssetValue ?? 0)}
                </div>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                <span className="material-symbols-outlined text-[20px] md:text-[22px]">
                  account_balance_wallet
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-50 pt-2">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                Potensi Omzet:
              </span>
              <span className="font-bold text-slate-700">
                {formatRupiah(summary?.totalPotentialRevenue ?? 0)}
              </span>
            </div>
          </div>

          {/* KPI 2: Stok Kritis & Menipis */}
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Stok Menipis & Kritis
                </span>
                <div className="mt-1 text-lg md:text-2xl font-bold text-amber-600">
                  {(summary?.lowStockCount ?? 0) + (summary?.outOfStockCount ?? 0)} Item
                </div>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <span className="material-symbols-outlined text-[20px] md:text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-50 pt-2">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                {summary?.outOfStockCount ?? 0} Habis Total
              </span>
              <span className="text-slate-500 font-medium">
                {summary?.lowStockCount ?? 0} Perlu Kulakan
              </span>
            </div>
          </div>

          {/* KPI 3: Fast-Moving */}
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Komoditas Utama
                </span>
                <div className="mt-1 text-base md:text-lg font-bold text-slate-800 truncate">
                  {categories.length > 0 ? categories.slice(0, 3).join(", ") : "Belum Ada Produk"}
                </div>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                <span className="material-symbols-outlined text-[20px] md:text-[22px]">
                  local_fire_department
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-50 pt-2">
              <span className="flex items-center gap-1 text-orange-600 font-semibold">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                {products.length > 0 ? "Turnover Cepat" : "Menunggu Produk"}
              </span>
              <span className="font-semibold text-slate-600">{categories.length} Kategori</span>
            </div>
          </div>

          {/* KPI 4: Estimasi Kulakan */}
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Rekap Kulakan PO
                </span>
                <div className="mt-1 text-lg md:text-2xl font-bold text-emerald-700">
                  {lowStockItems.length} Draft PO
                </div>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                <span className="material-symbols-outlined text-[20px] md:text-[22px]">
                  local_shipping
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-50 pt-2">
              <span className="text-slate-500">Kebutuhan Pasar Subuh</span>
              <span className="font-bold text-emerald-700">
                {lowStockItems.length > 0 ? "Perlu Kulakan" : "Stok Bersih"}
              </span>
            </div>
          </div>
        </div>

        {/* Special Morning Restock Reminder Banner (Pasar Subuh & Agen) */}
        <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-start md:items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md shrink-0">
              <span className="material-symbols-outlined text-[28px] text-emerald-200">
                alarm_on
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                  Prioritas Jam 04:30 Subuh
                </span>
                <span className="text-xs text-emerald-200 font-medium">
                  Pasar Induk & Agen Supplier
                </span>
              </div>
              <h2 className="mt-1 text-base md:text-lg font-bold text-white">
                Pengingat Kulakan Pasar Subuh & Restok Sembako Pokok
              </h2>
              <p className="text-xs text-emerald-100/90 max-w-2xl mt-0.5">
                {lowStockItems.length > 0
                  ? `${lowStockItems.length} komoditas melewati batas aman stok (${lowStockItems.slice(0, 3).map((p) => p.name).join(", ")}...). Siapkan daftar belanja atau hubungi agen.`
                  : "Seluruh stok komoditas sembako masih dalam batas aman. Siap melayani pelanggan warung!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 shrink-0 flex-wrap">
            <button
              onClick={handlePrintShoppingList}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs md:text-sm font-semibold transition-all backdrop-blur-sm shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Cetak Daftar Belanja</span>
            </button>
            <button
              onClick={handleSendSupplierWhatsApp}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs md:text-sm font-bold transition-all shadow-sm active:scale-95"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Kirim PO via WA</span>
            </button>
          </div>
        </div>

        {/* Main Inventory Filter & Console */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-4 md:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col gap-4">
            {/* Search & Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Cari nama barang, barcode EAN, atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs capitalize"
                >
                  <option value="semua">Semua Kategori ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value="stok_asc">Urut: Stok Terendah</option>
                  <option value="stok_desc">Urut: Stok Tertinggi</option>
                  <option value="margin_desc">Urut: Margin Tertinggi</option>
                  <option value="name_asc">Urut: Nama (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterMode("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                    filterMode === "ALL"
                      ? "bg-white text-slate-800 shadow-sm scale-[1.02]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("LOW")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1 ${
                    filterMode === "LOW"
                      ? "bg-amber-500 text-white shadow-sm scale-[1.02]"
                      : "text-amber-700 hover:text-amber-900"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Menipis ({summary?.lowStockCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("OUT")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1 ${
                    filterMode === "OUT"
                      ? "bg-rose-600 text-white shadow-sm scale-[1.02]"
                      : "text-rose-700 hover:text-rose-900"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Habis ({summary?.outOfStockCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("SAFE")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                    filterMode === "SAFE"
                      ? "bg-emerald-700 text-white shadow-sm scale-[1.02]"
                      : "text-emerald-800 hover:text-emerald-950"
                  }`}
                >
                  Aman ({products.length - (summary?.lowStockCount ?? 0) - (summary?.outOfStockCount ?? 0)})
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  qr_code_scanner
                </span>
                <span>F2 Barcode Scanner Ready</span>
                <span>•</span>
                <span>{filteredProducts.length} produk ditampilkan</span>
              </div>
            </div>
          </div>

          <div key={`${selectedCategory}_${filterMode}_${sortBy}`} className="ios-tab-content">
          {/* Loading Indicator */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <span className="material-symbols-outlined text-[36px] animate-spin text-emerald-600">
                autorenew
              </span>
              <p className="text-sm font-semibold">Memuat katalog & fisik stok komoditas...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-[36px]">inventory_2</span>
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">Katalog Toko Masih Kosong</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Data mulai dari nol. Muat 15 produk sembako contoh secara instan atau daftarkan produk sendiri.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  disabled={isSeeding}
                  onClick={handleSeedStarterProducts}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>
                    {isSeeding
                      ? "Memuat Produk..."
                      : "Isi Contoh Produk Sembako (15 Barang)"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductToEdit(null);
                    setFormModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-600 text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>+ Tambah Produk Manual</span>
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <span className="material-symbols-outlined text-[48px] text-slate-300">
                inventory
              </span>
              <p className="text-base font-bold text-slate-700">Tidak ada produk yang cocok</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Coba ubah kata kunci pencarian atau ganti filter kategori/status stok.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on mobile, visible md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 select-none">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4 min-w-[260px]">Produk & Kategori</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Status & Stok Fisik</th>
                      <th className="py-3.5 px-4 text-right min-w-[120px]">Harga Modal</th>
                      <th className="py-3.5 px-4 text-right min-w-[120px]">Harga Jual</th>
                      <th className="py-3.5 px-4 text-center min-w-[100px]">Margin Untung</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Satuan & Catatan</th>
                      <th className="py-3.5 px-4 text-right min-w-[170px]">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p, idx) => {
                      const isOut = p.stockInBase <= 0;
                      const isLow = !isOut && p.stockInBase <= (p.minStockInBase ?? 5);
                      const minStock = p.minStockInBase ?? 5;
                      const ratio = Math.min(100, Math.round((p.stockInBase / (minStock * 2)) * 100));

                      const marginPercent = p.costPrice
                        ? (((p.sellPrice - p.costPrice) / p.costPrice) * 100).toFixed(1)
                        : null;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isOut ? "bg-rose-50/40" : isLow ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-mono">
                            {idx + 1}
                          </td>

                          {/* Produk & Kategori */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                                <CategoryIcon category={p.category} size={22} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">
                                  {p.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                  <span className="font-mono text-[11px]">{p.barcode || "NO-BARCODE"}</span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-semibold capitalize">
                                    {p.category}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status & Stok Fisik */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 max-w-[180px]">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-800"}>
                                  {p.stockInBase} {p.baseUnit}
                                </span>
                                {isOut ? (
                                  <span className="text-rose-600 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100">
                                    HABIS
                                  </span>
                                ) : isLow ? (
                                  <span className="text-amber-700 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 flex items-center gap-0.5">
                                    Menipis
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100">
                                    Aman
                                  </span>
                                )}
                              </div>
                              {p.hasMultiUnit && p.packUnit && p.packConversion && p.packConversion > 1 && (
                                <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                  ≈ {Math.floor(p.stockInBase / p.packConversion)} {p.packUnit} {p.stockInBase % p.packConversion > 0 ? `+ ${p.stockInBase % p.packConversion} ${p.baseUnit}` : "(Pas)"}
                                </div>
                              )}
                              {/* Stock Bar */}
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.max(5, ratio)}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Batas aman: {minStock} {p.baseUnit}
                              </span>
                            </div>
                          </td>

                          {/* Harga Modal */}
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-500">
                            {p.costPrice ? formatRupiah(p.costPrice) : "-"}
                          </td>

                          {/* Harga Jual */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-mono font-bold text-emerald-700">
                              {formatRupiah(p.sellPrice)}
                            </div>
                            {(p.sellPriceQuarter || p.sellPriceHalf || p.sellPriceThreeQuarter) && (
                              <div className="mt-1 flex flex-wrap justify-end gap-1">
                                {p.sellPriceQuarter ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold">
                                    1/4: {formatRupiah(p.sellPriceQuarter)}
                                  </span>
                                ) : null}
                                {p.sellPriceHalf ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold">
                                    1/2: {formatRupiah(p.sellPriceHalf)}
                                  </span>
                                ) : null}
                                {p.sellPriceThreeQuarter ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold">
                                    3/4: {formatRupiah(p.sellPriceThreeQuarter)}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>

                          {/* Margin Untung */}
                          <td className="py-3.5 px-4 text-center">
                            {marginPercent ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                +{marginPercent}%
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Satuan & Catatan */}
                          <td className="py-3.5 px-4">
                            {p.hasMultiUnit && p.packUnit ? (
                              <div className="text-xs space-y-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                  Grosir: {p.packUnit} (×{p.packConversion})
                                </span>
                                <div className="text-slate-500 font-mono text-[11px]">
                                  {p.sellPricePack ? formatRupiah(p.sellPricePack) : "-"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Satuan eceran ({p.baseUnit})</span>
                            )}
                          </td>

                          {/* Aksi Cepat */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setQuickModalMode("IN");
                                  setQuickModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                title="Tambah Stok Kulakan"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                <span>Stok</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setQuickModalMode("ADJUST");
                                  setQuickModalOpen(true);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                title="Koreksi / Opname Fisik"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">balance</span>
                              </button>
                              <button
                                onClick={() => {
                                  setProductToEdit(p);
                                  setFormModalOpen(true);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                title="Ubah Data Produk"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE ADAPTIVE CARD VIEW (visible on mobile, hidden md+) */}
              <div className="block md:hidden p-3 space-y-3">
                {filteredProducts.map((p) => {
                  const isOut = p.stockInBase <= 0;
                  const isLow = !isOut && p.stockInBase <= (p.minStockInBase ?? 5);
                  const marginPercent = p.costPrice
                    ? (((p.sellPrice - p.costPrice) / p.costPrice) * 100).toFixed(1)
                    : null;

                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl p-4 shadow-xs border transition-all ${
                        isOut
                          ? "border-rose-300 bg-rose-50/20"
                          : isLow
                          ? "border-amber-300 bg-amber-50/20"
                          : "border-slate-100"
                      }`}
                    >
                      {/* Top Row: Icon, Name, Category & Options */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <CategoryIcon category={p.category} size={24} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {p.barcode || "NO-BARCODE"}
                              </span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] font-bold text-emerald-700 capitalize">
                                {p.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm truncate mt-0.5">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOut
                                    ? "bg-rose-100 text-rose-700"
                                    : isLow
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                    isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-600"
                                  }`}
                                ></span>
                                Stok: {p.stockInBase} {p.baseUnit}
                              </span>
                              {p.hasMultiUnit && p.packUnit && p.packConversion && p.packConversion > 1 && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                  ≈ {Math.floor(p.stockInBase / p.packConversion)} {p.packUnit}{p.stockInBase % p.packConversion > 0 ? ` +${p.stockInBase % p.packConversion}` : ""}
                                </span>
                              )}
                              {marginPercent && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Margin +{marginPercent}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setProductToEdit(p);
                            setFormModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      </div>

                      {/* Price Breakdown Strip */}
                      <div className="mt-3 bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            Kulakan (Modal)
                          </span>
                          <span className="font-mono text-slate-600 font-semibold">
                            {p.costPrice ? formatRupiah(p.costPrice) : "-"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 block font-bold">
                            Harga Jual Ecer
                          </span>
                          <span className="font-mono text-emerald-700 font-bold text-sm">
                            {formatRupiah(p.sellPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Multi-unit alert if exists */}
                      {p.hasMultiUnit && p.packUnit && (
                        <div className="mt-2 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold flex items-center justify-between">
                          <span>
                            Grosir {p.packUnit} (×{p.packConversion})
                          </span>
                          <span className="font-mono font-bold">
                            {p.sellPricePack ? formatRupiah(p.sellPricePack) : "-"}
                          </span>
                        </div>
                      )}

                      {/* Custom decimal prices strip if exists */}
                      {(p.sellPriceQuarter || p.sellPriceHalf || p.sellPriceThreeQuarter) && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10.5px] font-semibold flex flex-wrap items-center justify-between gap-1">
                          <span className="font-bold">⚖️ Ecer Desimal:</span>
                          <span className="font-mono">
                            {[
                              p.sellPriceQuarter ? `1/4: ${formatRupiah(p.sellPriceQuarter)}` : null,
                              p.sellPriceHalf ? `1/2: ${formatRupiah(p.sellPriceHalf)}` : null,
                              p.sellPriceThreeQuarter ? `3/4: ${formatRupiah(p.sellPriceThreeQuarter)}` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-3">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setQuickModalMode("ADJUST");
                            setQuickModalOpen(true);
                          }}
                          className="flex-1 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[15px]">balance</span>
                          <span>Opname</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setQuickModalMode("IN");
                            setQuickModalOpen(true);
                          }}
                          className="flex-1 h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs active:scale-95"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_box</span>
                          <span>+ Tambah Stok</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Quick Stock Modal */}
      <QuickStockModal
        product={selectedProduct}
        mode={quickModalMode}
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        onSuccess={() => {
          loadData();
          showToast(
            quickModalMode === "IN"
              ? `Stok ${selectedProduct?.name} berhasil ditambah!`
              : `Stok ${selectedProduct?.name} berhasil diperbarui!`
          );
        }}
      />

      {/* Product Add/Edit Form Modal */}
      <ProductFormModal
        productToEdit={productToEdit}
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          loadData();
          showToast(
            productToEdit
              ? `Data ${productToEdit.name} berhasil diperbarui!`
              : "Produk baru berhasil ditambahkan ke katalog!"
          );
        }}
      />
    </>
  );
}
