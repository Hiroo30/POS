"use client";

import { useState, useEffect } from "react";
import type { SaleTransaction } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";

interface Summary {
  totalItems: number;
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
}

export default function LaporanPage() {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, sumRes] = await Promise.all([
        fetch("/api/sales?limit=50"),
        fetch("/api/summary"),
      ]);
      const salesData = await salesRes.json();
      const sumData = await sumRes.json();
      if (salesData.success) setSales(salesData.data);
      if (sumData.success) setSummary(sumData.data);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const [todayStr, setTodayStr] = useState("Hari ini");

  useEffect(() => {
    loadData();
    setTodayStr(new Date().toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" }));
  }, []);

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);

  const methodColors: Record<string, string> = {
    TUNAI: "#16a34a",
    QRIS: "#7c3aed",
    TRANSFER: "#2563eb",
    KASBON: "#dc2626",
  };

  return (
    <>
      <div className="kp-topbar">
        <span className="kp-topbar-title">Laporan Omzet & Transaksi</span>
        <div className="kp-topbar-actions">
          <span style={{fontSize:11, color:"#64748b"}}>{todayStr}</span>
          <button className="kp-btn-secondary" onClick={loadData} style={{fontSize:11, padding:"5px 10px"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="kp-content">
        {/* Summary Cards */}
        <div className="grid-3" style={{gap:10, marginBottom:16}}>
          <div className="kp-chart-card">
            <div className="kp-chart-header">
              <span className="kp-chart-title">Jumlah Transaksi</span>
              <span className="kp-chart-date-badge">{todayStr}</span>
            </div>
            <div style={{padding:"14px 16px", textAlign:"center"}}>
              <div style={{fontSize:36, fontWeight:900, color:"#16a34a", lineHeight:1}}>
                {summary?.todaySales ?? sales.length}
              </div>
              <div style={{fontSize:11, color:"#64748b", marginTop:4}}>nota selesai hari ini</div>
            </div>
          </div>

          <div className="kp-chart-card">
            <div className="kp-chart-header">
              <span className="kp-chart-title">Pendapatan</span>
              <span className="kp-chart-date-badge">{todayStr}</span>
            </div>
            <div style={{padding:"14px 16px", textAlign:"center"}}>
              <div style={{fontSize:22, fontWeight:900, color:"#16a34a", lineHeight:1}}>
                {formatRupiah(summary?.todayRevenue ?? totalRevenue)}
              </div>
              <div style={{fontSize:11, color:"#64748b", marginTop:4}}>omzet kotor</div>
            </div>
          </div>

          <div className="kp-chart-card">
            <div className="kp-chart-header">
              <span className="kp-chart-title">Keuntungan</span>
              <span className="kp-chart-date-badge">{todayStr}</span>
            </div>
            <div style={{padding:"14px 16px", textAlign:"center"}}>
              <div style={{fontSize:22, fontWeight:900, color:"#16a34a", lineHeight:1}}>
                {formatRupiah(summary?.todayProfit ?? totalProfit)}
              </div>
              <div style={{fontSize:11, color:"#64748b", marginTop:4}}>laba bersih estimasi</div>
            </div>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="kp-section-header">
          <span className="kp-section-title">Riwayat Transaksi</span>
          <span style={{fontSize:11, color:"#94a3b8"}}>{sales.length} transaksi terakhir</span>
        </div>

        {isLoading ? (
          <div style={{textAlign:"center", padding:60, color:"#94a3b8"}}>Memuat data...</div>
        ) : sales.length === 0 ? (
          <div className="kp-card" style={{padding:40, textAlign:"center", color:"#94a3b8"}}>
            <div style={{fontSize:14, fontWeight:600, marginBottom:4}}>Belum ada transaksi</div>
            <div style={{fontSize:12}}>Transaksi kasir akan muncul di sini</div>
          </div>
        ) : (
          <div className="kp-card" style={{overflow:"auto"}}>
            <table className="kp-table">
              <thead>
                <tr>
                  <th>No. Nota</th>
                  <th>Waktu</th>
                  <th>Pelanggan</th>
                  <th>Item</th>
                  <th>Metode</th>
                  <th style={{textAlign:"right"}}>Total</th>
                  <th style={{textAlign:"right"}}>Laba</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{fontFamily:"monospace", fontSize:11, fontWeight:700}}>{sale.receiptNo}</td>
                    <td style={{fontSize:11, color:"#64748b"}}>
                      {new Date(sale.createdAt).toLocaleString("id-ID", {
                        day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"
                      })}
                    </td>
                    <td style={{fontSize:12}}>{sale.customerName || "Umum"}</td>
                    <td style={{fontSize:12}}>{sale.items.length} item</td>
                    <td>
                      <span className="kp-badge" style={{
                        background: `${methodColors[sale.paymentMethod] || "#94a3b8"}20`,
                        color: methodColors[sale.paymentMethod] || "#94a3b8"
                      }}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td style={{textAlign:"right", fontWeight:800, color:"#16a34a"}}>{formatRupiah(sale.totalAmount)}</td>
                    <td style={{textAlign:"right", fontWeight:700, color: sale.profit > 0 ? "#16a34a" : "#dc2626"}}>
                      {formatRupiah(sale.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
