"use client";

import { useState, useEffect } from "react";
import type { KasbonRecord } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";

export default function KasbonPage() {
  const [records, setRecords] = useState<KasbonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "BELUM_LUNAS" | "LUNAS">("ALL");
  const [nowMs, setNowMs] = useState(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/kasbon");
      const data = await res.json();
      if (data.success) setRecords(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setNowMs(Date.now());
    loadData();
  }, []);

  const filtered = records.filter((r) => {
    if (filter === "BELUM_LUNAS" && r.status !== "BELUM_LUNAS") return false;
    if (filter === "LUNAS" && r.status !== "LUNAS") return false;
    if (search && !r.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPiutang = records
    .filter((r) => r.status === "BELUM_LUNAS")
    .reduce((s, r) => s + (r.remainingAmount ?? r.amount), 0);
  const totalActive = records.filter((r) => r.status === "BELUM_LUNAS").length;

  const handleMarkPaid = async (r: KasbonRecord) => {
    const payAmt = r.remainingAmount ?? r.amount;
    const confirm = window.confirm(`Lunasi kasbon ${r.customerName} sebesar ${formatRupiah(payAmt)}?`);
    if (!confirm) return;

    try {
      const res = await fetch("/api/kasbon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, amount: payAmt }),
      });
      if (res.ok) loadData();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="kp-topbar">
        <span className="kp-topbar-title">Buku Kasbon</span>
        <button className="kp-btn-secondary" onClick={loadData} style={{ fontSize: 11, padding: "5px 10px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="kp-content">
        {/* Summary */}
        <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
          <div className="kp-card">
            <div className="kp-card-header">
              <span className="kp-card-title">Total Piutang Aktif</span>
            </div>
            <div className="kp-card-body">
              <div className="kp-card-icon red">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div className="kp-card-value">
                <div className="kp-card-number red" style={{ fontSize: 16 }}>
                  {formatRupiah(totalPiutang)}
                </div>
                <div className="kp-card-sublabel">belum terbayar</div>
              </div>
            </div>
          </div>
          <div className="kp-card">
            <div className="kp-card-header">
              <span className="kp-card-title">Pelanggan Kasbon</span>
            </div>
            <div className="kp-card-body">
              <div className="kp-card-icon yellow">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="kp-card-value">
                <div className="kp-card-number yellow">{totalActive}</div>
                <div className="kp-card-sublabel">pelanggan aktif</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter + Search */}
        <div className="kp-card" style={{ padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[
              ["ALL", "Semua"],
              ["BELUM_LUNAS", "Belum Lunas"],
              ["LUNAS", "Lunas"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key as "ALL" | "BELUM_LUNAS" | "LUNAS")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: filter === key ? "#16a34a" : "#f8fafc",
                  color: filter === key ? "#fff" : "#64748b",
                  border: filter === key ? "none" : "1px solid #e2e8f0",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="kp-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Cari nama pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Memuat data kasbon...</div>
        ) : filtered.length === 0 ? (
          <div className="kp-card" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Tidak ada data kasbon</div>
          </div>
        ) : (
          <div className="kp-card" style={{ overflow: "auto" }}>
            <table className="kp-table">
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Rincian</th>
                  <th>Tanggal</th>
                  <th>Jatuh Tempo</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Sisa</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 700 }}>{r.customerName}</span>
                      {r.phone && <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.phone}</div>}
                    </td>
                    <td style={{ fontSize: 11, color: "#64748b", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.itemsSummary}
                    </td>
                    <td style={{ fontSize: 11 }}>{new Date(r.createdAt).toLocaleDateString("id-ID")}</td>
                    <td
                      style={{
                        fontSize: 11,
                        color:
                          r.dueDate &&
                          nowMs > 0 &&
                          new Date(r.dueDate).getTime() < nowMs &&
                          r.status === "BELUM_LUNAS"
                            ? "#dc2626"
                            : "#64748b",
                      }}
                    >
                      {r.dueDate ? new Date(r.dueDate).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatRupiah(r.amount)}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: r.status === "BELUM_LUNAS" ? "#dc2626" : "#16a34a" }}>
                      {formatRupiah(r.remainingAmount ?? r.amount)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`kp-badge ${r.status === "LUNAS" ? "green" : "red"}`}>
                        {r.status === "LUNAS" ? "Lunas" : "Belum Lunas"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.status === "BELUM_LUNAS" && (
                        <button
                          className="kp-btn-primary"
                          style={{ fontSize: 10, padding: "4px 10px" }}
                          onClick={() => handleMarkPaid(r)}
                        >
                          Tandai Lunas
                        </button>
                      )}
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
