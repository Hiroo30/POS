"use client";

import { useState, useEffect, useMemo } from "react";
import type { SaleTransaction, StoreExpense, Customer, ExpenseCategory } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { deviceFetch, getDeviceId } from "@/lib/device";
import { playSuccessSound } from "@/lib/audio";
import ExpenseModal from "@/components/ExpenseModal";

interface Summary {
  totalItems: number;
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
  todayExpenses?: number;
  todayNetProfit?: number;
  totalExpenses?: number;
  totalCustomers?: number;
  totalPointsActive?: number;
}

interface DayTrend {
  day: string;
  dateKey: string;
  omzet: number;
  laba: number;
  omzetHeight: number;
  labaHeight: number;
  isPeak: boolean;
}

const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; bg: string }
> = {
  kresek: { label: "Plastik & Kresek", icon: "shopping_bag", color: "#0284c7", bg: "#e0f2fe" },
  konsumsi: { label: "Konsumsi / Makan", icon: "restaurant", color: "#d97706", bg: "#fef3c7" },
  kebersihan: { label: "Sampah & Ronda", icon: "delete_sweep", color: "#16a34a", bg: "#dcfce7" },
  transport: { label: "Bensin & Parkir", icon: "local_gas_station", color: "#ea580c", bg: "#ffedd5" },
  operasional: { label: "Listrik & Air", icon: "bolt", color: "#ca8a04", bg: "#fef9c3" },
  perawatan: { label: "Alat & Servis", icon: "build", color: "#4f46e5", bg: "#e0e7ff" },
  lainnya: { label: "Lain-lain", icon: "more_horiz", color: "#64748b", bg: "#f1f5f9" },
};

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<"SALES" | "EXPENSES" | "CUSTOMERS">("SALES");
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [expenses, setExpenses] = useState<StoreExpense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"TODAY" | "YESTERDAY" | "7DAYS" | "MONTH">("TODAY");
  const [todayStr, setTodayStr] = useState("Hari ini");
  const [dateKeys, setDateKeys] = useState({
    todayKey: "",
    yesterdayKey: "",
    sevenDaysKey: "",
    monthKey: "",
  });
  const [cashDrawerAmount, setCashDrawerAmount] = useState<number>(0);
  const [trendDays, setTrendDays] = useState<DayTrend[]>([]);

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [selectedCustomerForRedeem, setSelectedCustomerForRedeem] = useState<Customer | null>(null);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, sumRes, expRes, custRes] = await Promise.all([
        deviceFetch("/api/sales?limit=100"),
        deviceFetch("/api/summary"),
        deviceFetch("/api/expenses"),
        deviceFetch("/api/customers"),
      ]);
      const [salesData, sumData, expData, custData] = await Promise.all([
        salesRes.json(),
        sumRes.json(),
        expRes.json(),
        custRes.json(),
      ]);
      if (salesData.success) setSales(salesData.data);
      if (sumData.success) setSummary(sumData.data);
      if (expData.success) setExpenses(expData.data);
      if (custData.success) setCustomers(custData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const now = new Date();
    setTodayStr(
      now.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
    const todayKey = now.toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysKey = sevenDaysAgo.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);

    setDateKeys({
      todayKey,
      yesterdayKey,
      sevenDaysKey,
      monthKey,
    });

    try {
      const id = getDeviceId();
      const savedDrawer = localStorage.getItem(`pos_cash_drawer_${id}`);
      if (savedDrawer) {
        const num = parseInt(savedDrawer, 10);
        if (!isNaN(num)) setCashDrawerAmount(num);
      }
    } catch {}
  }, []);

  const handleSaveCashDrawer = (newAmount: number) => {
    setCashDrawerAmount(newAmount);
    try {
      const id = getDeviceId();
      if (id) {
        localStorage.setItem(`pos_cash_drawer_${id}`, newAmount.toString());
      }
    } catch {}
  };

  // Filter sales based on active period (SSR-safe via dateKeys state)
  const filteredSales = useMemo(() => {
    if (!dateKeys.todayKey) return sales;
    return sales.filter((s) => {
      const sKey = (s.createdAt || "").slice(0, 10);
      if (period === "TODAY") return sKey === dateKeys.todayKey;
      if (period === "YESTERDAY") return sKey === dateKeys.yesterdayKey;
      if (period === "7DAYS") return sKey >= dateKeys.sevenDaysKey;
      if (period === "MONTH") return (s.createdAt || "").startsWith(dateKeys.monthKey);
      return true;
    });
  }, [sales, period, dateKeys]);

  // Filter expenses based on active period (SSR-safe via dateKeys state)
  const filteredExpenses = useMemo(() => {
    if (!dateKeys.todayKey) return expenses;
    return expenses.filter((e) => {
      const eDate = e.createdAt || "";
      const eKey = eDate.slice(0, 10);
      if (period === "TODAY") return eKey === dateKeys.todayKey;
      if (period === "YESTERDAY") return eKey === dateKeys.yesterdayKey;
      if (period === "7DAYS") return eKey >= dateKeys.sevenDaysKey;
      if (period === "MONTH") return eDate.startsWith(dateKeys.monthKey);
      return true;
    });
  }, [expenses, period, dateKeys]);

  // Calculated metrics
  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalProfit = filteredSales.reduce((s, sale) => s + sale.profit, 0);
  const totalExpensesPeriod = filteredExpenses.reduce((s, exp) => s + exp.amount, 0);
  const drawerExpensesTotal = filteredExpenses.filter((e) => e.paidFromDrawer).reduce((s, e) => s + e.amount, 0);
  const netProfitReal = totalProfit - totalExpensesPeriod;

  // Payment breakdown
  const tunaiTotal = filteredSales.filter((s) => s.paymentMethod === "TUNAI").reduce((s, x) => s + x.totalAmount, 0);
  const qrisTotal = filteredSales.filter((s) => s.paymentMethod === "QRIS").reduce((s, x) => s + x.totalAmount, 0);
  const kasbonTotal = filteredSales.filter((s) => s.paymentMethod === "KASBON").reduce((s, x) => s + x.totalAmount, 0);

  const hasSales = filteredSales.length > 0 && totalRevenue > 0;
  const grandTotal = totalRevenue || 1;
  const tunaiPct = hasSales ? Math.round((tunaiTotal / grandTotal) * 100) : 0;
  const qrisPct = hasSales ? Math.round((qrisTotal / grandTotal) * 100) : 0;
  const kasbonPct = hasSales ? Math.max(0, 100 - tunaiPct - qrisPct) : 0;
  const marginPct = hasSales ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";
  const netMarginPct = hasSales ? ((netProfitReal / totalRevenue) * 100).toFixed(1) : "0.0";

  // Dynamic 7-day trend calculation
  useEffect(() => {
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const now = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];

      const daySales = sales.filter((s) => s.createdAt && s.createdAt.slice(0, 10) === dateKey);
      const dayRevenue = daySales.reduce((acc, s) => acc + s.totalAmount, 0);
      const dayProfit = daySales.reduce((acc, s) => acc + s.profit, 0);

      result.push({
        day: dayName,
        dateKey,
        omzet: dayRevenue,
        laba: dayProfit,
      });
    }
    const maxRev = Math.max(...result.map((r) => r.omzet), 1);
    setTrendDays(
      result.map((r) => ({
        ...r,
        omzetHeight: r.omzet > 0 ? Math.max(12, Math.round((r.omzet / maxRev) * 100)) : 4,
        labaHeight: r.laba > 0 ? Math.max(8, Math.round((r.laba / maxRev) * 100)) : 3,
        isPeak: r.omzet > 0 && r.omzet === maxRev,
      }))
    );
  }, [sales]);

  const methodColors: Record<string, string> = {
    TUNAI: "#16a34a",
    QRIS: "#7c3aed",
    TRANSFER: "#2563eb",
    KASBON: "#dc2626",
  };

  const handleExportCSV = () => {
    let headers = "";
    let rows = "";
    let filename = "";

    if (activeTab === "EXPENSES") {
      headers = "Waktu,Kategori,Keterangan,Nominal,Potong Dari Laci\n";
      rows = filteredExpenses
        .map(
          (e) =>
            `"${new Date(e.createdAt).toLocaleString("id-ID")}","${e.category}","${e.description.replace(/"/g, '""')}",${e.amount},${e.paidFromDrawer ? "YA" : "TIDAK"}`
        )
        .join("\n");
      filename = `Pengeluaran_Toko_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (activeTab === "CUSTOMERS") {
      headers = "Nama Pelanggan,No. HP/WA,Poin Aktif,Total Belanja,Kunjungan,Belanja Terakhir\n";
      rows = customers
        .map(
          (c) =>
            `"${c.name.replace(/"/g, '""')}","${c.phone || "-"}","${c.points}",${c.totalSpent},${c.visitCount},"${new Date(c.updatedAt || c.createdAt).toLocaleDateString("id-ID")}"`
        )
        .join("\n");
      filename = `Loyalitas_Poin_Pelanggan_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      headers = "No. Nota,Waktu,Pelanggan,Metode,Total,Laba,Poin Didapat,Poin Ditukar\n";
      rows = filteredSales
        .map(
          (s) =>
            `"${s.receiptNo}","${new Date(s.createdAt).toLocaleString("id-ID")}","${(s.customerName || "Umum").replace(/"/g, '""')}","${s.paymentMethod}",${s.totalAmount},${s.profit},${s.pointsEarned || 0},${s.pointsRedeemed || 0}`
        )
        .join("\n");
      filename = `Laporan_Penjualan_Toko_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (!confirm(`Hapus catatan pengeluaran "${desc}"?`)) return;
    try {
      const res = await deviceFetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menghapus");
      playSuccessSound();
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await deviceFetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menambah pelanggan");
      playSuccessSound();
      setShowAddCustomerModal(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForRedeem) return;
    if (pointsToRedeemInput <= 0 || pointsToRedeemInput > selectedCustomerForRedeem.points) {
      alert("Jumlah poin tidak valid atau melebihi saldo pelanggan!");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await deviceFetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REDEEM",
          customerId: selectedCustomerForRedeem.id,
          pointsToRedeem: pointsToRedeemInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menukar poin");
      playSuccessSound();
      setSelectedCustomerForRedeem(null);
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWaPoints = (cust: Customer) => {
    const rupiahVal = Math.floor(cust.points / 10) * 5000;
    const msg = `Halo ${cust.name}! 😊\n\nTerima kasih atas kepercayaannya selalu berbelanja di Toko kami.\n\n⭐ *Saldo Poin Anda:* ${cust.points} Poin\n🎁 *Nilai Diskon / Hadiah THR:* ${formatRupiah(rupiahVal)}\n\nPoin bisa ditukarkan dengan potongan belanja atau bingkisan THR sembako saat berkunjung ke toko kami. Ditunggu kedatangannya ya! 🙏✨`;
    const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, "").replace(/^0/, "62") : "";
    if (cleanPhone) {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  // Sort customers by points descending for leaderboard
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => b.points - a.points || b.totalSpent - a.totalSpent);
  }, [customers]);

  const totalPointsActive = useMemo(() => {
    return customers.reduce((s, c) => s + (c.points || 0), 0);
  }, [customers]);

  return (
    <>
      {/* Header Bar */}
      <div
        className="desktop-only"
        style={{
          height: 60,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
          zIndex: 30,
          position: "sticky",
          top: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Laporan Keuangan & Loyalitas Toko
          </h1>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: "#dcfce7",
              color: "#15803d",
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            Live Data
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#c2410c",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span className="material-symbols-outlined text-[15px]">payments</span>
            + Catat Kas Keluar
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Unduh CSV
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: "#006c49",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Cetak Laporan
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 20px 100px", background: "#f4f6fb", minHeight: "calc(100vh - 60px)" }}>
        {/* Period Filter Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#ffffff",
              padding: 3,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            {[
              { id: "TODAY", label: "Hari Ini" },
              { id: "YESTERDAY", label: "Kemarin" },
              { id: "7DAYS", label: "7 Hari Terakhir" },
              { id: "MONTH", label: "Bulan Ini" },
            ].map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as typeof period)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: active ? "#006c49" : "transparent",
                    color: active ? "#ffffff" : "#64748b",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>{todayStr}</span>
        </div>

        {/* 4 Bento KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {/* Card 1: Omzet Kotor */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Omzet Kotor (Gross)
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                  {formatRupiah(totalRevenue)}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#f0fdf4",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "6px 8px",
                background: "#f8fafc",
                borderRadius: 8,
                fontSize: 11,
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{filteredSales.length} Transaksi Nota</span>
              <span style={{ color: hasSales ? "#16a34a" : "#94a3b8", fontWeight: 700 }}>
                {hasSales ? "↑ Aktif" : "Belum ada transaksi"}
              </span>
            </div>
          </div>

          {/* Card 2: Laba Kotor Penjualan */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Laba Kotor Barang
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#006c49", marginTop: 4 }}>
                  {formatRupiah(totalProfit)}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "6px 8px",
                background: "#f8fafc",
                borderRadius: 8,
                fontSize: 11,
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Margin Penjualan</span>
              <span style={{ color: hasSales ? "#006c49" : "#94a3b8", fontWeight: 800 }}>
                {marginPct}% Gross
              </span>
            </div>
          </div>

          {/* Card 3: Biaya Operasional Toko */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Biaya Operasional Toko
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#ea580c", marginTop: 4 }}>
                  {formatRupiah(totalExpensesPeriod)}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fff7ed",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "6px 8px",
                background: "#f8fafc",
                borderRadius: 8,
                fontSize: 11,
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{filteredExpenses.length} Kas Keluar</span>
              <span style={{ color: drawerExpensesTotal > 0 ? "#ea580c" : "#64748b", fontWeight: 700 }}>
                {drawerExpensesTotal > 0 ? `${formatRupiah(drawerExpensesTotal)} dr Laci` : "Bebas Biaya"}
              </span>
            </div>
          </div>

          {/* Card 4: Laba Bersih Riil Toko */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Laba Bersih Riil Toko
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: netProfitReal >= 0 ? "#047857" : "#dc2626", marginTop: 4 }}>
                  {formatRupiah(netProfitReal)}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: netProfitReal >= 0 ? "#ecfdf5" : "#fef2f2",
                  color: netProfitReal >= 0 ? "#047857" : "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "6px 8px",
                background: "#f8fafc",
                borderRadius: 8,
                fontSize: 11,
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Bersih Setelah Biaya</span>
              <span style={{ color: netProfitReal >= 0 ? "#047857" : "#dc2626", fontWeight: 800 }}>
                {netMarginPct}% Net
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Omzet vs Pengeluaran Toko vs Loyalitas Pelanggan */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab("SALES")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "SALES" ? "#006c49" : "#ffffff",
              color: activeTab === "SALES" ? "#ffffff" : "#475569",
              border: `1.5px solid ${activeTab === "SALES" ? "#006c49" : "#cbd5e1"}`,
              boxShadow: activeTab === "SALES" ? "0 2px 6px rgba(0,108,73,0.2)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>📊</span>
            <span>Omzet & Penjualan ({filteredSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("EXPENSES")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "EXPENSES" ? "#ea580c" : "#ffffff",
              color: activeTab === "EXPENSES" ? "#ffffff" : "#475569",
              border: `1.5px solid ${activeTab === "EXPENSES" ? "#ea580c" : "#cbd5e1"}`,
              boxShadow: activeTab === "EXPENSES" ? "0 2px 6px rgba(234,88,12,0.2)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>💸</span>
            <span>Pengeluaran Toko ({filteredExpenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CUSTOMERS")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "CUSTOMERS" ? "#b45309" : "#ffffff",
              color: activeTab === "CUSTOMERS" ? "#ffffff" : "#475569",
              border: `1.5px solid ${activeTab === "CUSTOMERS" ? "#b45309" : "#cbd5e1"}`,
              boxShadow: activeTab === "CUSTOMERS" ? "0 2px 6px rgba(180,83,9,0.2)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>⭐</span>
            <span>Loyalitas & Poin THR ({customers.length})</span>
          </button>
        </div>

        {/* TAB 1: OMZET & PENJUALAN */}
        {activeTab === "SALES" && (
          <div>
            {/* 2-Column Main Split */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Left: Dynamic 7-Day Trend Graph & Real Insight */}
              <div style={{ background: "#ffffff", padding: "18px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                      Tren Penjualan & Laba Harian (7 Hari)
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {hasSales
                        ? "Rangkuman omzet dan margin laba bersih harian"
                        : "Grafik akan terisi otomatis seiring transaksi kasir berjalan"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 10, fontWeight: 700 }}>
                    <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> Omzet
                    </span>
                    <span style={{ color: "#006c49", display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#006c49" }} /> Laba
                    </span>
                  </div>
                </div>

                {/* Dynamic Bar Visual */}
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 12,
                    padding: "20px 14px 10px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    height: 160,
                  }}
                >
                  {trendDays.map((b) => (
                    <div
                      key={b.day + b.dateKey}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flex: 1,
                        position: "relative",
                      }}
                    >
                      {b.isPeak && b.omzet > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: -24,
                            background: "#0f172a",
                            color: "#fff",
                            fontSize: 8.5,
                            fontWeight: 800,
                            padding: "2px 5px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Puncak {formatRupiah(b.omzet)}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110 }}>
                        <div
                          style={{
                            width: 14,
                            height: `${b.omzetHeight}%`,
                            borderRadius: "4px 4px 0 0",
                            background: b.omzet > 0 ? (b.isPeak ? "#006c49" : "#10b981") : "#cbd5e1",
                            transition: "all 0.3s ease",
                          }}
                          title={`${b.day}: Omzet ${formatRupiah(b.omzet)}`}
                        />
                        <div
                          style={{
                            width: 8,
                            height: `${b.labaHeight}%`,
                            borderRadius: "3px 3px 0 0",
                            background: b.laba > 0 ? "#059669" : "#e2e8f0",
                            transition: "all 0.3s ease",
                          }}
                          title={`${b.day}: Laba ${formatRupiah(b.laba)}`}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: b.isPeak && b.omzet > 0 ? 800 : 600,
                          color: b.isPeak && b.omzet > 0 ? "#006c49" : "#64748b",
                          marginTop: 6,
                        }}
                      >
                        {b.day}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Operational Insight Box */}
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    background: hasSales ? "#f0fdf4" : "#f8fafc",
                    borderRadius: 10,
                    border: `1px solid ${hasSales ? "#bbf7d0" : "#e2e8f0"}`,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 16 }}>💡</span>
                  <div style={{ fontSize: 11.5, color: hasSales ? "#166534" : "#64748b", lineHeight: 1.4 }}>
                    <strong>Insight Operasional:</strong>{" "}
                    {hasSales
                      ? `Toko aktif dengan total omzet ${formatRupiah(totalRevenue)}. Biaya operasional toko tercatat ${formatRupiah(totalExpensesPeriod)}, sehingga laba bersih riil mencapai ${formatRupiah(netProfitReal)} (${netMarginPct}% margin riil).`
                      : "Belum ada transaksi di periode ini. Lakukan transaksi di kasir POS untuk mengaktifkan kalkulasi tren omzet secara otomatis."}
                  </div>
                </div>
              </div>

              {/* Right: Cash Drawer & Payment Settlement */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Payment Method Breakdown Bar */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                    Metode Pembayaran Real-Time
                  </div>
                  <div
                    style={{
                      height: 12,
                      borderRadius: 6,
                      overflow: "hidden",
                      display: "flex",
                      background: "#e2e8f0",
                      marginBottom: 12,
                    }}
                  >
                    {hasSales ? (
                      <>
                        <div style={{ width: `${tunaiPct}%`, background: "#16a34a" }} title={`Tunai ${tunaiPct}%`} />
                        <div style={{ width: `${qrisPct}%`, background: "#7c3aed" }} title={`QRIS ${qrisPct}%`} />
                        <div style={{ width: `${kasbonPct}%`, background: "#dc2626" }} title={`Kasbon ${kasbonPct}%`} />
                      </>
                    ) : (
                      <div style={{ width: "100%", background: "#cbd5e1" }} title="Belum ada transaksi" />
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, textAlign: "center" }}>
                    <div style={{ background: "#f0fdf4", padding: "6px", borderRadius: 8 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#166534" }}>TUNAI</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#15803d" }}>{tunaiPct}%</div>
                    </div>
                    <div style={{ background: "#faf5ff", padding: "6px", borderRadius: 8 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6b21a8" }}>QRIS</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#7c3aed" }}>{qrisPct}%</div>
                    </div>
                    <div style={{ background: "#fef2f2", padding: "6px", borderRadius: 8 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#991b1b" }}>KASBON</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#dc2626" }}>{kasbonPct}%</div>
                    </div>
                  </div>
                </div>

                {/* Rekonsiliasi Kas Laci Kasir */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Rekonsiliasi Kas Laci</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: cashDrawerAmount > 0 || tunaiTotal > 0 ? "#dcfce7" : "#f1f5f9",
                        color: cashDrawerAmount > 0 || tunaiTotal > 0 ? "#15803d" : "#64748b",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {cashDrawerAmount > 0 || tunaiTotal > 0 ? "Kas Klop" : "Belum Ada Mutasi"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                      <span>Modal Awal Kasir</span>
                      <span style={{ fontWeight: 700 }}>+{formatRupiah(cashDrawerAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d" }}>
                      <span>Kas Masuk Penjualan (Tunai)</span>
                      <span style={{ fontWeight: 800 }}>+{formatRupiah(tunaiTotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#ea580c" }}>
                      <span>Pengeluaran Toko (Potong Laci)</span>
                      <span style={{ fontWeight: 700 }}>-{formatRupiah(drawerExpensesTotal)}</span>
                    </div>
                    <div
                      style={{
                        borderTop: "1px dashed #cbd5e1",
                        paddingTop: 8,
                        marginTop: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>Total Fisik Laci:</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "#006c49" }}>
                        {formatRupiah(cashDrawerAmount + tunaiTotal - drawerExpensesTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History Table & Mobile Cards */}
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  Daftar Transaksi Kasir ({filteredSales.length})
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{filteredSales.length} transaksi selesai</span>
              </div>

              {isLoading ? (
                <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Memuat riwayat transaksi...</div>
              ) : filteredSales.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Belum ada transaksi tercatat pada periode ini</div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="desktop-only" style={{ overflowX: "auto" }}>
                    <table className="kp-table">
                      <thead>
                        <tr>
                          <th>No. Nota</th>
                          <th>Waktu</th>
                          <th>Pelanggan</th>
                          <th>Item</th>
                          <th>Metode</th>
                          <th style={{ textAlign: "center" }}>Poin</th>
                          <th style={{ textAlign: "right" }}>Total Tagihan</th>
                          <th style={{ textAlign: "right" }}>Laba Kotor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.map((sale) => (
                          <tr key={sale.id}>
                            <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{sale.receiptNo}</td>
                            <td style={{ fontSize: 11, color: "#64748b" }}>
                              {new Date(sale.createdAt).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td style={{ fontSize: 12, fontWeight: 600 }}>{sale.customerName || "Walk-in (Umum)"}</td>
                            <td style={{ fontSize: 12 }}>{sale.items.length} item</td>
                            <td>
                              <span
                                className="kp-badge"
                                style={{
                                  background: `${methodColors[sale.paymentMethod] || "#94a3b8"}20`,
                                  color: methodColors[sale.paymentMethod] || "#94a3b8",
                                }}
                              >
                                {sale.paymentMethod}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontSize: 11 }}>
                              {sale.pointsEarned ? (
                                <span style={{ color: "#16a34a", fontWeight: 700 }}>+{sale.pointsEarned}p</span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>-</span>
                              )}
                              {sale.pointsRedeemed ? (
                                <span style={{ color: "#dc2626", fontWeight: 700, marginLeft: 4 }}>(-{sale.pointsRedeemed}p)</span>
                              ) : null}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: "#006c49" }}>
                              {formatRupiah(sale.totalAmount)}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: 700,
                                color: sale.profit > 0 ? "#10b981" : "#dc2626",
                              }}
                            >
                              {formatRupiah(sale.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="mobile-only" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredSales.map((sale) => {
                      const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                      return (
                        <div key={sale.id} className="kp-card" style={{ padding: "12px 14px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <div>
                              <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                                {sale.receiptNo}
                              </div>
                              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                                {new Date(sale.createdAt).toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            <span
                              className="kp-badge"
                              style={{
                                background: `${methodColors[sale.paymentMethod] || "#94a3b8"}20`,
                                color: methodColors[sale.paymentMethod] || "#94a3b8",
                                fontWeight: 800,
                                fontSize: 10,
                              }}
                            >
                              {sale.paymentMethod}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              background: "#f8fafc",
                              borderRadius: 6,
                              marginBottom: 8,
                            }}
                          >
                            <span style={{ fontSize: 11.5, color: "#475569" }}>
                              {sale.customerName ? `Pelanggan: ${sale.customerName}` : "Pelanggan: Umum"}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                              {sale.items.length} jenis ({totalUnits} qty)
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "space-between",
                              borderTop: "1px dashed #e2e8f0",
                              paddingTop: 8,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                                Estimasi Laba
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: sale.profit > 0 ? "#10b981" : "#dc2626" }}>
                                +{formatRupiah(sale.profit)}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                                Total Tagihan
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: "#006c49" }}>
                                {formatRupiah(sale.totalAmount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PENGELUARAN TOKO (ARUS KAS KELUAR) */}
        {activeTab === "EXPENSES" && (
          <div>
            {/* Top Expenses Ribbon */}
            <div
              style={{
                background: "#ffffff",
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  Catatan Biaya Operasional Toko
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Kresek, plastik, listrik, sampah/ronda, makan penjaga & transport kulakan
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right", marginRight: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Beban Periode Ini:</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#ea580c" }}>{formatRupiah(totalExpensesPeriod)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(true)}
                  style={{
                    background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 16px",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 6px rgba(234,88,12,0.3)",
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>+ Catat Pengeluaran</span>
                </button>
              </div>
            </div>

            {/* Category Summary Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {(Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((catKey) => {
                const meta = EXPENSE_CATEGORY_META[catKey];
                const catExpenses = filteredExpenses.filter((e) => e.category === catKey);
                const sum = catExpenses.reduce((s, e) => s + e.amount, 0);
                if (sum === 0 && filteredExpenses.length > 0) return null;
                return (
                  <div
                    key={catKey}
                    style={{
                      background: "#ffffff",
                      border: `1px solid #e2e8f0`,
                      borderRadius: 10,
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: meta.bg,
                        color: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>{meta.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{formatRupiah(sum)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expenses List */}
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  Daftar Mutasi Kas Keluar ({filteredExpenses.length})
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {filteredExpenses.filter((e) => e.paidFromDrawer).length} dipotong laci kasir
                </span>
              </div>

              {filteredExpenses.length === 0 ? (
                <div style={{ padding: 50, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🛍️</div>
                  <div style={{ fontWeight: 700, color: "#475569" }}>Belum ada catatan pengeluaran di periode ini</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    Catat pembelian plastik kresek, bayar listrik, atau uang makan untuk hitung laba bersih riil.
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="desktop-only" style={{ overflowX: "auto" }}>
                    <table className="kp-table">
                      <thead>
                        <tr>
                          <th>Waktu</th>
                          <th>Kategori</th>
                          <th>Keterangan Pengeluaran</th>
                          <th>Sumber Dana</th>
                          <th style={{ textAlign: "right" }}>Nominal</th>
                          <th style={{ textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((exp) => {
                          const meta = EXPENSE_CATEGORY_META[exp.category] || EXPENSE_CATEGORY_META.lainnya;
                          return (
                            <tr key={exp.id}>
                              <td style={{ fontSize: 11, color: "#64748b" }}>
                                {formatDateTime(exp.createdAt)}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    background: meta.bg,
                                    color: meta.color,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                              </td>
                              <td style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{exp.description}</td>
                              <td>
                                {exp.paidFromDrawer ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      padding: "2px 7px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    💵 Laci Kasir
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      padding: "2px 7px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    👛 Kas Luar
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 900, color: "#ea580c" }}>
                                -{formatRupiah(exp.amount)}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.id, exp.description)}
                                  style={{
                                    border: "none",
                                    background: "#fee2e2",
                                    color: "#dc2626",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                  title="Hapus catatan pengeluaran"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="mobile-only" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredExpenses.map((exp) => {
                      const meta = EXPENSE_CATEGORY_META[exp.category] || EXPENSE_CATEGORY_META.lainnya;
                      return (
                        <div key={exp.id} className="kp-card" style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: meta.bg,
                                color: meta.color,
                                fontSize: 10.5,
                                fontWeight: 700,
                              }}
                            >
                              <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                              <span>{meta.label}</span>
                            </span>
                            <span style={{ fontSize: 10, color: "#64748b" }}>
                              {formatDateTime(exp.createdAt)}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                            {exp.description}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderTop: "1px dashed #e2e8f0",
                              paddingTop: 8,
                            }}
                          >
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              {exp.paidFromDrawer ? "💵 Dari Laci Kasir" : "👛 Kas Luar"}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 900, color: "#ea580c" }}>
                                -{formatRupiah(exp.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id, exp.description)}
                                style={{
                                  border: "none",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  borderRadius: 6,
                                  padding: "3px 6px",
                                  fontSize: 10,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LOYALITAS & POIN PELANGGAN (THR SEMBAKO) */}
        {activeTab === "CUSTOMERS" && (
          <div>
            {/* Loyalty Program Information Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
                border: "1px solid #fde68a",
                borderRadius: 14,
                padding: "16px 20px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ maxWidth: 640 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#b45309", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⭐</span> PROGRAM LOYALITAS & THR TOKO SEMBAKO
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#78350f", marginTop: 4 }}>
                  Belanja Kelipatan Rp 10.000 = 1 Poin Sembako
                </div>
                <div style={{ fontSize: 11, color: "#92400e", marginTop: 2, lineHeight: 1.4 }}>
                  Pelanggan dapat menukarkan 10 Poin menjadi Diskon Rp 5.000 saat belanja, atau mengumpulkan poin untuk ditukar dengan Bingkisan THR (Minyak Goreng, Gula, Sirup, Piring Cantik) saat Hari Raya Idul Fitri.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                style={{
                  background: "#b45309",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 16px",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 6px rgba(180,83,9,0.3)",
                }}
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>+ Tambah Pelanggan</span>
              </button>
            </div>

            {/* Mini Loyalty KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#ffffff", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Pelanggan Terdaftar</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{customers.length} Orang</div>
              </div>
              <div style={{ background: "#ffffff", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Poin Aktif Beredar</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#b45309", marginTop: 4 }}>⭐ {totalPointsActive} Poin</div>
              </div>
              <div style={{ background: "#ffffff", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Nilai Klaim THR / Hadiah</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#047857", marginTop: 4 }}>
                  {formatRupiah(Math.floor(totalPointsActive / 10) * 5000)}
                </div>
              </div>
            </div>

            {/* Customers Leaderboard Table */}
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  Klasemen Pelanggan Paling Setia ({customers.length})
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>Urut berdasarkan poin tertinggi</span>
              </div>

              {sortedCustomers.length === 0 ? (
                <div style={{ padding: 50, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                  <div style={{ fontWeight: 700, color: "#475569" }}>Belum ada data pelanggan setia</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    Nama pelanggan yang diinput saat transaksi kasir akan otomatis terdaftar dan mengumpulkan poin di sini.
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="desktop-only" style={{ overflowX: "auto" }}>
                    <table className="kp-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50, textAlign: "center" }}>Rank</th>
                          <th>Nama Pelanggan</th>
                          <th>No. WhatsApp / HP</th>
                          <th style={{ textAlign: "center" }}>Saldo Poin</th>
                          <th style={{ textAlign: "right" }}>Total Belanja</th>
                          <th style={{ textAlign: "center" }}>Kunjungan</th>
                          <th>Belanja Terakhir</th>
                          <th style={{ textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCustomers.map((cust, idx) => {
                          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                          return (
                            <tr key={cust.id}>
                              <td style={{ textAlign: "center", fontWeight: 800, fontSize: 13 }}>
                                {medal}
                              </td>
                              <td style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                                {cust.name}
                              </td>
                              <td style={{ fontSize: 11, color: "#64748b" }}>
                                {cust.phone || "-"}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    background: "#fef3c7",
                                    color: "#b45309",
                                    fontWeight: 900,
                                    fontSize: 12,
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  ⭐ {cust.points} Poin
                                </span>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 800, color: "#006c49" }}>
                                {formatRupiah(cust.totalSpent)}
                              </td>
                              <td style={{ textAlign: "center", fontSize: 11, fontWeight: 700 }}>
                                {cust.visitCount}x
                              </td>
                              <td style={{ fontSize: 11, color: "#64748b" }}>
                                {new Date(cust.updatedAt || cust.createdAt).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomerForRedeem(cust);
                                      setPointsToRedeemInput(Math.min(cust.points, 10));
                                    }}
                                    disabled={cust.points < 10}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 6,
                                      border: "1px solid #cbd5e1",
                                      background: cust.points >= 10 ? "#ffffff" : "#f1f5f9",
                                      color: cust.points >= 10 ? "#b45309" : "#94a3b8",
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      cursor: cust.points >= 10 ? "pointer" : "not-allowed",
                                    }}
                                    title={cust.points >= 10 ? "Tukar Poin Jadi Diskon / Hadiah" : "Minimal 10 poin untuk ditukar"}
                                  >
                                    🎁 Tukar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendWaPoints(cust)}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 6,
                                      border: "none",
                                      background: "#16a34a",
                                      color: "#ffffff",
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                    title="Kirim info poin via WhatsApp"
                                  >
                                    WA Poin
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="mobile-only" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {sortedCustomers.map((cust, idx) => {
                      const medal = idx === 0 ? "🥇 Juara 1" : idx === 1 ? "🥈 Juara 2" : idx === 2 ? "🥉 Juara 3" : `Peringkat #${idx + 1}`;
                      return (
                        <div key={cust.id} className="kp-card" style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309" }}>{medal}</span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                background: "#fef3c7",
                                color: "#b45309",
                                fontWeight: 900,
                                fontSize: 11,
                                padding: "2px 7px",
                                borderRadius: 6,
                              }}
                            >
                              ⭐ {cust.points} Poin
                            </span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{cust.name}</div>
                          {cust.phone && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>📱 {cust.phone}</div>}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              background: "#f8fafc",
                              borderRadius: 6,
                              margin: "8px 0",
                              fontSize: 11,
                            }}
                          >
                            <span>Total: <strong>{formatRupiah(cust.totalSpent)}</strong></span>
                            <span>Kunjungan: <strong>{cust.visitCount}x</strong></span>
                          </div>
                          <div style={{ display: "flex", gap: 6, borderTop: "1px dashed #e2e8f0", paddingTop: 8 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerForRedeem(cust);
                                setPointsToRedeemInput(Math.min(cust.points, 10));
                              }}
                              disabled={cust.points < 10}
                              style={{
                                flex: 1,
                                padding: "6px 0",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                background: cust.points >= 10 ? "#ffffff" : "#f1f5f9",
                                color: cust.points >= 10 ? "#b45309" : "#94a3b8",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: cust.points >= 10 ? "pointer" : "not-allowed",
                              }}
                            >
                              🎁 Tukar Poin
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendWaPoints(cust)}
                              style={{
                                flex: 1,
                                padding: "6px 0",
                                borderRadius: 6,
                                border: "none",
                                background: "#16a34a",
                                color: "#ffffff",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Kirim WA
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
        )}
      </div>

      {/* Expense Recording Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        cashDrawerAmount={cashDrawerAmount}
        onSuccess={(amountDeducted) => {
          if (amountDeducted > 0) {
            handleSaveCashDrawer(Math.max(0, cashDrawerAmount - amountDeducted));
          }
          loadData();
        }}
      />

      {/* Modal Tambah Pelanggan Baru */}
      {showAddCustomerModal && (
        <div className="kp-modal-overlay">
          <div className="kp-modal" style={{ maxWidth: 400 }}>
            <div className="kp-modal-header" style={{ background: "linear-gradient(135deg, #b45309 0%, #92400e 100%)" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#fde68a", textTransform: "uppercase" }}>
                  PELANGGAN SETIA
                </div>
                <div className="kp-modal-header-title">Tambah Pelanggan Baru</div>
              </div>
              <button className="kp-modal-close" onClick={() => setShowAddCustomerModal(false)} type="button">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCustomerSubmit}>
              <div className="kp-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="kp-label">Nama Pelanggan / Warung <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: Bu Sri RT 02 / Mbak Yanti"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="kp-input"
                  />
                </div>
                <div>
                  <label className="kp-label">Nomor WhatsApp / HP (Opsional)</label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="kp-input"
                  />
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                    Nomor WhatsApp berguna untuk mengirim struk digital atau bukti saldo poin belanja.
                  </div>
                </div>
              </div>
              <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="kp-btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="kp-btn-primary"
                  style={{ flex: 1, justifyContent: "center", background: "#b45309" }}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tukar Poin / Klaim Hadiah */}
      {selectedCustomerForRedeem && (
        <div className="kp-modal-overlay">
          <div className="kp-modal" style={{ maxWidth: 420 }}>
            <div className="kp-modal-header" style={{ background: "linear-gradient(135deg, #15803d 0%, #166534 100%)" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#86efac", textTransform: "uppercase" }}>
                  KLAIM HADIAH / DISKON
                </div>
                <div className="kp-modal-header-title">Tukar Poin Pelanggan</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{selectedCustomerForRedeem.name}</div>
              </div>
              <button className="kp-modal-close" onClick={() => setSelectedCustomerForRedeem(null)} type="button">
                ✕
              </button>
            </div>
            <form onSubmit={handleRedeemPointsSubmit}>
              <div className="kp-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>Saldo Poin Saat Ini:</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#15803d" }}>⭐ {selectedCustomerForRedeem.points} Poin</span>
                  </div>
                </div>

                <div>
                  <label className="kp-label">Pilih Jumlah Poin yang Ditukar</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                    {[10, 20, 30, 50].map((pts) => {
                      if (pts > selectedCustomerForRedeem.points) return null;
                      const isSel = pointsToRedeemInput === pts;
                      return (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setPointsToRedeemInput(pts)}
                          style={{
                            padding: "8px 6px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            background: isSel ? "#15803d" : "#ffffff",
                            color: isSel ? "#ffffff" : "#15803d",
                            border: `1.5px solid ${isSel ? "#15803d" : "#86efac"}`,
                            textAlign: "center",
                          }}
                        >
                          {pts} Poin
                          <div style={{ fontSize: 9.5, opacity: 0.85 }}>({formatRupiah((pts / 10) * 5000)})</div>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={selectedCustomerForRedeem.points}
                    value={pointsToRedeemInput}
                    onChange={(e) => setPointsToRedeemInput(parseInt(e.target.value, 10) || 0)}
                    className="kp-input"
                    style={{ textAlign: "center", fontSize: 16, fontWeight: 800 }}
                  />
                  <div style={{ fontSize: 10.5, color: "#166534", marginTop: 4, textAlign: "center", fontWeight: 700 }}>
                    Setara Diskon Belanja / Nilai Hadiah THR: {formatRupiah(Math.floor(pointsToRedeemInput / 10) * 5000)}
                  </div>
                </div>
              </div>
              <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForRedeem(null)}
                  className="kp-btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || pointsToRedeemInput <= 0}
                  className="kp-btn-primary"
                  style={{ flex: 1, justifyContent: "center", background: "#15803d" }}
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Tukar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
