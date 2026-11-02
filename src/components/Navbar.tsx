"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDeviceId, getDeviceLabel } from "@/lib/device";
import {
  getStoreSettings,
  saveStoreSettings,
  getCashierInitials,
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from "@/lib/storeSettings";

const navItems = [
  {
    label: "Kasir POS",
    shortLabel: "Kasir",
    href: "/",
    iconName: "point_of_sale",
  },
  {
    label: "Histori Struk",
    shortLabel: "Histori",
    href: "/riwayat",
    iconName: "receipt_long",
  },
  {
    label: "Katalog & Stok",
    shortLabel: "Katalog",
    href: "/produk",
    iconName: "inventory_2",
  },
  {
    label: "Buku Kasbon",
    shortLabel: "Kasbon",
    href: "/kasbon",
    iconName: "menu_book",
  },
  {
    label: "Laporan Omzet",
    shortLabel: "Laporan",
    href: "/laporan",
    iconName: "query_stats",
  },
  {
    label: "Pengaturan & Backup",
    shortLabel: "Setelan",
    href: "/maintenance",
    iconName: "tune",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [deviceLabel, setDeviceLabel] = useState("Memuat Terminal...");
  const [deviceId, setDeviceId] = useState("");
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  useEffect(() => {
    setDeviceLabel(getDeviceLabel());
    setDeviceId(getDeviceId());

    const updateSettings = () => {
      setStoreSettings(getStoreSettings());
    };
    updateSettings();
    window.addEventListener("pos-settings-updated", updateSettings);
    window.addEventListener("storage", updateSettings);
    return () => {
      window.removeEventListener("pos-settings-updated", updateSettings);
      window.removeEventListener("storage", updateSettings);
    };
  }, []);

  const handleSaveCashier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    saveStoreSettings({
      cashierName: editName.trim(),
      cashierRole: editRole.trim() || "Kasir Toko",
    });
    setShowEditModal(false);
  };

  const currentPage = navItems.find((item) => item.href === pathname)?.shortLabel || "POS";

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (Visible on screens >= 768px) ─── */}
      <aside className="app-sidebar fixed left-0 top-0 h-full w-64 bg-[#1b2e1f] text-white flex flex-col justify-between shadow-xl z-50 border-r border-emerald-950/40 select-none">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-md shrink-0">
                <span className="material-symbols-outlined text-[24px]">storefront</span>
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-base text-white tracking-wide truncate">
                  Toko DEWI
                </span>
                <span className="block text-xs text-emerald-300 font-medium truncate">
                  Warung
                </span>
              </div>
            </div>

            {/* Shift & Device Chip */}
            <div className="mt-3.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-200 font-semibold">Shift 1 • Buka</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider">ONLINE</span>
            </div>

            {/* Active Device Isolation Indicator */}
            <div className="mt-2 px-2.5 py-1 rounded-lg bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-between text-[11px] text-emerald-200">
              <span className="truncate">{deviceLabel}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold">
              Menu Kasir & Toko
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold shadow-md"
                        : "text-slate-300 hover:bg-white/10 hover:text-white font-medium"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.iconName}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Install App Shortcut */}
            <div className="px-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event("trigger-pwa-install"));
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 hover:text-white text-xs font-bold transition-all border border-emerald-500/20 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">install_mobile</span>
                <span>Pasang Aplikasi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Cashier Profile (Clickable to Edit) */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={() => {
              setEditName(storeSettings.cashierName);
              setEditRole(storeSettings.cashierRole);
              setShowEditModal(true);
            }}
            className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-between text-left transition-all group cursor-pointer border border-transparent hover:border-emerald-500/30 active:scale-98"
            title="Klik untuk ubah nama atau profil kasir"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                {getCashierInitials(storeSettings.cashierName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="block text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                    {storeSettings.cashierName}
                  </span>
                  <span className="material-symbols-outlined text-[13px] text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity">
                    edit
                  </span>
                </div>
                <span className="block text-[10px] text-slate-400 truncate">
                  {storeSettings.cashierRole}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-900/60 shrink-0">
              {storeSettings.storeName}
            </span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE TOP APP HEADER (Visible on screens < 768px) ─── */}
      <header className="app-mobile-header fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-40 flex items-center justify-between px-3.5 select-none shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                Online · {storeSettings.storeName}
              </span>
            </div>
            <h1 className="text-xs font-bold text-slate-900 truncate -mt-0.5">
              {currentPage}
            </h1>
          </div>
        </div>

        {/* Mobile Device & Cashier Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditName(storeSettings.cashierName);
              setEditRole(storeSettings.cashierRole);
              setShowEditModal(true);
            }}
            className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
            title="Klik untuk ubah nama kasir"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="truncate max-w-[80px]">{storeSettings.cashierName}</span>
            <span className="material-symbols-outlined text-[12px] text-emerald-600">edit</span>
          </button>
          <span
            className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold truncate max-w-[105px]"
            title={`Device ID: ${deviceId}`}
          >
            {deviceLabel.includes("HP") ? "📱 HP" : "💻 Laptop"}
          </span>
        </div>
      </header>

      {/* ─── MOBILE BOTTOM TAB BAR (Visible on screens < 768px) ─── */}
      <nav className="app-mobile-nav fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 flex items-center justify-around px-1 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.06)] select-none">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
                isActive ? "text-emerald-700 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full flex items-center justify-center transition-all ${
                  isActive ? "bg-emerald-100 text-emerald-800" : ""
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.iconName}
                </span>
              </div>
              <span className="text-[10px] mt-0.5">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      {/* ─── MODAL EDIT KASIR ─── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {getCashierInitials(editName || storeSettings.cashierName)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ubah Profil Kasir</h3>
                  <p className="text-[11px] text-slate-500">Dicetak di struk & laporan transaksi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCashier} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama Petugas Kasir
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Ibu Dewi / Eksa / Kasir 1"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              {/* Quick Preset Pills */}
              <div>
                <span className="block text-[11px] text-slate-500 mb-1.5 font-medium">Pilihan Cepat:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Ibu Dewi", "Eksa", "Kasir 1", "Owner"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditName(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        editName === preset
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Peran / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Contoh: Kasir Utama Toko / Shift Pagi"
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Simpan Kasir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
