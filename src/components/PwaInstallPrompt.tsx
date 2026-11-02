"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker immediately
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            console.log("PWA Service Worker registered:", reg.scope);
            reg.update();
          })
          .catch((err) => {
            console.warn("Service Worker registration failed:", err);
          });
      };

      if (document.readyState === "complete" || document.readyState === "interactive") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }
    }

    // 2. Check if already running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Capture Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user previously dismissed in this session
      const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleTrigger = () => {
      setShowPrompt(true);
    };
    window.addEventListener("trigger-pwa-install", handleTrigger);

    // 5. Detect successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("trigger-pwa-install", handleTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
        setShowIosGuide(true);
      }
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (isInstalled || (!showPrompt && !showIosGuide)) {
    return null;
  }

  return (
    <>
      {/* PWA Install Banner */}
      <div className="fixed bottom-18 md:bottom-5 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slideUp">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[26px] text-white">
              install_mobile
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white leading-tight">
                Pasang Aplikasi Inventori
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white text-xs p-1"
                title="Tutup"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Buka kasir lebih cepat, layar penuh (fullscreen) tanpa browser, dan ikon langsung di menu HP/Desktop.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Pasang Sekarang</span>
              </button>
              <button
                onClick={handleDismiss}
                className="py-2 px-3 text-slate-400 hover:text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Modal Guide (if user clicks on iPhone) */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-slate-800 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <span className="material-symbols-outlined text-emerald-700">apple</span>
                <span>Cara Pasang di iPhone / iPad</span>
              </div>
              <button onClick={() => setShowIosGuide(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>
            <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pl-4">
              <li>Tekan tombol <strong>Bagikan (Share)</strong> di bagian bawah layar Safari (ikon kotak bertanda panah ke atas).</li>
              <li>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
              <li>Tekan tombol <strong>"Tambah"</strong> di pojok kanan atas.</li>
              <li>Aplikasi <strong>Inventori Toko</strong> akan muncul langsung di layar utama iPhone Anda!</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full mt-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
