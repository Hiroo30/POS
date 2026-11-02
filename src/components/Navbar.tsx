"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDeviceId, getDeviceLabel } from "@/lib/device";

const navItems = [
  {
    label: "Kasir POS",
    shortLabel: "Kasir",
    href: "/",
    iconName: "point_of_sale",
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

  useEffect(() => {
    setDeviceLabel(getDeviceLabel());
    setDeviceId(getDeviceId());
  }, []);

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
                  Warung & Grosir Sembako
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

        {/* Bottom Cashier Profile */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
                KD
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">Kasir Dewi</span>
                <span className="block text-[10px] text-slate-400 truncate">Kasir Utama Toko</span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-900/60">
              Toko DEWI
            </span>
          </div>
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
                Online · Toko DEWI
              </span>
            </div>
            <h1 className="text-xs font-bold text-slate-900 truncate -mt-0.5">
              {currentPage}
            </h1>
          </div>
        </div>

        {/* Mobile Device & Shift Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
            Shift 1
          </span>
          <span
            className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold truncate max-w-[110px]"
            title={`Device ID: ${deviceId}`}
          >
            {deviceLabel.includes("HP") ? "📱 Kasir HP" : "💻 Kasir Laptop"}
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
    </>
  );
}
