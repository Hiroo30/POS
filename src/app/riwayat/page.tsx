"use client";

import { useState, useEffect } from "react";
import { Transaction, TransactionType } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { History, ArrowDownCircle, ArrowUpCircle, RefreshCw, SlidersHorizontal } from "lucide-react";
import { deviceFetch } from "@/lib/device";

export default function RiwayatPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await deviceFetch("/api/transactions?limit=200");
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat riwayat", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filtered = transactions.filter((t) => {
    if (filterType === "ALL") return true;
    return t.type === filterType;
  });

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-20">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <History className="w-8 h-8 text-emerald-700" />
              <span>Riwayat Keluar Masuk Barang</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Catatan mutasi stok barang masuk dari agen dan barang keluar
            </p>
          </div>

          <button
            onClick={loadTransactions}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border-2 border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-700 shadow-sm transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition ${
              filterType === "ALL"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua Mutasi ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType("IN")}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition flex items-center gap-1.5 ${
              filterType === "IN"
                ? "bg-emerald-700 text-white border-emerald-800"
                : "bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50"
            }`}
          >
            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
            <span>Barang Masuk / Kulakan</span>
          </button>
          <button
            onClick={() => setFilterType("OUT")}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition flex items-center gap-1.5 ${
              filterType === "OUT"
                ? "bg-rose-700 text-white border-rose-800"
                : "bg-white text-rose-800 border-slate-200 hover:bg-rose-50"
            }`}
          >
            <ArrowUpCircle className="w-4 h-4 text-rose-500" />
            <span>Barang Keluar / Terjual</span>
          </button>
          <button
            onClick={() => setFilterType("ADJUST")}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition flex items-center gap-1.5 ${
              filterType === "ADJUST"
                ? "bg-blue-700 text-white border-blue-800"
                : "bg-white text-blue-800 border-slate-200 hover:bg-blue-50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <span>Koreksi Sisa Fisik</span>
          </button>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <div className="inline-block w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="font-bold text-slate-500">Memuat catatan mutasi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-slate-200">
            <span className="text-5xl block mb-3">📝</span>
            <p className="text-xl font-black text-slate-800 mb-1">Belum Ada Riwayat Transaksi</p>
            <p className="text-slate-500">
              Transaksi akan otomatis tercatat setiap kali ada penambahan atau pengurangan stok di layar utama.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx) => {
              const isIN = tx.type === "IN";
              const isOUT = tx.type === "OUT";

              return (
                <div
                  key={tx.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border-2 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isIN
                      ? "border-emerald-200 hover:border-emerald-400"
                      : isOUT
                      ? "border-rose-200 hover:border-rose-400"
                      : "border-blue-200 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isIN
                          ? "bg-emerald-100 text-emerald-800"
                          : isOUT
                          ? "bg-rose-100 text-rose-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isIN ? (
                        <ArrowDownCircle className="w-7 h-7" />
                      ) : isOUT ? (
                        <ArrowUpCircle className="w-7 h-7" />
                      ) : (
                        <SlidersHorizontal className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isIN
                              ? "bg-emerald-100 text-emerald-800"
                              : isOUT
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isIN ? "STOK MASUK" : isOUT ? "STOK KELUAR" : "KOREKSI"}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {formatDateTime(tx.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                        {tx.productName}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                        Keterangan: <span className="font-bold text-slate-800">{tx.note}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p
                        className={`text-xl font-black ${
                          isIN ? "text-emerald-700" : isOUT ? "text-rose-700" : "text-blue-700"
                        }`}
                      >
                        {isIN ? "+" : isOUT ? "-" : "="} {tx.quantityInput}{" "}
                        {tx.unitUsed === "PACK" ? "Dus/Kemasan" : "Satuan Ecer"}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Stok: {tx.stockBefore} → <strong>{tx.stockAfter}</strong>
                      </p>
                    </div>

                    {tx.totalPrice > 0 && (
                      <p className="text-xs font-bold text-slate-700 mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        Total: {formatRupiah(tx.totalPrice)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
