"use client";

import { useState, useEffect } from "react";
import type { KasbonRecord } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";
import { deviceFetch } from "@/lib/device";

export default function KasbonPage() {
  const [records, setRecords] = useState<KasbonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "BELUM_LUNAS" | "JATUH_TEMPO" | "LUNAS">("ALL");
  const [nowMs, setNowMs] = useState(0);

  // New Kasbon Form state
  const [newCustName, setNewCustName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newItemsSummary, setNewItemsSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await deviceFetch("/api/kasbon");
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
    const isOverdue = r.dueDate && new Date(r.dueDate).getTime() < nowMs && r.status === "BELUM_LUNAS";
    if (filter === "BELUM_LUNAS" && r.status !== "BELUM_LUNAS") return false;
    if (filter === "LUNAS" && r.status !== "LUNAS") return false;
    if (filter === "JATUH_TEMPO" && !isOverdue) return false;
    if (search && !r.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPiutang = records
    .filter((r) => r.status === "BELUM_LUNAS")
    .reduce((s, r) => s + (r.remainingAmount ?? r.amount), 0);
  const totalActive = records.filter((r) => r.status === "BELUM_LUNAS").length;
  const overdueCount = records.filter(
    (r) => r.status === "BELUM_LUNAS" && r.dueDate && new Date(r.dueDate).getTime() < nowMs
  ).length;
  const lunasCount = records.filter((r) => r.status === "LUNAS").length;

  const handleMarkPaid = async (r: KasbonRecord) => {
    const payAmt = r.remainingAmount ?? r.amount;
    const confirm = window.confirm(`Lunasi kasbon ${r.customerName} sebesar ${formatRupiah(payAmt)}?`);
    if (!confirm) return;

    try {
      const res = await deviceFetch("/api/kasbon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, amount: payAmt }),
      });
      if (res.ok) {
        showToast(`Kasbon ${r.customerName} berhasil dilunasi!`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAddKasbon = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(newAmount.replace(/\D/g, "")) || 0;
    if (!newCustName.trim() || amt <= 0) {
      alert("Nama pelanggan dan nominal kasbon wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await deviceFetch("/api/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCustName.trim(),
          phone: newPhone.trim(),
          amount: amt,
          dueDate: newDueDate || undefined,
          itemsSummary: newItemsSummary.trim() || "Bon belanja sembako",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Kasbon baru ${newCustName} tercatat!`);
        setNewCustName("");
        setNewPhone("");
        setNewAmount("");
        setNewDueDate("");
        setNewItemsSummary("");
        loadData();
      } else {
        alert(data.error || "Gagal mencatat kasbon");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWA = (r: KasbonRecord) => {
    const sisa = r.remainingAmount ?? r.amount;
    const text = `Halo ${r.customerName}, salam dari Toko DEWI 🙏\n\nKami menginfokan catatan bon belanja sembako Anda:\n- Total Tagihan: ${formatRupiah(sisa)}\n- Jatuh Tempo: ${r.dueDate || "Sesuai kesepakatan"}\n- Rincian: ${r.itemsSummary || "Belanja sembako"}\n\nPembayaran bisa tunai ke toko atau via QRIS. Terima kasih banyak ya!`;
    const cleanPhone = r.phone ? r.phone.replace(/\D/g, "").replace(/^0/, "62") : "";
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const setDueDateDays = (days: number) => {
    const target = new Date(Date.now() + days * 86400000);
    setNewDueDate(target.toISOString().slice(0, 10));
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 99,
          background: "#006c49", color: "#ffffff", fontWeight: 700,
          padding: "10px 18px", borderRadius: 10, fontSize: 12.5,
          boxShadow: "0 4px 16px rgba(0,108,73,0.35)",
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="desktop-only" style={{
        height: 60, background: "#ffffff", borderBottom: "1px solid #e2e8f0",
        padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,0.02)", zIndex: 30, position: "sticky", top: 0
      }}>
        <div style={{display: "flex", alignItems: "center", gap: 10}}>
          <h1 style={{fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0}}>
            Buku Kasbon & Piutang Pelanggan
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 700, background: "#e0f2fe", color: "#0369a1",
            padding: "2px 8px", borderRadius: 20
          }}>
            Toko DEWI
          </span>
        </div>
        <button
          onClick={loadData}
          style={{
            background: "#ffffff", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 700,
            color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 5
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div style={{padding: "16px 20px 100px", background: "#f4f6fb", minHeight: "calc(100vh - 60px)"}}>
        {/* 3 KPI Overview Cards (Stitch Design) */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12, marginBottom: 16
        }}>
          {/* Card 1: Total Piutang Aktif */}
          <div style={{
            background: "#ffffff", padding: "16px", borderRadius: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0"
          }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
              <div>
                <div style={{fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5}}>
                  Total Piutang Aktif
                </div>
                <div style={{fontSize: 22, fontWeight: 900, color: "#006c49", marginTop: 4}}>
                  {formatRupiah(totalPiutang)}
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: "#f0fdf4",
                color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
            </div>
            <div style={{marginTop: 10, fontSize: 11, color: "#64748b"}}>
              {totalActive} pelanggan dengan bon berjalan
            </div>
          </div>

          {/* Card 2: Jatuh Tempo Pekan Ini */}
          <div style={{
            background: "#ffffff", padding: "16px", borderRadius: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0"
          }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
              <div>
                <div style={{fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5}}>
                  Jatuh Tempo / Lewat
                </div>
                <div style={{fontSize: 22, fontWeight: 900, color: overdueCount > 0 ? "#dc2626" : "#0f172a", marginTop: 4}}>
                  {overdueCount} Orang
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: overdueCount > 0 ? "#fee2e2" : "#f1f5f9",
                color: overdueCount > 0 ? "#dc2626" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            </div>
            <div style={{marginTop: 10, fontSize: 11, color: overdueCount > 0 ? "#dc2626" : "#64748b", fontWeight: 600}}>
              {overdueCount > 0 ? "Perlu konfirmasi WhatsApp" : "Semua pembayaran tepat waktu"}
            </div>
          </div>

          {/* Card 3: Transaksi Lunas */}
          <div style={{
            background: "#ffffff", padding: "16px", borderRadius: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0"
          }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
              <div>
                <div style={{fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5}}>
                  Sudah Dilunasi
                </div>
                <div style={{fontSize: 22, fontWeight: 900, color: "#16a34a", marginTop: 4}}>
                  {lunasCount} Bon
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: "#dcfce7",
                color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <div style={{marginTop: 10, fontSize: 11, color: "#15803d", fontWeight: 600}}>
              Riwayat bon yang telah selesai
            </div>
          </div>
        </div>

        {/* Main 2-Column Split: Left (Ledger Cards & Filter) + Right (Fast Kasbon Recorder) */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start"}}>
          {/* Left Column: Ledger List & Filters */}
          <div style={{display: "flex", flexDirection: "column", gap: 12}}>
            {/* Filter Tabs + Search */}
            <div style={{background: "#ffffff", padding: "12px 16px", borderRadius: 14, border: "1px solid #e2e8f0"}}>
              <div style={{display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap"}}>
                {[
                  { key: "ALL", label: `Semua (${records.length})` },
                  { key: "BELUM_LUNAS", label: `Belum Lunas (${totalActive})` },
                  { key: "JATUH_TEMPO", label: `Jatuh Tempo (${overdueCount})` },
                  { key: "LUNAS", label: `Lunas (${lunasCount})` },
                ].map((t) => {
                  const active = filter === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setFilter(t.key as typeof filter)}
                      className="cursor-pointer active:scale-95 transition-all duration-200"
                      style={{
                        padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                        border: "none",
                        background: active ? (t.key === "JATUH_TEMPO" ? "#dc2626" : "#006c49") : "#f1f5f9",
                        color: active ? "#ffffff" : "#475569",
                        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div style={{
                position: "relative", width: "100%", display: "flex", alignItems: "center",
                background: "#f8fafc", borderRadius: 8, padding: "0 10px", border: "1px solid #e2e8f0"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Cari nama warga, nomor WA, atau catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%", background: "transparent", border: "none", outline: "none",
                    padding: "8px 10px", fontSize: 12, color: "#0f172a"
                  }}
                />
              </div>
            </div>

            {/* List of Debt Ledger Cards */}
            <div key={`${filter}_${search}`} className="ios-tab-content space-y-3">
            {isLoading ? (
              <div style={{textAlign: "center", padding: 60, color: "#94a3b8"}}>Memuat buku kasbon...</div>
            ) : filtered.length === 0 ? (
              <div style={{background: "#ffffff", padding: 40, borderRadius: 14, textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0"}}>
                <div style={{fontSize: 14, fontWeight: 700}}>Tidak ada data kasbon</div>
                <div style={{fontSize: 12, marginTop: 4}}>Tambahkan bon baru lewat formulir di samping</div>
              </div>
            ) : (
              filtered.map((r) => {
                const sisa = r.remainingAmount ?? r.amount;
                const isOverdue = r.dueDate && new Date(r.dueDate).getTime() < nowMs && r.status === "BELUM_LUNAS";
                const initials = r.customerName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0",
                      padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                      display: "flex", flexDirection: "column", gap: 10
                    }}
                  >
                    {/* Top Row: Avatar & Name + Remaining Debt */}
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                      <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: isOverdue ? "#fee2e2" : r.status === "LUNAS" ? "#dcfce7" : "#e0e7ff",
                          color: isOverdue ? "#dc2626" : r.status === "LUNAS" ? "#16a34a" : "#4338ca",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 900
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{fontSize: 14, fontWeight: 800, color: "#0f172a"}}>
                            {r.customerName}
                          </div>
                          <div style={{fontSize: 11, color: "#64748b", marginTop: 1}}>
                            {r.phone ? `WA: ${r.phone}` : "Tanpa kontak WA"}
                          </div>
                        </div>
                      </div>

                      <div style={{textAlign: "right"}}>
                        <div style={{fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase"}}>
                          {r.status === "LUNAS" ? "Status" : "Sisa Hutang"}
                        </div>
                        <div style={{
                          fontSize: 16, fontWeight: 900,
                          color: r.status === "LUNAS" ? "#16a34a" : isOverdue ? "#dc2626" : "#006c49"
                        }}>
                          {r.status === "LUNAS" ? "LUNAS" : formatRupiah(sisa)}
                        </div>
                      </div>
                    </div>

                    {/* Items Summary & Due Date */}
                    <div style={{
                      padding: "8px 12px", background: "#f8fafc", borderRadius: 8,
                      fontSize: 11.5, color: "#475569", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6
                    }}>
                      <span><strong>Barang:</strong> {r.itemsSummary || "Bon sembako"}</span>
                      {r.dueDate && (
                        <span style={{
                          color: isOverdue ? "#dc2626" : "#475569",
                          fontWeight: isOverdue ? 800 : 600
                        }}>
                          Jatuh Tempo: {r.dueDate} {isOverdue && "(Lewat!)"}
                        </span>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div style={{display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, borderTop: "1px dashed #e2e8f0", paddingTop: 10}}>
                      {r.status === "BELUM_LUNAS" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSendWA(r)}
                            style={{
                              background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                              borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 700,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                            </svg>
                            Kirim WA
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(r)}
                            style={{
                              background: "#006c49", color: "#ffffff", border: "none",
                              borderRadius: 8, padding: "6px 14px", fontSize: 11.5, fontWeight: 700,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                            }}
                          >
                            Tandai Lunas
                          </button>
                        </>
                      )}
                      {r.status === "LUNAS" && (
                        <span style={{fontSize: 11, color: "#16a34a", fontWeight: 700}}>
                          ✓ Sudah Dibayar Lunas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Right Column: Catat Kasbon Cepat (Direct Form - Stitch Design) */}
          <div style={{
            background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0",
            padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)", position: "sticky", top: 80
          }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14}}>
              <span style={{fontSize: 14, fontWeight: 800, color: "#0f172a"}}>
                Catat Kasbon Cepat
              </span>
              <span style={{fontSize: 10, fontWeight: 800, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 6}}>
                KASIR #01
              </span>
            </div>

            <form onSubmit={handleQuickAddKasbon} style={{display: "flex", flexDirection: "column", gap: 12}}>
              {/* Customer Name */}
              <div>
                <label style={{display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4}}>
                  Nama Pelanggan (Wajib)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bu Siti (Depan Masjid)"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: 12.5, outline: "none", color: "#0f172a"
                  }}
                />
              </div>

              {/* Phone WhatsApp */}
              <div>
                <label style={{display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4}}>
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="081234567890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: 12.5, outline: "none", color: "#0f172a"
                  }}
                />
              </div>

              {/* Nominal Kasbon + Quick Chips */}
              <div>
                <label style={{display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4}}>
                  Nominal Bon (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 75000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: 14, fontWeight: 800, color: "#006c49", outline: "none"
                  }}
                />
                {/* Quick amount chips */}
                <div style={{display: "flex", gap: 6, marginTop: 6}}>
                  {[25000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewAmount(String(amt))}
                      style={{
                        flex: 1, padding: "4px 0", borderRadius: 6, border: "1px solid #e2e8f0",
                        background: "#f8fafc", fontSize: 10, fontWeight: 700, cursor: "pointer", color: "#475569"
                      }}
                    >
                      +{amt/1000}rb
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date + Shortcuts */}
              <div>
                <label style={{display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4}}>
                  Janji Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: 12, outline: "none", color: "#0f172a"
                  }}
                />
                <div style={{display: "flex", gap: 6, marginTop: 6}}>
                  <button
                    type="button"
                    onClick={() => setDueDateDays(7)}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: 6, border: "1px solid #e2e8f0",
                      background: "#f8fafc", fontSize: 10, fontWeight: 700, cursor: "pointer", color: "#475569"
                    }}
                  >
                    1 Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDateDays(14)}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: 6, border: "1px solid #e2e8f0",
                      background: "#f8fafc", fontSize: 10, fontWeight: 700, cursor: "pointer", color: "#475569"
                    }}
                  >
                    2 Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDateDays(30)}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: 6, border: "1px solid #e2e8f0",
                      background: "#f8fafc", fontSize: 10, fontWeight: 700, cursor: "pointer", color: "#475569"
                    }}
                  >
                    Akhir Bulan
                  </button>
                </div>
              </div>

              {/* Items Summary */}
              <div>
                <label style={{display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4}}>
                  Rincian Barang Belanjaan
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Beras Ramos 5kg, Minyak 1L, Telur 1kg"
                  value={newItemsSummary}
                  onChange={(e) => setNewItemsSummary(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: 12, outline: "none", color: "#0f172a"
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff", fontSize: 13, fontWeight: 800, cursor: isSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.3)", marginTop: 6
                }}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Catatan Kasbon"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
