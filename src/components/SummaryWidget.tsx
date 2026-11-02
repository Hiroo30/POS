"use client";

import { StoreSummary } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";
import { Package, AlertCircle, TrendingUp, DollarSign } from "lucide-react";

interface SummaryWidgetProps {
  summary: StoreSummary | null;
  onFilterLowStock: () => void;
  isFilterActive: boolean;
}

export default function SummaryWidget({
  summary,
  onFilterLowStock,
  isFilterActive,
}: SummaryWidgetProps) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Jenis Barang */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <Package className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Total Jenis Barang
          </p>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {summary.totalItems}{" "}
            <span className="text-sm font-medium text-slate-500">Macam</span>
          </p>
        </div>
      </div>

      {/* Perlu Kulakan (Bisa diklik) */}
      <button
        onClick={onFilterLowStock}
        className={`text-left rounded-2xl p-4 sm:p-5 border-2 transition transform active:scale-95 shadow-sm flex items-center gap-3 sm:gap-4 ${
          isFilterActive
            ? "bg-amber-100 border-amber-500 ring-2 ring-amber-400"
            : summary.lowStockCount > 0
            ? "bg-amber-50 border-amber-300 hover:bg-amber-100"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            Perlu Kulakan {isFilterActive && "✓ (Aktif)"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-amber-950">
            {summary.lowStockCount + summary.outOfStockCount}{" "}
            <span className="text-sm font-bold text-amber-700">Barang</span>
          </p>
        </div>
      </button>

      {/* Total Nilai Modal Toko */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <DollarSign className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Total Modal Barang
          </p>
          <p className="text-lg sm:text-xl font-black text-emerald-700">
            {formatRupiah(summary.totalAssetValue)}
          </p>
        </div>
      </div>

      {/* Potensi Penjualan */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
          <TrendingUp className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Estimasi Nilai Jual
          </p>
          <p className="text-lg sm:text-xl font-black text-purple-700">
            {formatRupiah(summary.totalPotentialRevenue)}
          </p>
        </div>
      </div>
    </div>
  );
}
