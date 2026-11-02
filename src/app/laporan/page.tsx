"use client";

import { useState, useEffect, useMemo } from "react";
import type { SaleTransaction } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";
import { deviceFetch, getDeviceId } from "@/lib/device";

interface Summary {
  totalItems: number;
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
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

export default function LaporanPage() {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"TODAY" | "YESTERDAY" | "7DAYS" | "MONTH">("TODAY");
  const [todayStr, setTodayStr] = useState("Hari ini");
  const [cashDrawerAmount, setCashDrawerAmount] = useState<number>(0);
  const [trendDays, setTrendDays] = useState<DayTrend[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, sumRes] = await Promise.all([
        deviceFetch("/api/sales?limit=50"),
        deviceFetch("/api/summary"),
      ]);
      const salesData = await salesRes.json();
      const sumData = await sumRes.json();
      if (salesData.success) setSales(salesData.data);
      if (sumData.success) setSummary(sumData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setTodayStr(
      new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
    try {
      const id = getDeviceId();
      const savedDrawer = localStorage.getItem(`pos_cash_drawer_${id}`);
      if (savedDrawer) {
        const num = parseInt(savedDrawer, 10);
        if (!isNaN(num)) setCashDrawerAmount(num);
      }
    } catch {}
  }, []);

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);

  // Payment breakdown
  const tunaiTotal = sales.filter((s) => s.paymentMethod === "TUNAI").reduce((s, x) => s + x.totalAmount, 0);
  const qrisTotal = sales.filter((s) => s.paymentMethod === "QRIS").reduce((s, x) => s + x.totalAmount, 0);
  const kasbonTotal = sales.filter((s) => s.paymentMethod === "KASBON").reduce((s, x) => s + x.totalAmount, 0);

  const hasSales = sales.length > 0 && totalRevenue > 0;
  const grandTotal = totalRevenue || 1;
  const tunaiPct = hasSales ? Math.round((tunaiTotal / grandTotal) * 100) : 0;
  const qrisPct = hasSales ? Math.round((qrisTotal / grandTotal) * 100) : 0;
  const kasbonPct = hasSales ? Math.max(0, 100 - tunaiPct - qrisPct) : 0;
  const marginPct = hasSales ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // Dynamic 7-day trend calculation inside useEffect to satisfy Next.js 16 SSR
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
    const headers = "No. Nota,Waktu,Pelanggan,Metode,Total,Laba\n";
    const rows = sales
      .map(
        (s) =>
          `"${s.receiptNo}","${new Date(s.createdAt).toLocaleString("id-ID")}","${s.customerName || "Umum"}","${s.paymentMethod}",${s.totalAmount},${s.profit}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Toko_Dewi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

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
            Laporan Omzet & Keuangan
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
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Omzet Kotor (Gross)
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                  {formatRupiah(summary?.todayRevenue ?? totalRevenue)}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
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
              <span>{summary?.todaySales ?? sales.length} Transaksi Nota</span>
              <span style={{ color: hasSales ? "#16a34a" : "#94a3b8", fontWeight: 700 }}>
                {hasSales ? "↑ Aktif" : "Belum ada transaksi"}
              </span>
            </div>
          </div>

          {/* Card 2: Laba Bersih */}
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
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Estimasi Laba Bersih
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#006c49", marginTop: 4 }}>
                  {formatRupiah(summary?.todayProfit ?? totalProfit)}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
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
              <span>Margin Keuntungan</span>
              <span style={{ color: hasSales ? "#006c49" : "#94a3b8", fontWeight: 800 }}>
                {marginPct}% Net
              </span>
            </div>
          </div>

          {/* Card 3: Kas Masuk Terkumpul */}
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
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Kas Masuk Terkumpul
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                  {formatRupiah(tunaiTotal + qrisTotal)}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
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
              <span>Tunai + QRIS</span>
              <span style={{ color: hasSales ? "#2563eb" : "#94a3b8", fontWeight: 700 }}>
                {hasSales ? "Settlement Klop" : "Rp 0"}
              </span>
            </div>
          </div>

          {/* Card 4: Piutang Kasbon Baru */}
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
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Piutang Kasbon
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>
                  {formatRupiah(kasbonTotal)}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fef2f2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
              <span>Tertulis di Bon</span>
              <span style={{ color: kasbonTotal > 0 ? "#dc2626" : "#94a3b8", fontWeight: 700 }}>
                {hasSales ? `${kasbonPct}% dari Omzet` : "Rp 0"}
              </span>
            </div>
          </div>
        </div>

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
                  ? `Toko aktif dengan total omzet ${formatRupiah(totalRevenue)} dan margin laba rata-rata ${marginPct}%. Pantau komoditas sembako yang cepat laku setiap pagi.`
                  : "Data toko mulai bersih dari nol. Lakukan transaksi pertama di Kasir POS untuk mengaktifkan kalkulasi tren omzet, produk terlaris, dan analitik margin keuntungan secara otomatis."}
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
              {/* Multi-segment Progress Bar */}
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
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Pengeluaran Operasional</span>
                  <span style={{ fontWeight: 700 }}>-Rp 0</span>
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
                    {formatRupiah(cashDrawerAmount + tunaiTotal)}
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
              Daftar Transaksi Kasir Terakhir
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{sales.length} transaksi selesai</span>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Memuat riwayat transaksi...</div>
          ) : sales.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Belum ada transaksi tercatat</div>
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
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Laba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
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
                        <td style={{ fontSize: 12 }}>{sale.customerName || "Umum"}</td>
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
                {sales.map((sale) => {
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
                          <div
                            style={{
                              fontSize: 9.5,
                              color: "#64748b",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            Estimasi Laba
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: sale.profit > 0 ? "#10b981" : "#dc2626",
                            }}
                          >
                            +{formatRupiah(sale.profit)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 9.5,
                              color: "#64748b",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
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
    </>
  );
}
