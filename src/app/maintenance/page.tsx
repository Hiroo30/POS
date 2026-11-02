"use client";

import { useState } from "react";

export default function MaintenancePage() {
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleDownloadBackup = () => {
    window.open("/api/maintenance?format=json", "_blank");
    setStatusMessage({
      type: "success",
      text: "File cadangan (backup JSON) sedang diunduh ke perangkat Anda.",
    });
  };

  const handleDownloadCSV = () => {
    window.open("/api/maintenance?format=csv", "_blank");
    setStatusMessage({
      type: "success",
      text: "Laporan data stok format Excel/CSV sedang diunduh.",
    });
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "PERINGATAN: Memulihkan backup akan menggantikan data barang & kasbon saat ini dengan data dari file backup. Lanjutkan?"
    );
    if (!confirmRestore) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", data: parsed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Format file tidak valid");
      }

      setStatusMessage({
        type: "success",
        text: "Data berhasil dipulihkan dari file cadangan!",
      });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({
        type: "error",
        text: error.message || "Gagal memproses file backup.",
      });
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleResetData = async () => {
    const confirmReset = window.confirm(
      "Apakah Anda yakin ingin mereset seluruh data kembali ke contoh awal Kasir Pintar Sembako?"
    );
    if (!confirmReset) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mereset data");
      }

      setStatusMessage({
        type: "success",
        text: "Data berhasil dikembalikan ke contoh awal sembako & kasbon!",
      });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({
        type: "error",
        text: error.message || "Gagal mereset data",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="kp-topbar">
        <span className="kp-topbar-title">Pengaturan & Backup Data</span>
      </div>

      <div className="kp-content">
        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background:
                statusMessage.type === "success"
                  ? "#dcfce7"
                  : statusMessage.type === "error"
                  ? "#fee2e2"
                  : "#dbeafe",
              color:
                statusMessage.type === "success"
                  ? "#15803d"
                  : statusMessage.type === "error"
                  ? "#b91c1c"
                  : "#1d4ed8",
              border: `1px solid ${
                statusMessage.type === "success"
                  ? "#bbf7d0"
                  : statusMessage.type === "error"
                  ? "#fecaca"
                  : "#bfdbfe"
              }`,
            }}
          >
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
          {/* Card: Download Backup JSON */}
          <div className="kp-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="kp-card-icon green">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Backup Seluruh Data (JSON)</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Unduh salinan arsip transaksi, stok & kasbon</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              Simpan file cadangan ini di komputer atau HP Anda agar data aman.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="kp-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Unduh Backup JSON
            </button>
          </div>

          {/* Card: Download CSV */}
          <div className="kp-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="kp-card-icon yellow">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Ekspor Laporan Stok (Excel / CSV)</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Daftar stok barang, modal & harga jual</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              Format tabel CSV yang dapat langsung dibuka di Microsoft Excel atau Google Sheets.
            </p>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="kp-btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Unduh Tabel Excel/CSV
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          {/* Card: Restore JSON */}
          <div className="kp-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="kp-card-icon blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Pulihkan dari Cadangan</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Upload file JSON backup sebelumnya</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              Gunakan fitur ini saat berganti perangkat atau ingin memulihkan riwayat data lama.
            </p>
            <label className="kp-btn-secondary" style={{ width: "100%", justifyContent: "center", cursor: "pointer", display: "flex" }}>
              <span>{isProcessing ? "Memproses..." : "Pilih File Backup JSON"}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                disabled={isProcessing}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Card: Reset */}
          <div className="kp-card" style={{ padding: 16, borderColor: "#fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="kp-card-icon red">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>Reset ke Data Bawaan</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Kembalikan data toko ke setelan awal</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              Mengembalikan 15 produk sembako standar dan mengosongkan riwayat transaksi uji coba.
            </p>
            <button
              type="button"
              onClick={handleResetData}
              disabled={isProcessing}
              className="kp-btn-danger"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Reset ke Data Awal
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
