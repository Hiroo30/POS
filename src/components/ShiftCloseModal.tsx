"use client";

import { useState, useEffect, useMemo } from "react";
import type { SaleTransaction, StoreExpense } from "@/lib/types";
import { deviceFetch } from "@/lib/device";
import { getStoreSettings } from "@/lib/storeSettings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cashDrawerAmount: number;
  onUpdateDrawer: (newAmount: number) => void;
  deviceLabel: string;
}

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function ShiftCloseModal({
  isOpen,
  onClose,
  cashDrawerAmount,
  onUpdateDrawer,
  deviceLabel,
}: Props) {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [expenses, setExpenses] = useState<StoreExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actualCashInput, setActualCashInput] = useState("");
  const [cashierNote, setCashierNote] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTodayKey(new Date().toISOString().slice(0, 10));
    setActualCashInput(String(cashDrawerAmount));
    setSavedNotice(false);

    const fetchShiftData = async () => {
      setIsLoading(true);
      try {
        const [salesRes, expRes] = await Promise.all([
          deviceFetch("/api/sales?limit=250"),
          deviceFetch("/api/expenses"),
        ]);
        const salesJson = await salesRes.json();
        const expJson = await expRes.json();
        if (salesJson.success && Array.isArray(salesJson.data)) {
          setSales(salesJson.data);
        }
        if (expJson.success && Array.isArray(expJson.data)) {
          setExpenses(expJson.data);
        }
      } catch (e) {
        console.error("Gagal memuat data rekap shift:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShiftData();
  }, [isOpen, cashDrawerAmount]);

  const metrics = useMemo(() => {
    if (!todayKey) {
      return {
        orderCount: 0,
        tunai: 0,
        qris: 0,
        transfer: 0,
        kasbon: 0,
        totalRevenue: 0,
        totalGrossProfit: 0,
        totalDiscount: 0,
        drawerExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
      };
    }
    const todaySales = sales.filter((s) => s.createdAt && s.createdAt.slice(0, 10) === todayKey);
    const todayExpenses = expenses.filter((e) => e.createdAt && e.createdAt.slice(0, 10) === todayKey);

    let tunai = 0;
    let qris = 0;
    let transfer = 0;
    let kasbon = 0;
    let totalGrossProfit = 0;
    let totalDiscount = 0;

    for (const s of todaySales) {
      const amt = s.totalAmount || 0;
      totalGrossProfit += s.profit || 0;
      totalDiscount += s.discountAmount || 0;
      if (s.paymentMethod === "TUNAI") tunai += amt;
      else if (s.paymentMethod === "QRIS") qris += amt;
      else if (s.paymentMethod === "TRANSFER") transfer += amt;
      else if (s.paymentMethod === "KASBON") kasbon += amt;
    }

    let drawerExpenses = 0;
    let totalExpenses = 0;
    for (const exp of todayExpenses) {
      totalExpenses += exp.amount || 0;
      if (exp.paidFromDrawer) {
        drawerExpenses += exp.amount || 0;
      }
    }

    const totalRevenue = tunai + qris + transfer + kasbon;
    const netProfit = totalGrossProfit - totalExpenses;

    return {
      orderCount: todaySales.length,
      tunai,
      qris,
      transfer,
      kasbon,
      totalRevenue,
      totalGrossProfit,
      totalDiscount,
      drawerExpenses,
      totalExpenses,
      netProfit,
    };
  }, [sales, expenses, todayKey]);

  if (!isOpen) return null;

  const actualCash = parseInt(actualCashInput.replace(/\D/g, ""), 10) || 0;
  const diff = actualCash - cashDrawerAmount;

  const handleSyncDrawer = () => {
    onUpdateDrawer(actualCash);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handlePrintReport = () => {
    const settings = getStoreSettings();
    const nowStr = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const diffLabel =
      diff === 0
        ? "PAS / SEIMBANG (Rp 0)"
        : diff > 0
        ? `LEBIH +${formatRupiah(diff)}`
        : `KURANG -${formatRupiah(Math.abs(diff))}`;

    const win = window.open("", "_blank", "width=400,height=650");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Rekap Tutup Shift - ${settings.storeName}</title>
          <style>
            body { font-family: monospace; width: 280px; margin: 0 auto; padding: 12px; font-size: 12px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="center bold" style="font-size:14px">${settings.storeName}</div>
          <div class="center">LAPORAN TUTUP SHIFT KASIR</div>
          <div class="center" style="font-size:10px">${nowStr}</div>
          <div class="divider"></div>
          <div class="row"><span>Terminal:</span><span>${deviceLabel || "Kasir POS"}</span></div>
          <div class="row"><span>Kasir:</span><span>${settings.cashierName || "Kasir Dewi"}</span></div>
          <div class="row"><span>Total Transaksi:</span><span class="bold">${metrics.orderCount} Nota</span></div>
          <div class="divider"></div>
          <div class="bold">RINCIAN METODE PEMBAYARAN</div>
          <div class="row"><span>- Penjualan Tunai:</span><span>${formatRupiah(metrics.tunai)}</span></div>
          <div class="row"><span>- Penjualan QRIS:</span><span>${formatRupiah(metrics.qris)}</span></div>
          <div class="row"><span>- Transfer Bank:</span><span>${formatRupiah(metrics.transfer)}</span></div>
          <div class="row"><span>- Piutang Kasbon:</span><span>${formatRupiah(metrics.kasbon)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>TOTAL OMZET:</span><span>${formatRupiah(metrics.totalRevenue)}</span></div>
          <div class="row"><span>Keluar Kas Laci:</span><span>-${formatRupiah(metrics.drawerExpenses)}</span></div>
          <div class="row"><span>Est. Laba Bersih:</span><span>${formatRupiah(metrics.netProfit)}</span></div>
          <div class="divider"></div>
          <div class="bold">REKONSILIASI UANG LACI</div>
          <div class="row"><span>Saldo Sistem:</span><span>${formatRupiah(cashDrawerAmount)}</span></div>
          <div class="row"><span>Fisik Aktual:</span><span class="bold">${formatRupiah(actualCash)}</span></div>
          <div class="row bold"><span>Selisih Kas:</span><span>${diffLabel}</span></div>
          ${cashierNote ? `<div class="divider"></div><div>Catatan: ${cashierNote}</div>` : ""}
          <div class="divider"></div>
          <div class="center" style="font-size:10px">Dicetak otomatis dari POS ${settings.storeName}</div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSendWA = () => {
    const settings = getStoreSettings();
    const nowStr = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const diffLabel =
      diff === 0
        ? "✅ PAS / SEIMBANG (Rp 0)"
        : diff > 0
        ? `🟢 LEBIH +${formatRupiah(diff)}`
        : `🔴 KURANG -${formatRupiah(Math.abs(diff))}`;

    const lines = [
      `*LAPORAN TUTUP SHIFT KASIR*`,
      `*${settings.storeName}*`,
      `================================`,
      `Waktu    : ${nowStr}`,
      `Terminal : ${deviceLabel || "Kasir POS"}`,
      `Kasir    : ${settings.cashierName || "Kasir Dewi"}`,
      `Jml Nota : *${metrics.orderCount} Transaksi*`,
      `================================`,
      `*RINCIAN OMZET HARI INI:*`,
      `💵 Tunai    : ${formatRupiah(metrics.tunai)}`,
      `📱 QRIS     : ${formatRupiah(metrics.qris)}`,
      `🏦 Transfer : ${formatRupiah(metrics.transfer)}`,
      `📒 Kasbon   : ${formatRupiah(metrics.kasbon)}`,
      `--------------------------------`,
      `*TOTAL OMZET : ${formatRupiah(metrics.totalRevenue)}*`,
      `💸 Kas Keluar Laci : -${formatRupiah(metrics.drawerExpenses)}`,
      `📈 Est. Laba Bersih: ${formatRupiah(metrics.netProfit)}`,
      `================================`,
      `*CEK FISIK UANG LACI KASIR:*`,
      `• Saldo Sistem : ${formatRupiah(cashDrawerAmount)}`,
      `• Fisik Aktual : *${formatRupiah(actualCash)}*`,
      `• Status Selisih: *${diffLabel}*`,
      ...(cashierNote.trim() ? [`• Catatan Kasir: ${cashierNote.trim()}`] : []),
      `================================`,
    ];

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#131b2e] via-[#1b2e1f] to-emerald-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 border border-emerald-400/30">
              <span className="material-symbols-outlined text-[24px]">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Tutup Shift & Setoran Kasir</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold">
                  {deviceLabel || "Kasir POS"}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Rekap transaksi harian, hitung uang fisik laci & kirim laporan ke Owner
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              Menghitung rekap transaksi shift hari ini...
            </div>
          ) : (
            <>
              {/* Summary Top Banner */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Transaksi</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {metrics.orderCount} Nota
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Total Omzet</div>
                  <div className="text-base font-black text-emerald-800 mt-0.5">
                    {formatRupiah(metrics.totalRevenue)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80">
                  <div className="text-[10px] font-bold uppercase text-blue-700">Laba Bersih</div>
                  <div className="text-base font-black text-blue-800 mt-0.5">
                    {formatRupiah(metrics.netProfit)}
                  </div>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Rincian Penerimaan per Metode Bayar (Hari Ini)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <span className="font-semibold text-slate-600">💵 Tunai (Cash)</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(metrics.tunai)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <span className="font-semibold text-slate-600">📱 QRIS Statis</span>
                    <span className="font-bold text-purple-700">{formatRupiah(metrics.qris)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <span className="font-semibold text-slate-600">🏦 Transfer</span>
                    <span className="font-bold text-blue-700">{formatRupiah(metrics.transfer)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <span className="font-semibold text-slate-600">📒 Piutang Bon</span>
                    <span className="font-bold text-rose-600">{formatRupiah(metrics.kasbon)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-xs">
                  <span className="text-slate-500 font-semibold">
                    💸 Pengeluaran Kas Laci Hari Ini:
                  </span>
                  <span className="font-bold text-orange-600">
                    -{formatRupiah(metrics.drawerExpenses)}
                  </span>
                </div>
              </div>

              {/* Cash Drawer Reconciliation */}
              <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">
                    Saldo Uang Laci Menurut Sistem:
                  </span>
                  <span className="text-base font-black text-emerald-800">
                    {formatRupiah(cashDrawerAmount)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hitung Uang Tunai Fisik Aktual di Laci Sekarang (Rp):
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={actualCash > 0 ? actualCash.toLocaleString("id-ID") : ""}
                        onChange={(e) => setActualCashInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-2 bg-white border-2 border-emerald-600/40 focus:border-emerald-600 rounded-xl text-sm font-black text-slate-900 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncDrawer}
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shrink-0 transition-all"
                      title="Simpan angka fisik ini sebagai saldo uang laci saat ini"
                    >
                      Sesuaikan Laci
                    </button>
                  </div>
                  {savedNotice && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">
                      ✓ Saldo uang laci berhasil disesuaikan dengan uang fisik aktual!
                    </p>
                  )}
                </div>

                {/* Difference Indicator */}
                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-bold ${
                    diff === 0
                      ? "bg-emerald-100/80 border-emerald-300 text-emerald-900"
                      : diff > 0
                      ? "bg-blue-100/80 border-blue-300 text-blue-900"
                      : "bg-rose-100/80 border-rose-300 text-rose-900"
                  }`}
                >
                  <span>Status Rekonsiliasi Kas:</span>
                  <span>
                    {diff === 0
                      ? "✓ PAS / SEIMBANG (Selisih Rp 0)"
                      : diff > 0
                      ? `LEBIH +${formatRupiah(diff)}`
                      : `KURANG -${formatRupiah(Math.abs(diff))}`}
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Catatan serah terima shift (opsional)..."
                    value={cashierNote}
                    onChange={(e) => setCashierNote(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
          >
            Tutup
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Cetak Rekap</span>
            </button>
            <button
              type="button"
              onClick={handleSendWA}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>Kirim WA ke Owner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
