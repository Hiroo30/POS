"use client";

import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  onSave: (newAmount: number) => void;
  deviceLabel: string;
}

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

const PRESET_AMOUNTS = [300000, 500000, 1000000, 1450000, 2000000];
const QUICK_ADDS = [50000, 100000, 200000, 500000];

export default function CashDrawerModal({
  isOpen,
  onClose,
  currentAmount,
  onSave,
  deviceLabel,
}: Props) {
  const [amount, setAmount] = useState<number>(currentAmount);
  const [inputValue, setInputValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setAmount(currentAmount);
      setInputValue(currentAmount > 0 ? currentAmount.toLocaleString("id-ID") : "");
      setNotes("");
    }
  }, [isOpen, currentAmount]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const val = raw ? parseInt(raw, 10) : 0;
    setAmount(val);
    setInputValue(val > 0 ? val.toLocaleString("id-ID") : "");
  };

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setInputValue(val.toLocaleString("id-ID"));
  };

  const handleQuickAdd = (addVal: number) => {
    const next = amount + addVal;
    setAmount(next);
    setInputValue(next.toLocaleString("id-ID"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(amount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1b2e1f] to-emerald-800 p-5 text-white flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/50 flex items-center justify-center text-white border border-emerald-400/30">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Atur Uang Laci Kasir</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Modal awal & saldo kas fisik terminal {deviceLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Main Nominal Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Saldo Uang Laci (Rupiah)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 font-bold text-sm">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="0"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-emerald-600/40 focus:border-emerald-600 rounded-xl text-xl font-bold text-slate-900 outline-none transition-all"
              />
              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(0);
                    setInputValue("");
                  }}
                  className="absolute right-3 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded bg-slate-200/60"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Terbaca: <strong className="text-emerald-700">{formatRupiah(amount)}</strong>
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Pilihan Cepat Modal Awal:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectPreset(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    amount === val
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {formatRupiah(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Tambah Cepat Saldo Laci:
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_ADDS.map((addVal) => (
                <button
                  key={addVal}
                  type="button"
                  onClick={() => handleQuickAdd(addVal)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  +{addVal.toLocaleString("id-ID")}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Catatan / Keterangan (Opsional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Modal kembalian Shift 1 / Tambah uang receh"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-600"
            />
          </div>

          {/* Device Isolation Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0 mt-0.5">
              devices
            </span>
            <span>
              Saldo laci ini khusus tersimpan pada <strong>{deviceLabel}</strong> dan tidak akan
              mengubah saldo laci di perangkat lain.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Simpan Uang Laci
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
