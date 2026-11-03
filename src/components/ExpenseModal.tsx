"use client";

import { useState } from "react";
import type { ExpenseCategory } from "@/lib/types";
import { deviceFetch } from "@/lib/device";
import { playSuccessSound } from "@/lib/audio";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amountDeductedFromDrawer: number) => void;
  cashDrawerAmount?: number;
}

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: string; color: string; bg: string }[] = [
  { id: "kresek", label: "Plastik & Kresek", icon: "shopping_bag", color: "#0284c7", bg: "#e0f2fe" },
  { id: "konsumsi", label: "Konsumsi / Makan", icon: "restaurant", color: "#d97706", bg: "#fef3c7" },
  { id: "kebersihan", label: "Sampah & Ronda", icon: "delete_sweep", color: "#16a34a", bg: "#dcfce7" },
  { id: "transport", label: "Bensin & Parkir", icon: "local_gas_station", color: "#ea580c", bg: "#ffedd5" },
  { id: "operasional", label: "Listrik & Air", icon: "bolt", color: "#ca8a04", bg: "#fef9c3" },
  { id: "perawatan", label: "Alat & Servis", icon: "build", color: "#4f46e5", bg: "#e0e7ff" },
  { id: "lainnya", label: "Lain-lain", icon: "more_horiz", color: "#64748b", bg: "#f1f5f9" },
];

const PRESETS = [5000, 10000, 15000, 20000, 35000, 50000, 100000];

export default function ExpenseModal({ isOpen, onClose, onSuccess, cashDrawerAmount = 0 }: Props) {
  const [category, setCategory] = useState<ExpenseCategory>("kresek");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidFromDrawer, setPaidFromDrawer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleAddPreset = (val: number) => {
    setAmount((prev) => ((parseFloat(prev) || 0) + val).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setErrorMessage("Nominal pengeluaran harus lebih dari Rp 0!");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Keterangan pengeluaran wajib diisi!");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await deviceFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amount: numAmount,
          paidFromDrawer,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mencatat pengeluaran");
      }

      playSuccessSound();
      onSuccess(paidFromDrawer ? numAmount : 0);
      onClose();
      setDescription("");
      setAmount("");
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="kp-modal-overlay">
      <div className="kp-modal" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div className="kp-modal-header" style={{ background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#fed7aa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              ARUS KAS KELUAR
            </div>
            <div className="kp-modal-header-title">Catat Pengeluaran Toko</div>
            <div className="kp-modal-header-sub">Biaya operasional warung, kresek, listrik & sampah</div>
          </div>
          <button className="kp-modal-close" onClick={onClose} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="kp-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {errorMessage && (
              <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="kp-label" style={{ marginBottom: 6 }}>Pilih Kategori Biaya</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {EXPENSE_CATEGORIES.map((c) => {
                  const active = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      style={{
                        padding: "8px 6px",
                        borderRadius: 8,
                        border: `1.5px solid ${active ? c.color : "#e2e8f0"}`,
                        background: active ? c.bg : "#ffffff",
                        color: active ? c.color : "#475569",
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                      <span style={{ textAlign: "center", lineHeight: 1.2 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="kp-label">Nominal Pengeluaran (Rp) <span style={{ color: "#dc2626" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 800, color: "#64748b" }}>
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  placeholder="Contoh: 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="kp-input"
                  style={{ paddingLeft: 38, fontSize: 16, fontWeight: 800, color: "#ea580c" }}
                />
              </div>

              {/* Quick Preset chips */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleAddPreset(p)}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    +{(p / 1000).toLocaleString("id-ID")}rb
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="kp-label">Keterangan Pengeluaran <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="text"
                required
                placeholder="Contoh: Beli kresek hitam 2 pak, bensin kulakan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="kp-input"
              />
            </div>

            {/* Paid from cash drawer toggle */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                <input
                  type="checkbox"
                  checked={paidFromDrawer}
                  onChange={(e) => setPaidFromDrawer(e.target.checked)}
                />
                Potong langsung dari Kas Laci Toko
              </label>
              {paidFromDrawer && (
                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4, marginLeft: 24 }}>
                  Uang laci saat ini: <strong>Rp {cashDrawerAmount.toLocaleString("id-ID")}</strong> → Sisa setelah bayar:{" "}
                  <strong style={{ color: cashDrawerAmount - numAmount >= 0 ? "#16a34a" : "#dc2626" }}>
                    Rp {Math.max(0, cashDrawerAmount - numAmount).toLocaleString("id-ID")}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" className="kp-btn-secondary" onClick={onClose} style={{ justifyContent: "center" }}>
              Batal
            </button>
            <button
              type="submit"
              className="kp-btn-primary"
              disabled={isLoading}
              style={{ justifyContent: "center", background: "#ea580c" }}
            >
              {isLoading ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
