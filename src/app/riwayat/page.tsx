"use client";

import { useState, useEffect, useMemo } from "react";
import type { SaleTransaction, Transaction, ShiftCloseRecord } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { deviceFetch } from "@/lib/device";
import { getStoreSettings } from "@/lib/storeSettings";
import Link from "next/link";

type TabType = "SALES" | "MUTASI" | "SHIFTS";
type DateFilter = "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH";
type PaymentFilter = "ALL" | "TUNAI" | "QRIS" | "TRANSFER" | "KASBON";

export default function RiwayatPage() {
  const [activeTab, setActiveTab] = useState<TabType>("SALES");
  
  // Data State
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [mutasi, setMutasi] = useState<Transaction[]>([]);
  const [shifts, setShifts] = useState<ShiftCloseRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftCloseRecord | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [dateBounds, setDateBounds] = useState<{
    todayStr: string;
    yesterdayStr: string;
    weekAgoTime: number;
    monthAgoTime: number;
  }>({
    todayStr: "",
    yesterdayStr: "",
    weekAgoTime: 0,
    monthAgoTime: 0,
  });

  // Void confirmation state
  const [saleToVoid, setSaleToVoid] = useState<SaleTransaction | null>(null);
  const [isVoiding, setIsVoiding] = useState<boolean>(false);
  const [showClearMutasiModal, setShowClearMutasiModal] = useState<boolean>(false);
  const [isClearingMutasi, setIsClearingMutasi] = useState<boolean>(false);
  const [showClearShiftsModal, setShowClearShiftsModal] = useState<boolean>(false);
  const [isClearingShifts, setIsClearingShifts] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Initialize date bounds and read ?tab= query param on client mount to avoid SSR prerender issues
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    setDateBounds({
      todayStr,
      yesterdayStr,
      weekAgoTime: weekAgo.getTime(),
      monthAgoTime: monthAgo.getTime(),
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab")?.toUpperCase();
      if (tabParam === "SHIFTS" || tabParam === "MUTASI" || tabParam === "SALES") {
        setActiveTab(tabParam as TabType);
      }
    }
  }, []);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, mutasiRes, shiftsRes] = await Promise.all([
        deviceFetch("/api/sales?limit=250"),
        deviceFetch("/api/transactions?limit=250"),
        deviceFetch("/api/shifts?limit=100"),
      ]);
      const salesData = await salesRes.json();
      const mutasiData = await mutasiRes.json();
      const shiftsData = await shiftsRes.json();

      if (salesData.success) {
        setSales(salesData.data || []);
      }
      if (mutasiData.success) {
        setMutasi(mutasiData.data || []);
      }
      if (shiftsData.success) {
        const list: ShiftCloseRecord[] = shiftsData.data || [];
        setShifts(list);
        if (list.length > 0 && !selectedShift) {
          setSelectedShift(list[0]);
        }
      }
    } catch (err) {
      console.error("Gagal memuat histori transaksi:", err);
      showFeedback("Gagal memuat data histori.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Filter Sales Logic
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchReceipt = sale.receiptNo?.toLowerCase().includes(q);
        const matchCustomer = sale.customerName?.toLowerCase().includes(q);
        const matchItem = sale.items?.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchReceipt && !matchCustomer && !matchItem) return false;
      }

      // 2. Date Filter
      const saleDateStr = sale.createdAt?.slice(0, 10) || "";
      const saleTime = sale.createdAt ? new Date(sale.createdAt).getTime() : 0;

      if (dateFilter === "TODAY" && dateBounds.todayStr && saleDateStr !== dateBounds.todayStr) {
        return false;
      }
      if (dateFilter === "YESTERDAY" && dateBounds.yesterdayStr && saleDateStr !== dateBounds.yesterdayStr) {
        return false;
      }
      if (dateFilter === "WEEK" && dateBounds.weekAgoTime && saleTime < dateBounds.weekAgoTime) {
        return false;
      }
      if (dateFilter === "MONTH" && dateBounds.monthAgoTime && saleTime < dateBounds.monthAgoTime) {
        return false;
      }

      // 3. Payment Filter
      if (paymentFilter !== "ALL" && sale.paymentMethod !== paymentFilter) return false;

      return true;
    });
  }, [sales, searchQuery, dateFilter, paymentFilter, dateBounds]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalCount = filteredSales.length;
    const totalGross = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalProfit = filteredSales.reduce((acc, s) => acc + (s.profit || 0), 0);
    const avgPerNota = totalCount > 0 ? Math.round(totalGross / totalCount) : 0;

    const countTunai = filteredSales.filter((s) => s.paymentMethod === "TUNAI").length;
    const countQris = filteredSales.filter((s) => s.paymentMethod === "QRIS").length;
    const countKasbon = filteredSales.filter((s) => s.paymentMethod === "KASBON").length;
    const countTransfer = filteredSales.filter((s) => s.paymentMethod === "TRANSFER").length;

    return { totalCount, totalGross, totalProfit, avgPerNota, countTunai, countQris, countKasbon, countTransfer };
  }, [filteredSales]);

  // Handle Void / Cancel Sale
  const handleVoidSale = async () => {
    if (!saleToVoid) return;
    setIsVoiding(true);
    try {
      const res = await deviceFetch(`/api/sales?id=${encodeURIComponent(saleToVoid.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membatalkan transaksi");
      }
      showFeedback(`Nota ${saleToVoid.receiptNo} berhasil dibatalkan & stok dikembalikan!`, "success");
      setSales((prev) => prev.filter((s) => s.id !== saleToVoid.id));
      if (selectedSale?.id === saleToVoid.id) {
        setSelectedSale(null);
      }
      setSaleToVoid(null);
    } catch (err: any) {
      showFeedback(err.message || "Gagal membatalkan transaksi.", "error");
    } finally {
      setIsVoiding(false);
    }
  };

  // Share via WhatsApp
  const shareWhatsApp = (sale: SaleTransaction) => {
    const itemsText = sale.items
      .map(
        (it) =>
          `• ${it.productName}\n  ${it.quantity} ${it.unitLabel} × ${formatRupiah(it.pricePerUnit)} = ${formatRupiah(it.subtotal)}`
      )
      .join("\n");

    const settings = getStoreSettings();
    const cashier = sale.cashierName || settings.cashierName;
    const message = [
      `*${settings.storeName} — BUKTI STRUK TRANSAKSI*`,
      `================================`,
      `No. Nota : *${sale.receiptNo}*`,
      `Waktu    : ${formatDateTime(sale.createdAt)}`,
      `Pelanggan: ${sale.customerName || "Pelanggan Umum"}`,
      `Kasir    : ${cashier}`,
      `WA Toko  : ${settings.storePhone}`,
      `================================`,
      itemsText,
      `--------------------------------`,
      `*TOTAL BELANJA : ${formatRupiah(sale.totalAmount)}*`,
      `Metode Bayar  : ${sale.paymentMethod}`,
      ...(sale.paymentMethod === "TUNAI"
        ? [
            `Bayar Tunai   : ${formatRupiah(sale.amountPaid)}`,
            `Kembalian     : ${formatRupiah(sale.changeAmount)}`,
          ]
        : []),
      ...(sale.pointsEarned ? [`⭐ Poin Diperoleh: +${sale.pointsEarned} Poin`] : []),
      ...(sale.pointsRedeemed ? [`🎁 Poin Ditukar  : -${sale.pointsRedeemed} Poin`] : []),
      `================================`,
      settings.receiptFooter || `Terima kasih telah berbelanja di *${settings.storeName}*!`,
      `Alamat & WA: ${settings.storePhone}`,
    ].join("\n");

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
  };

  // Copy receipt text to clipboard
  const copyReceiptText = (sale: SaleTransaction) => {
    const itemsText = sale.items
      .map(
        (it) =>
          `${it.productName} (${it.quantity} ${it.unitLabel} x ${formatRupiah(it.pricePerUnit)}) = ${formatRupiah(it.subtotal)}`
      )
      .join("\n");
    const raw = `TOKO DEWI - NOTA ${sale.receiptNo}\nWaktu: ${formatDateTime(sale.createdAt)}\nPelanggan: ${sale.customerName || "Umum"}\nTotal: ${formatRupiah(sale.totalAmount)}\nBayar: ${sale.paymentMethod}\n\nItem:\n${itemsText}`;
    navigator.clipboard.writeText(raw);
    showFeedback("Teks bukti struk berhasil disalin ke clipboard!", "success");
  };

  // Handle Clear All Mutations
  const handleClearAllMutations = async () => {
    setIsClearingMutasi(true);
    try {
      const res = await deviceFetch("/api/transactions", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengosongkan mutasi");
      }
      setMutasi([]);
      showFeedback("Seluruh riwayat mutasi stok berhasil dibersihkan!", "success");
    } catch (err: any) {
      showFeedback(err.message || "Gagal mengosongkan riwayat mutasi.", "error");
    } finally {
      setIsClearingMutasi(false);
      setShowClearMutasiModal(false);
    }
  };

  // Handle Delete Single Mutation
  const handleDeleteSingleMutation = async (id: string) => {
    try {
      const res = await deviceFetch(`/api/transactions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus mutasi");
      }
      setMutasi((prev) => prev.filter((m) => m.id !== id));
      showFeedback("Catatan mutasi stok berhasil dihapus!", "success");
    } catch (err: any) {
      showFeedback(err.message || "Gagal menghapus mutasi.", "error");
    }
  };

  // Handle Delete Single Shift Record
  const handleDeleteSingleShift = async (id: string) => {
    try {
      const res = await deviceFetch(`/api/shifts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus rekap tutup shift");
      }
      setShifts((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (selectedShift?.id === id) {
          setSelectedShift(next[0] || null);
        }
        return next;
      });
      showFeedback("Catatan rekap tutup shift berhasil dihapus!", "success");
    } catch (err: any) {
      showFeedback(err.message || "Gagal menghapus rekap tutup shift.", "error");
    }
  };

  // Handle Clear All Shift Records
  const handleClearAllShifts = async () => {
    setIsClearingShifts(true);
    try {
      const res = await deviceFetch("/api/shifts", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengosongkan riwayat tutup shift");
      }
      setShifts([]);
      setSelectedShift(null);
      showFeedback("Seluruh riwayat tutup shift berhasil dikosongkan!", "success");
    } catch (err: any) {
      showFeedback(err.message || "Gagal mengosongkan riwayat tutup shift.", "error");
    } finally {
      setIsClearingShifts(false);
      setShowClearShiftsModal(false);
    }
  };

  // Share Shift Close via WhatsApp
  const shareShiftWhatsApp = (shift: ShiftCloseRecord) => {
    const settings = getStoreSettings();
    const diffLabel =
      shift.cashDifference === 0
        ? "✅ PAS / SEIMBANG (Rp 0)"
        : shift.cashDifference > 0
        ? `🟢 LEBIH +${formatRupiah(shift.cashDifference)}`
        : `🔴 KURANG -${formatRupiah(Math.abs(shift.cashDifference))}`;

    const lines = [
      `*LAPORAN TUTUP SHIFT KASIR*`,
      `*${settings.storeName}*`,
      `================================`,
      `Waktu    : ${formatDateTime(shift.closedAt)}`,
      `Terminal : ${shift.deviceLabel || "Kasir POS"}`,
      `Kasir    : ${shift.cashierName || "Kasir Dewi"}`,
      `Jml Nota : *${shift.orderCount} Transaksi*`,
      `================================`,
      `*RINCIAN OMZET SHIFT:*`,
      `💵 Tunai    : ${formatRupiah(shift.tunai)}`,
      `📱 QRIS     : ${formatRupiah(shift.qris)}`,
      `🏦 Transfer : ${formatRupiah(shift.transfer)}`,
      `📒 Kasbon   : ${formatRupiah(shift.kasbon)}`,
      `--------------------------------`,
      `*TOTAL OMZET : ${formatRupiah(shift.totalRevenue)}*`,
      `💸 Kas Keluar Laci : -${formatRupiah(shift.drawerExpenses)}`,
      `📈 Est. Laba Bersih: ${formatRupiah(shift.netProfit)}`,
      `================================`,
      `*CEK FISIK UANG LACI KASIR:*`,
      `• Saldo Sistem : ${formatRupiah(shift.systemCashDrawer)}`,
      `• Fisik Aktual : *${formatRupiah(shift.actualCashDrawer)}*`,
      `• Status Selisih: *${diffLabel}*`,
      ...(shift.notes ? [`• Catatan Kasir: ${shift.notes}`] : []),
      `================================`,
    ];

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    );
  };

  // Print Shift Close Thermal Receipt
  const escapeHtml = (str: string): string =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const printShiftReport = (shift: ShiftCloseRecord) => {
    const settings = getStoreSettings();
    const diffLabel =
      shift.cashDifference === 0
        ? "PAS / SEIMBANG (Rp 0)"
        : shift.cashDifference > 0
        ? `LEBIH +${formatRupiah(shift.cashDifference)}`
        : `KURANG -${formatRupiah(Math.abs(shift.cashDifference))}`;

    const safeStoreName = escapeHtml(settings.storeName || "Toko Sembako");
    const safeClosedAt = escapeHtml(formatDateTime(shift.closedAt));
    const safeDeviceLabel = escapeHtml(shift.deviceLabel || "Kasir POS");
    const safeCashierName = escapeHtml(shift.cashierName || "Kasir Dewi");
    const safeDiffLabel = escapeHtml(diffLabel);
    const safeNotes = shift.notes ? escapeHtml(shift.notes) : "";

    const win = window.open("", "_blank", "width=400,height=650");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Rekap Tutup Shift - ${safeStoreName}</title>
          <style>
            body { font-family: monospace; width: 280px; margin: 0 auto; padding: 12px; font-size: 12px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="center bold" style="font-size:14px">${safeStoreName}</div>
          <div class="center">LAPORAN TUTUP SHIFT KASIR</div>
          <div class="center" style="font-size:10px">${safeClosedAt}</div>
          <div class="divider"></div>
          <div class="row"><span>Terminal:</span><span>${safeDeviceLabel}</span></div>
          <div class="row"><span>Kasir:</span><span>${safeCashierName}</span></div>
          <div class="row"><span>Total Transaksi:</span><span class="bold">${shift.orderCount} Nota</span></div>
          <div class="divider"></div>
          <div class="bold">RINCIAN METODE PEMBAYARAN</div>
          <div class="row"><span>- Penjualan Tunai:</span><span>${formatRupiah(shift.tunai)}</span></div>
          <div class="row"><span>- Penjualan QRIS:</span><span>${formatRupiah(shift.qris)}</span></div>
          <div class="row"><span>- Transfer Bank:</span><span>${formatRupiah(shift.transfer)}</span></div>
          <div class="row"><span>- Piutang Kasbon:</span><span>${formatRupiah(shift.kasbon)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>TOTAL OMZET:</span><span>${formatRupiah(shift.totalRevenue)}</span></div>
          <div class="row"><span>Keluar Kas Laci:</span><span>-${formatRupiah(shift.drawerExpenses)}</span></div>
          <div class="row"><span>Est. Laba Bersih:</span><span>${formatRupiah(shift.netProfit)}</span></div>
          <div class="divider"></div>
          <div class="bold">REKONSILIASI UANG LACI</div>
          <div class="row"><span>Saldo Sistem:</span><span>${formatRupiah(shift.systemCashDrawer)}</span></div>
          <div class="row"><span>Fisik Aktual:</span><span class="bold">${formatRupiah(shift.actualCashDrawer)}</span></div>
          <div class="row bold"><span>Selisih Kas:</span><span>${safeDiffLabel}</span></div>
          ${safeNotes ? `<div class="divider"></div><div>Catatan: ${safeNotes}</div>` : ""}
          <div class="divider"></div>
          <div class="center" style="font-size:10px">Dicetak otomatis dari POS ${safeStoreName}</div>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Copy Shift Close Text to Clipboard
  const copyShiftText = (shift: ShiftCloseRecord) => {
    const diffLabel =
      shift.cashDifference === 0
        ? "PAS / SEIMBANG (Rp 0)"
        : shift.cashDifference > 0
        ? `LEBIH +${formatRupiah(shift.cashDifference)}`
        : `KURANG -${formatRupiah(Math.abs(shift.cashDifference))}`;
    const raw = `REKAP TUTUP SHIFT - ${getStoreSettings().storeName}\nWaktu: ${formatDateTime(shift.closedAt)}\nKasir: ${shift.cashierName} (${shift.deviceLabel})\nTotal Transaksi: ${shift.orderCount} Nota\nTotal Omzet: ${formatRupiah(shift.totalRevenue)}\nTunai: ${formatRupiah(shift.tunai)} | QRIS: ${formatRupiah(shift.qris)} | Transfer: ${formatRupiah(shift.transfer)} | Kasbon: ${formatRupiah(shift.kasbon)}\nKeluar Laci: -${formatRupiah(shift.drawerExpenses)}\nLaba Bersih: ${formatRupiah(shift.netProfit)}\nSaldo Sistem: ${formatRupiah(shift.systemCashDrawer)}\nFisik Aktual: ${formatRupiah(shift.actualCashDrawer)}\nSelisih Kas: ${diffLabel}${shift.notes ? `\nCatatan: ${shift.notes}` : ""}`;
    navigator.clipboard.writeText(raw);
    showFeedback("Teks rekap tutup shift berhasil disalin ke clipboard!", "success");
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#131b2e] pb-24">
      {/* ─── TOAST NOTIFICATION ─── */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all animate-bounceIn ${
            feedbackMessage.type === "success"
              ? "bg-emerald-800 text-white border border-emerald-600"
              : "bg-rose-700 text-white border border-rose-500"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {feedbackMessage.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 md:pt-8">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
              <Link href="/" className="hover:text-emerald-700 transition">
                Kasir POS
              </Link>
              <span>/</span>
              <span className="text-emerald-800 font-bold">Histori Transaksi</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shrink-0">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </span>
              <span>Histori Transaksi & Struk</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
              Semua nota belanja kasir tersimpan rapi dan dapat dicek struk fisiknya kapan saja.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 shadow-xs transition"
            >
              <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
                sync
              </span>
              <span>{isLoading ? "Memuat..." : "Segarkan"}</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition"
            >
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              <span>Buka Kasir POS</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs (Histori Struk vs Mutasi Gudang vs Rekap Tutup Shift) */}
        <div className="flex items-center gap-2 mb-5 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("SALES")}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
              activeTab === "SALES"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-950/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt</span>
            <span>Histori Struk Penjualan ({sales.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("MUTASI")}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
              activeTab === "MUTASI"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-950/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
            <span>Mutasi Stok Gudang ({mutasi.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("SHIFTS")}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
              activeTab === "SHIFTS"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-950/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            <span>Rekap Tutup Shift ({shifts.length})</span>
          </button>
        </div>

        <div key={activeTab} className="ios-tab-content">
        {activeTab === "SALES" ? (
          <>
            {/* ─── SUMMARY STATS CARDS ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Transaksi
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-900 mt-1 block">
                  {stats.totalCount} <span className="text-xs font-semibold text-slate-500">Nota</span>
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block truncate">
                  Tersimpan di sistem
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Omzet (Gross)
                </span>
                <span className="text-xl md:text-2xl font-black text-emerald-700 mt-1 block truncate">
                  {formatRupiah(stats.totalGross)}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block truncate">
                  Laba kotor: {formatRupiah(stats.totalProfit)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Rata-rata per Struk
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-800 mt-1 block truncate">
                  {formatRupiah(stats.avgPerNota)}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                  Nilai rata-rata keranjang
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Metode Pembayaran
                </span>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    💵 {stats.countTunai}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[10px] font-bold border border-purple-200">
                    📱 {stats.countQris}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200">
                    📒 {stats.countKasbon}
                  </span>
                  {stats.countTransfer > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                      🏦 {stats.countTransfer}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ─── SEARCH & FILTER TOOLBAR ─── */}
            <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-5 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor nota (TRX-...), nama pelanggan, atau nama produk..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs md:text-sm font-medium transition outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Date Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {(
                    [
                      { key: "ALL", label: "Semua" },
                      { key: "TODAY", label: "Hari Ini" },
                      { key: "YESTERDAY", label: "Kemarin" },
                      { key: "WEEK", label: "7 Hari" },
                      { key: "MONTH", label: "30 Hari" },
                    ] as const
                  ).map((df) => (
                    <button
                      key={df.key}
                      onClick={() => setDateFilter(df.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 shrink-0 cursor-pointer ${
                        dateFilter === df.key
                          ? "bg-slate-900 text-white shadow-sm scale-[1.02]"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Badges Filter */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-bold text-[11px] mr-1">Metode:</span>
                {(
                  [
                    { key: "ALL", label: "Semua Metode" },
                    { key: "TUNAI", label: "💵 Tunai" },
                    { key: "QRIS", label: "📱 QRIS" },
                    { key: "TRANSFER", label: "🏦 Transfer" },
                    { key: "KASBON", label: "📒 Kasbon" },
                  ] as const
                ).map((pf) => (
                  <button
                    key={pf.key}
                    onClick={() => setPaymentFilter(pf.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                      paymentFilter === pf.key
                        ? "bg-emerald-700 text-white shadow-sm scale-[1.02]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {pf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── TWO COLUMN LAYOUT: LIST ON LEFT, RECEIPT PREVIEW ON RIGHT ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LIST OF TRANSACTIONS (Col 7 or 12) */}
              <div className={`${selectedSale ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
                {isLoading ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <span className="material-symbols-outlined text-[36px] text-emerald-700 animate-spin">
                      sync
                    </span>
                    <p className="text-sm font-bold text-slate-600 mt-2">Memuat rekaman transaksi...</p>
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-[32px]">receipt_long</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Belum Ada Transaksi Ditemukan</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {searchQuery || dateFilter !== "ALL" || paymentFilter !== "ALL"
                        ? "Tidak ada transaksi yang cocok dengan filter pencarian. Coba ubah atau reset filter."
                        : "Belum ada transaksi belanja yang tersimpan. Lakukan transaksi di Kasir POS untuk mulai mencatat riwayat struk."}
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-800 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                      <span>Mulai Transaksi Pertama di Kasir POS</span>
                    </Link>
                  </div>
                ) : (
                  filteredSales.map((sale) => {
                    const isSelected = selectedSale?.id === sale.id;
                    const itemsCount = sale.items?.length || 0;
                    const summaryItems =
                      sale.items
                        ?.map((it) => `${it.productName} (${it.quantity} ${it.unitLabel})`)
                        .slice(0, 2)
                        .join(", ") + (itemsCount > 2 ? ` +${itemsCount - 2} lainnya` : "");

                    return (
                      <div
                        key={sale.id}
                        className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                            : "border-slate-200/90 hover:border-emerald-400 hover:shadow-md"
                        }`}
                        onClick={() => setSelectedSale(sale)}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Receipt Icon */}
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              sale.paymentMethod === "TUNAI"
                                ? "bg-emerald-100 text-emerald-800"
                                : sale.paymentMethod === "QRIS"
                                ? "bg-purple-100 text-purple-800"
                                : sale.paymentMethod === "KASBON"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">
                              {sale.paymentMethod === "TUNAI"
                                ? "payments"
                                : sale.paymentMethod === "QRIS"
                                ? "qr_code_2"
                                : sale.paymentMethod === "KASBON"
                                ? "menu_book"
                                : "account_balance"}
                            </span>
                          </div>

                          {/* Transaction Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {sale.receiptNo}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  sale.paymentMethod === "TUNAI"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : sale.paymentMethod === "QRIS"
                                    ? "bg-purple-100 text-purple-800"
                                    : sale.paymentMethod === "KASBON"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {sale.paymentMethod}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {formatDateTime(sale.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">
                                👤 {sale.customerName || "Pelanggan Umum"}
                              </span>
                              {sale.pointsEarned ? (
                                <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                  ⭐ +{sale.pointsEarned} Poin
                                </span>
                              ) : null}
                              {sale.pointsRedeemed ? (
                                <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                  🎁 -{sale.pointsRedeemed} Poin
                                </span>
                              ) : null}
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-500 truncate">{summaryItems}</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Action Buttons */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <div className="text-base sm:text-lg font-black text-emerald-700">
                              {formatRupiah(sale.totalAmount)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {itemsCount} item belanja
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSale(sale);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                              title="Buka Struk Fisik"
                            >
                              <span className="material-symbols-outlined text-[16px]">receipt</span>
                              <span className="hidden sm:inline">Cek Struk</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                shareWhatsApp(sale);
                              }}
                              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                              title="Kirim ke WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSaleToVoid(sale);
                              }}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                              title="Batalkan Transaksi / Void"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ─── RIGHT COLUMN: AUTHENTIC THERMAL PAPER STRUK PREVIEW ─── */}
              {selectedSale && (
                <div className="lg:col-span-5 sticky top-20">
                  <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-800 mb-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400">receipt</span>
                      <span className="font-bold text-sm">Preview Kertas Struk Fisik</span>
                    </div>
                    <button
                      onClick={() => setSelectedSale(null)}
                      className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer font-bold"
                    >
                      ✕ Tutup
                    </button>
                  </div>

                  {/* THE THERMAL PAPER RECEIPT CONTAINER */}
                  <div className="printable-receipt relative bg-[#fffdf9] text-slate-800 p-6 rounded-2xl shadow-2xl border border-amber-200/80 font-mono text-xs select-text overflow-hidden transition-all">
                    {/* Serrated zigzag paper edge effect (Top) */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent border-t-2 border-dashed border-amber-300"></div>

                    {/* Vintage Rubber Stamp (LUNAS / KASBON) */}
                    <div
                      className={`absolute right-4 top-14 pointer-events-none uppercase tracking-widest font-black text-xs px-2.5 py-1 rounded border-2 transform rotate-[-12deg] opacity-80 ${
                        selectedSale.paymentMethod === "KASBON"
                          ? "border-rose-600 text-rose-700 bg-rose-50/50"
                          : "border-emerald-700 text-emerald-800 bg-emerald-50/50"
                      }`}
                    >
                      ★ {selectedSale.paymentMethod === "KASBON" ? "KASBON" : "LUNAS"} ★
                    </div>

                    {/* Store Header */}
                    <div className="text-center pb-3">
                      <div className="font-black text-lg tracking-wider text-slate-900">
                        {getStoreSettings().storeName}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600">
                        {getStoreSettings().storeAddress}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Telp / WA: {getStoreSettings().storePhone}
                      </div>
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-b-2 border-dashed border-slate-300 my-2"></div>

                    {/* Metadata */}
                    <div className="space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">No. Nota:</span>
                        <span className="font-bold text-slate-900">{selectedSale.receiptNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal:</span>
                        <span>{formatDateTime(selectedSale.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kasir:</span>
                        <span>{selectedSale.cashierName || getStoreSettings().cashierName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pelanggan:</span>
                        <span className="font-bold text-slate-900">
                          {selectedSale.customerName || "Pelanggan Umum"}
                        </span>
                      </div>
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-b-2 border-dashed border-slate-300 my-2.5"></div>

                    {/* Items Table */}
                    <div className="space-y-2 text-[11px]">
                      {selectedSale.items?.map((it, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="font-bold text-slate-900">{it.productName}</div>
                          <div className="flex justify-between text-slate-600">
                            <span>
                              {it.quantity} {it.unitLabel} × {formatRupiah(it.pricePerUnit)}
                            </span>
                            <span className="font-bold text-slate-800">
                              {formatRupiah(it.subtotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-b-2 border-dashed border-slate-300 my-2.5"></div>

                    {/* Totals Section */}
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal ({selectedSale.items?.length || 0} item):</span>
                        <span>{formatRupiah(selectedSale.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Diskon:</span>
                        <span>Rp 0</span>
                      </div>
                      <div className="border-b border-dashed border-slate-200 my-1"></div>
                      <div className="flex justify-between text-sm font-black text-slate-900 pt-0.5">
                        <span>TOTAL AKHIR:</span>
                        <span className="text-emerald-800">{formatRupiah(selectedSale.totalAmount)}</span>
                      </div>

                      {/* Payment info */}
                      <div className="pt-1.5 space-y-0.5">
                        <div className="flex justify-between text-slate-700">
                          <span>Metode Bayar:</span>
                          <span className="font-bold">{selectedSale.paymentMethod}</span>
                        </div>
                        {selectedSale.paymentMethod === "TUNAI" && (
                          <>
                            <div className="flex justify-between text-slate-700">
                              <span>Bayar Tunai:</span>
                              <span>{formatRupiah(selectedSale.amountPaid)}</span>
                            </div>
                            <div className="flex justify-between text-slate-900 font-bold">
                              <span>KEMBALIAN:</span>
                              <span>{formatRupiah(selectedSale.changeAmount)}</span>
                            </div>
                          </>
                        )}
                        {selectedSale.paymentMethod === "KASBON" && (
                          <div className="p-2 mt-1 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] space-y-0.5">
                            <div className="font-bold">STATUS: DICATAT DI BUKU KASBON</div>
                            <div>Nama: {selectedSale.customerName || "Pelanggan"}</div>
                            {selectedSale.notes && <div>Catatan: {selectedSale.notes}</div>}
                          </div>
                        )}
                        {Boolean(selectedSale.pointsEarned || selectedSale.pointsRedeemed) && (
                          <div className="p-2 mt-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-[10.5px] space-y-0.5">
                            {selectedSale.pointsEarned ? (
                              <div className="flex justify-between font-bold">
                                <span>⭐ Poin Diperoleh:</span>
                                <span>+{selectedSale.pointsEarned} Poin</span>
                              </div>
                            ) : null}
                            {selectedSale.pointsRedeemed ? (
                              <div className="flex justify-between font-semibold text-emerald-700">
                                <span>🎁 Poin Ditukar (Diskon):</span>
                                <span>-{selectedSale.pointsRedeemed} Poin</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Double Dashed Line */}
                    <div className="border-b-2 border-dashed border-slate-400 my-3"></div>

                    {/* Thank You Note */}
                    <div className="text-center text-[10px] text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700">TERIMA KASIH ATAS KUNJUNGAN ANDA!</p>
                      <p>{getStoreSettings().receiptFooter}</p>
                      <p className="text-[9px] text-slate-400">Layanan Pelanggan / WA: {getStoreSettings().storePhone}</p>
                    </div>

                    {/* Visual Barcode Graphic */}
                    <div className="mt-4 pt-2 text-center border-t border-slate-200">
                      <div className="font-mono tracking-[4px] text-[16px] text-slate-700 font-black select-none">
                        ||| | |||| || | ||||| |||| || | |||
                      </div>
                      <div className="text-[9px] text-slate-400 tracking-wider font-mono mt-0.5">
                        *{selectedSale.receiptNo}*
                      </div>
                    </div>

                    {/* Serrated zigzag paper edge effect (Bottom) */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent border-b-2 border-dashed border-amber-300"></div>
                  </div>

                  {/* ACTION TOOLBAR UNDER RECEIPT */}
                  <div className="mt-3 grid grid-cols-3 gap-2 no-print">
                    <button
                      onClick={() => window.print()}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Cetak Struk</span>
                    </button>
                    <button
                      onClick={() => shareWhatsApp(selectedSale)}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span>Kirim WA</span>
                    </button>
                    <button
                      onClick={() => copyReceiptText(selectedSale)}
                      className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>Salin Teks</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "MUTASI" ? (
          /* ─── TAB 2: MUTASI STOK GUDANG ─── */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Riwayat Keluar Masuk Barang Gudang</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan mutasi stok barang saat kulakan, penyesuaian opname, dan penjualan
                </p>
              </div>
              {mutasi.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearMutasiModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto active:scale-95 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  <span>Kosongkan Riwayat Mutasi ({mutasi.length})</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Jumlah</th>
                    <th className="py-3 px-4">Stok Sebelum → Sesudah</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {mutasi.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <span className="material-symbols-outlined text-[26px]">swap_horiz</span>
                        </div>
                        <span className="font-bold text-slate-600 block">Riwayat Mutasi Stok Kosong</span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Belum ada mutasi keluar masuk barang yang tercatat.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    mutasi.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{m.productName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.type === "IN"
                                ? "bg-emerald-100 text-emerald-800"
                                : m.type === "OUT"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {m.type === "IN" ? "MASUK" : m.type === "OUT" ? "KELUAR" : "ADJUST"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {m.type === "IN" ? "+" : "-"}
                          {m.quantityInput || m.quantityInBase}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {m.stockBefore} → <span className="font-bold text-slate-900">{m.stockAfter}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{m.note || "-"}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleMutation(m.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Hapus riwayat mutasi ini"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── TAB 3: REKAP TUTUP SHIFT & SETORAN KASIR ─── */
          <>
            {/* 3 Summary Cards for Shifts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Rekap Shift Tersimpan
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-900 mt-1 block">
                  {shifts.length} <span className="text-xs font-semibold text-slate-500">Shift</span>
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                  Rekaman tutup shift & setoran laci
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Setoran Tunai Fisik Terakhir
                </span>
                <span className="text-xl md:text-2xl font-black text-emerald-700 mt-1 block truncate">
                  {shifts[0] ? formatRupiah(shifts[0].actualCashDrawer) : "Rp 0"}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block truncate">
                  {shifts[0]
                    ? `Sistem: ${formatRupiah(shifts[0].systemCashDrawer)} (${formatDateTime(shifts[0].closedAt)})`
                    : "Belum ada setoran"}
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status Selisih Kas Terakhir
                </span>
                <div className="mt-1.5">
                  {!shifts[0] ? (
                    <span className="text-sm font-bold text-slate-400">Belum Ada Data</span>
                  ) : shifts[0].cashDifference === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                      ✓ PAS / SEIMBANG (Rp 0)
                    </span>
                  ) : shifts[0].cashDifference > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-black">
                      LEBIH +{formatRupiah(shifts[0].cashDifference)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-black">
                      KURANG -{formatRupiah(Math.abs(shifts[0].cashDifference))}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block truncate">
                  {shifts[0]
                    ? `Kasir: ${shifts[0].cashierName} (${shifts[0].deviceLabel})`
                    : "Simpan dari tombol Tutup Shift di Kasir"}
                </span>
              </div>
            </div>

            {/* Header Bar with Clear All Shifts Action */}
            {shifts.length > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Daftar Rekaman Tutup Shift & Rekonsiliasi Laci Kasir
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik salah satu rekaman shift untuk melihat struk rekap lengkap, mencetak ulang, atau mengirim ke WhatsApp Owner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearShiftsModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  <span>Kosongkan Riwayat Shift ({shifts.length})</span>
                </button>
              </div>
            )}

            {/* Two-Column Layout: Shift List on Left, Thermal Shift Receipt on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className={`${selectedShift ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
                {isLoading ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <span className="material-symbols-outlined text-[36px] text-emerald-700 animate-spin">
                      sync
                    </span>
                    <p className="text-sm font-bold text-slate-600 mt-2">Memuat riwayat tutup shift...</p>
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-[32px]">fact_check</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Tutup Shift</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Buka halaman Kasir POS, klik tombol <strong>&quot;Tutup Shift&quot;</strong>, masukkan uang fisik laci aktual, lalu tekan <strong>&quot;Simpan Rekap Shift&quot;</strong> agar tersimpan di sini.
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-800 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                      <span>Buka Kasir POS</span>
                    </Link>
                  </div>
                ) : (
                  shifts.map((shift) => {
                    const isSelected = selectedShift?.id === shift.id;
                    const diff = shift.cashDifference || 0;

                    return (
                      <div
                        key={shift.id}
                        onClick={() => setSelectedShift(shift)}
                        className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                            : "border-slate-200/90 hover:border-emerald-400 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              diff === 0
                                ? "bg-emerald-100 text-emerald-800"
                                : diff > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">fact_check</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900">
                                {formatDateTime(shift.closedAt)}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {shift.deviceLabel || "Kasir POS"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  diff === 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : diff > 0
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {diff === 0
                                  ? "PAS / SEIMBANG"
                                  : diff > 0
                                  ? `LEBIH +${formatRupiah(diff)}`
                                  : `KURANG -${formatRupiah(Math.abs(diff))}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-600">
                              <span className="font-bold text-slate-800">
                                👤 {shift.cashierName || "Kasir Dewi"}
                              </span>
                              <span>•</span>
                              <span>{shift.orderCount} Nota</span>
                              <span>•</span>
                              <span>
                                Fisik Laci: <strong className="text-slate-900">{formatRupiah(shift.actualCashDrawer)}</strong> (Sistem: {formatRupiah(shift.systemCashDrawer)})
                              </span>
                            </div>

                            {shift.notes && (
                              <div className="mt-1 text-[11px] text-slate-500 italic truncate">
                                📝 &quot;{shift.notes}&quot;
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <div className="text-left sm:text-right">
                            <div className="text-base sm:text-lg font-black text-emerald-700">
                              {formatRupiah(shift.totalRevenue)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Laba Bersih: {formatRupiah(shift.netProfit)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedShift(shift);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                              title="Lihat Struk Rekap"
                            >
                              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                              <span className="hidden sm:inline">Lihat Struk Rekap</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                shareShiftWhatsApp(shift);
                              }}
                              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                              title="Kirim Rekap ke WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleShift(shift.id);
                              }}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                              title="Hapus Rekap Shift Ini"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Thermal Paper Preview for Selected Shift */}
              {selectedShift && (
                <div className="lg:col-span-5 sticky top-20">
                  <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-800 mb-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400">fact_check</span>
                      <span className="font-bold text-sm">Preview Struk Rekap Tutup Shift</span>
                    </div>
                    <button
                      onClick={() => setSelectedShift(null)}
                      className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer font-bold"
                    >
                      ✕ Tutup
                    </button>
                  </div>

                  <div className="printable-receipt relative bg-[#fffdf9] text-slate-800 p-6 rounded-2xl shadow-2xl border border-amber-200/80 font-mono text-xs select-text overflow-hidden transition-all">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent border-t-2 border-dashed border-amber-300"></div>

                    {/* Stamp */}
                    <div
                      className={`absolute right-4 top-14 pointer-events-none uppercase tracking-widest font-black text-[10px] px-2.5 py-1 rounded border-2 transform rotate-[-10deg] opacity-85 ${
                        selectedShift.cashDifference === 0
                          ? "border-emerald-700 text-emerald-800 bg-emerald-50/60"
                          : selectedShift.cashDifference > 0
                          ? "border-blue-700 text-blue-800 bg-blue-50/60"
                          : "border-rose-600 text-rose-700 bg-rose-50/60"
                      }`}
                    >
                      ★ {selectedShift.cashDifference === 0 ? "KAS KLOP" : selectedShift.cashDifference > 0 ? "KAS LEBIH" : "KAS KURANG"} ★
                    </div>

                    <div className="text-center pb-3">
                      <div className="font-black text-lg tracking-wider text-slate-900">
                        {getStoreSettings().storeName}
                      </div>
                      <div className="text-[11px] font-bold text-slate-700">
                        LAPORAN TUTUP SHIFT & SETORAN KASIR
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatDateTime(selectedShift.closedAt)}
                      </div>
                    </div>

                    <div className="border-b-2 border-dashed border-slate-300 my-2"></div>

                    <div className="space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID Shift:</span>
                        <span className="font-bold text-slate-900">{selectedShift.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Terminal:</span>
                        <span className="font-bold">{selectedShift.deviceLabel || "Kasir POS"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kasir:</span>
                        <span className="font-bold">{selectedShift.cashierName || "Kasir Dewi"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Transaksi:</span>
                        <span className="font-bold text-slate-900">{selectedShift.orderCount} Nota</span>
                      </div>
                    </div>

                    <div className="border-b-2 border-dashed border-slate-300 my-2.5"></div>

                    <div className="space-y-1 text-[11px]">
                      <div className="font-bold text-slate-900 mb-1">RINCIAN METODE PEMBAYARAN:</div>
                      <div className="flex justify-between text-slate-700">
                        <span>• Penjualan Tunai:</span>
                        <span className="font-bold">{formatRupiah(selectedShift.tunai)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>• Penjualan QRIS:</span>
                        <span className="font-bold">{formatRupiah(selectedShift.qris)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>• Transfer Bank:</span>
                        <span className="font-bold">{formatRupiah(selectedShift.transfer)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>• Piutang Kasbon:</span>
                        <span className="font-bold">{formatRupiah(selectedShift.kasbon)}</span>
                      </div>
                    </div>

                    <div className="border-b-2 border-dashed border-slate-300 my-2.5"></div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-sm font-black text-slate-900">
                        <span>TOTAL OMZET:</span>
                        <span className="text-emerald-800">{formatRupiah(selectedShift.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Keluar Kas Laci:</span>
                        <span className="text-orange-700 font-bold">-{formatRupiah(selectedShift.drawerExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 font-bold">
                        <span>Est. Laba Bersih:</span>
                        <span className="text-blue-800">{formatRupiah(selectedShift.netProfit)}</span>
                      </div>
                    </div>

                    <div className="border-b-2 border-dashed border-slate-300 my-2.5"></div>

                    <div className="space-y-1 text-[11px]">
                      <div className="font-bold text-slate-900 mb-1">REKONSILIASI UANG LACI:</div>
                      <div className="flex justify-between text-slate-700">
                        <span>Saldo Menurut Sistem:</span>
                        <span>{formatRupiah(selectedShift.systemCashDrawer)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold">
                        <span>Uang Fisik Aktual:</span>
                        <span>{formatRupiah(selectedShift.actualCashDrawer)}</span>
                      </div>
                      <div className="flex justify-between font-black pt-1">
                        <span>Status Selisih Kas:</span>
                        <span
                          className={
                            selectedShift.cashDifference === 0
                              ? "text-emerald-700"
                              : selectedShift.cashDifference > 0
                              ? "text-blue-700"
                              : "text-rose-700"
                          }
                        >
                          {selectedShift.cashDifference === 0
                            ? "PAS / SEIMBANG (Rp 0)"
                            : selectedShift.cashDifference > 0
                            ? `LEBIH +${formatRupiah(selectedShift.cashDifference)}`
                            : `KURANG -${formatRupiah(Math.abs(selectedShift.cashDifference))}`}
                        </span>
                      </div>
                      {selectedShift.notes && (
                        <div className="p-2 mt-2 rounded bg-amber-50 border border-amber-200 text-slate-700 text-[10.5px]">
                          <span className="font-bold">Catatan Kasir:</span> {selectedShift.notes}
                        </div>
                      )}
                    </div>

                    <div className="border-b-2 border-dashed border-slate-400 my-3"></div>

                    <div className="text-center text-[10px] text-slate-500">
                      <p className="font-bold text-slate-700">BUKTI SERAH TERIMA SHIFT KASIR</p>
                      <p>{getStoreSettings().storeName}</p>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent border-b-2 border-dashed border-amber-300"></div>
                  </div>

                  {/* Action Toolbar under Shift Receipt */}
                  <div className="mt-3 grid grid-cols-3 gap-2 no-print">
                    <button
                      onClick={() => printShiftReport(selectedShift)}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Cetak Rekap</span>
                    </button>
                    <button
                      onClick={() => shareShiftWhatsApp(selectedShift)}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span>Kirim WA</span>
                    </button>
                    <button
                      onClick={() => copyShiftText(selectedShift)}
                      className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>Salin Teks</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {/* ─── MODAL KONFIRMASI BATALKAN TRANSAKSI (VOID) ─── */}
      {saleToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Batalkan Transaksi Ini?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Nota <strong>{saleToVoid.receiptNo}</strong> sebesar{" "}
              <strong>{formatRupiah(saleToVoid.totalAmount)}</strong> akan dihapus dari histori dan stok barang akan otomatis dikembalikan ke katalog toko.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSaleToVoid(null)}
                disabled={isVoiding}
                className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleVoidSale}
                disabled={isVoiding}
                className="flex-1 py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isVoiding ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <span>Ya, Batalkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL KONFIRMASI KOSONGKAN MUTASI STOK ─── */}
      {showClearMutasiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">delete_sweep</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Kosongkan Semua Mutasi?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Semua <strong>{mutasi.length} catatan riwayat mutasi stok</strong> lama akan dihapus permanen sehingga Anda bisa mulai bersih dari nol.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowClearMutasiModal(false)}
                disabled={isClearingMutasi}
                className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllMutations}
                disabled={isClearingMutasi}
                className="flex-1 py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isClearingMutasi ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Kosongkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL KONFIRMASI KOSONGKAN RIWAYAT TUTUP SHIFT ─── */}
      {showClearShiftsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">delete_sweep</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Kosongkan Riwayat Tutup Shift?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Semua <strong>{shifts.length} catatan rekap tutup shift</strong> akan dihapus permanen dari histori perangkat ini.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowClearShiftsModal(false)}
                disabled={isClearingShifts}
                className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllShifts}
                disabled={isClearingShifts}
                className="flex-1 py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isClearingShifts ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Kosongkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
