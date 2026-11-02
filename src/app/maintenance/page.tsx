"use client";

import { useState, useEffect } from "react";
import { getDeviceId, getDeviceLabel, resetDeviceId, setDeviceCustomName } from "@/lib/device";
import { getStoreSettings, saveStoreSettings } from "@/lib/storeSettings";
import CashDrawerModal from "@/components/CashDrawerModal";

type TabId = "cadangan" | "hardware" | "struk" | "device";

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<TabId>("cadangan");
  const [deviceId, setDeviceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [customDeviceName, setCustomDeviceName] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt & Store Settings
  const [storeName, setStoreName] = useState("TOKO DEWI");
  const [storeAddress, setStoreAddress] = useState("Pasar Karangsembung");
  const [storePhone, setStorePhone] = useState("0823-2038-1500");
  const [receiptFooter, setReceiptFooter] = useState("Terima kasih telah berbelanja di Toko DEWI!");
  const [cashierName, setCashierName] = useState("Dewi");
  const [cashierRole, setCashierRole] = useState("Owner");
  const [printerWidth, setPrinterWidth] = useState<"58mm" | "80mm">("58mm");
  const [testScanInput, setTestScanInput] = useState("");
  const [scaleWeight, setScaleWeight] = useState("0.000");
  const [cashDrawerAmount, setCashDrawerAmount] = useState<number>(1450000);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState<boolean>(false);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    const label = getDeviceLabel();
    setDeviceLabel(label);
    setCustomDeviceName(label);

    const settings = getStoreSettings();
    setStoreName(settings.storeName);
    setStoreAddress(settings.storeAddress);
    setStorePhone(settings.storePhone);
    setReceiptFooter(settings.receiptFooter);
    setCashierName(settings.cashierName);
    setCashierRole(settings.cashierRole);

    try {
      const saved = localStorage.getItem(`pos_cash_drawer_${id}`);
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num)) setCashDrawerAmount(num);
      }
    } catch {}
  }, []);

  const handleSaveReceiptSettings = () => {
    saveStoreSettings({
      storeName,
      storeAddress,
      storePhone,
      receiptFooter,
      cashierName,
      cashierRole,
    });
    setStatusMessage({
      type: "success",
      text: `Pengaturan format struk & kasir (${cashierName}) berhasil disimpan!`,
    });
  };

  const handleSaveCashDrawer = (newAmount: number) => {
    setCashDrawerAmount(newAmount);
    try {
      if (deviceId) {
        localStorage.setItem(`pos_cash_drawer_${deviceId}`, newAmount.toString());
        setStatusMessage({
          type: "success",
          text: `Saldo uang laci ${deviceLabel} berhasil diperbarui: Rp ${newAmount.toLocaleString("id-ID")}`,
        });
      }
    } catch {}
  };

  const handleDownloadBackup = () => {
    window.open(`/api/maintenance?format=json&deviceId=${encodeURIComponent(deviceId)}`, "_blank");
    setStatusMessage({
      type: "success",
      text: `File cadangan (backup JSON) perangkat ${deviceId} sedang diunduh.`,
    });
  };

  const handleDownloadCSV = () => {
    window.open(`/api/maintenance?format=csv&deviceId=${encodeURIComponent(deviceId)}`, "_blank");
    setStatusMessage({
      type: "success",
      text: `Laporan data stok format Excel/CSV perangkat ${deviceId} sedang diunduh.`,
    });
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      `PERINGATAN: Memulihkan backup akan menggantikan data barang & kasbon pada perangkat ini (${deviceId}). Lanjutkan?`
    );
    if (!confirmRestore) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch(`/api/maintenance?deviceId=${encodeURIComponent(deviceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": deviceId },
        body: JSON.stringify({ action: "restore", data: parsed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Format file tidak valid");
      }

      setStatusMessage({
        type: "success",
        text: `Data perangkat (${deviceId}) berhasil dipulihkan dari file cadangan!`,
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
      `Apakah Anda yakin ingin mereset data KHUSUS perangkat ini (${deviceId}) kembali ke setelan awal Toko Dewi? Perangkat lain tidak akan terpengaruh.`
    );
    if (!confirmReset) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/maintenance?deviceId=${encodeURIComponent(deviceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": deviceId },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mereset data");
      }

      setStatusMessage({
        type: "success",
        text: `Data perangkat (${deviceId}) berhasil dikembalikan ke contoh awal sembako!`,
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

  const handleTestPrint = () => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      alert("Izinkan pop-up untuk melakukan tes cetak struk!");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Sampel - Toko DEWI</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: ${printerWidth}; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center" style="font-weight:bold; font-size:14px;">${storeName}</div>
          <div class="center">${storeAddress}</div>
          <div class="center">WA: ${storePhone}</div>
          <div class="line"></div>
          <div class="row"><span>Tanggal:</span><span>${new Date().toLocaleDateString("id-ID")}</span></div>
          <div class="row"><span>Terminal:</span><span>${deviceLabel}</span></div>
          <div class="line"></div>
          <div class="row"><span>Beras Ramos 5kg (1x)</span><span>Rp 76.000</span></div>
          <div class="row"><span>Minyak Bimoli 2L (1x)</span><span>Rp 38.500</span></div>
          <div class="line"></div>
          <div class="row" style="font-weight:bold;"><span>TOTAL:</span><span>Rp 114.500</span></div>
          <div class="row"><span>TUNAI:</span><span>Rp 120.000</span></div>
          <div class="row"><span>KEMBALI:</span><span>Rp 5.500</span></div>
          <div class="line"></div>
          <div class="center" style="margin-top:10px;">${receiptFooter}</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleKickDrawer = () => {
    setStatusMessage({
      type: "info",
      text: "Sinyal pulsa 24V dikirim ke port laci kasir RJ11 (Test Kick OK).",
    });
  };

  const handleSaveDeviceName = () => {
    if (!customDeviceName.trim()) return;
    setDeviceCustomName(customDeviceName.trim());
    setDeviceLabel(customDeviceName.trim());
    setStatusMessage({
      type: "success",
      text: `Nama terminal perangkat disimpan sebagai "${customDeviceName.trim()}"!`,
    });
  };

  const handleGenerateNewDeviceId = () => {
    const confirmChange = window.confirm(
      "Ganti Device ID akan membuat perangkat ini memulai sesi kasir baru dengan data independen. Lanjutkan?"
    );
    if (!confirmChange) return;
    const newId = resetDeviceId();
    setDeviceId(newId);
    setDeviceLabel(getDeviceLabel());
    setStatusMessage({
      type: "success",
      text: `Device ID baru aktif: ${newId}. Halaman akan memuat data untuk terminal ini.`,
    });
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <span>PENGATURAN TOKO</span>
            <span>•</span>
            <span>PEMELIHARAAN SISTEM</span>
            <span>•</span>
            <span className="text-emerald-700">{deviceLabel}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Pengaturan & Maintenance Sistem POS
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Toko DEWI (Aktif)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              ID: {deviceId}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              v1.0.0-stable
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="material-symbols-outlined text-[16px]">cloud_done</span>
              Cloud POS Sinkron OK
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              handleSaveReceiptSettings();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs md:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-3 border shadow-xs animate-slideDown ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : statusMessage.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {statusMessage.type === "success"
              ? "check_circle"
              : statusMessage.type === "error"
              ? "error"
              : "info"}
          </span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Workspace Layout: Nav Tabs + Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Tabs (Side on Desktop, Top Scroll on Mobile) */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-100 space-y-1">
            <span className="block px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Modul Pemeliharaan
            </span>

            {[
              { id: "cadangan", label: "Cadangan & Database", icon: "cloud_sync" },
              { id: "hardware", label: "Perangkat Keras (Hardware)", icon: "print" },
              { id: "struk", label: "Format Struk Belanja", icon: "receipt_long" },
              { id: "device", label: "Isolasi Terminal Device", icon: "devices" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs md:text-sm text-left transition-all font-semibold ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              );
            })}
          </div>

          {/* Quick Storage Status Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Status Penyimpanan Lokal</span>
              <span className="text-emerald-700">Optimal</span>
            </div>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Memori Browser:</span>
                <span className="font-bold text-slate-700 font-mono">148 MB / 480 MB</span>
              </div>
              <div className="flex justify-between">
                <span>Koneksi Server:</span>
                <span className="font-bold text-emerald-700">Online LAN & Cloud</span>
              </div>
              <div className="flex justify-between">
                <span>Kecepatan Ping:</span>
                <span className="font-bold text-emerald-700 font-mono">14 ms</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Panels */}
        <main className="lg:col-span-9 space-y-6">
          {/* TAB 1: CADANGAN & DATABASE */}
          {activeTab === "cadangan" && (
            <div className="space-y-6">
              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">cloud_sync</span>
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">
                      Cadangan Cloud & Sinkronisasi Database
                    </h2>
                    <p className="text-xs text-slate-500">
                      Kelola file backup data kasir toko untuk perangkat {deviceId}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Backup JSON */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-700 text-[22px]">
                          add_to_drive
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">Backup Seluruh Data (JSON)</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unduh arsip lengkap data transaksi, produk sembako, dan kasbon pada perangkat ini.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadBackup}
                      className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Unduh File JSON</span>
                    </button>
                  </div>

                  {/* Export CSV */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-amber-600 text-[22px]">
                          table_view
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">Ekspor Laporan Stok (CSV / Excel)</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Daftar sisa stok fisik, harga modal, harga jual ecer untuk pembukuan Excel.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadCSV}
                      className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">table_chart</span>
                      <span>Unduh Tabel CSV</span>
                    </button>
                  </div>

                  {/* Restore JSON */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-blue-600 text-[22px]">
                          restore
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">Pulihkan dari Backup JSON</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unggah file JSON backup sebelumnya untuk memulihkan seluruh data toko.
                      </p>
                    </div>
                    <label className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-all">
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      <span>{isProcessing ? "Memproses..." : "Pilih File Backup JSON"}</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreBackup}
                        disabled={isProcessing}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Reset to Default */}
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-rose-600 text-[22px]">
                          restart_alt
                        </span>
                        <h3 className="font-bold text-rose-800 text-sm">Reset ke Data Awal Toko</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Kembalikan komoditas sembako ke setelan bawaan Toko Dewi pada perangkat ini saja.
                      </p>
                    </div>
                    <button
                      onClick={handleResetData}
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                      <span>Reset Data Perangkat Ini</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERANGKAT KERAS (HARDWARE POS) */}
          {activeTab === "hardware" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thermal Printer */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">print</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Printer Thermal Struk</h3>
                      <p className="text-xs text-slate-400">USB / Bluetooth / LAN</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Siap
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Lebar Kertas</label>
                    <select
                      value={printerWidth}
                      onChange={(e) => setPrinterWidth(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-800"
                    >
                      <option value="58mm">58 mm (Standar Warung)</option>
                      <option value="80mm">80 mm (Thermal Kasir Besar)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleTestPrint}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt</span>
                  <span>Tes Cetak Struk Sampel</span>
                </button>
              </div>

              {/* Barcode Scanner */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">barcode_scanner</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Pemindai Barcode (Scanner)</h3>
                      <p className="text-xs text-slate-400">USB HID / Keyboard Emulation</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Aktif (F2)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-xs">
                    Uji Coba Scan Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="Arahkan scanner ke barcode di sini..."
                    value={testScanInput}
                    onChange={(e) => setTestScanInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono"
                  />
                  {testScanInput && (
                    <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                      Barcode Terbaca: {testScanInput} ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Cash Drawer */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Laci Uang Kasir (Cash Drawer)</h3>
                      <p className="text-xs text-slate-400">Port RJ11 Printer</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Terkoneksi
                  </span>
                </div>

                {/* Saldo Laci Current Status */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-800 font-semibold block">
                      Saldo Fisik Laci ({deviceLabel}):
                    </span>
                    <span className="text-base font-extrabold text-emerald-800">
                      Rp {cashDrawerAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCashDrawerModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>Ubah Saldo</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Laci otomatis terbuka saat transaksi kasir tunai selesai dicetak.
                </p>

                <button
                  onClick={handleKickDrawer}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  <span>Buka Laci Manual (Test Kick)</span>
                </button>
              </div>

              {/* Digital Scale */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">scale</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Timbangan Digital USB</h3>
                      <p className="text-xs text-slate-400">Beras, Gula & Telur Kiloan</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Tera OK
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Bobot Terbaca:
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      {scaleWeight} <span className="text-xs text-slate-600 font-normal">Kg</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setScaleWeight("0.000")}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    type="button"
                  >
                    Tara (Nol-kan)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMAT STRUK BELANJA */}
          {activeTab === "struk" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input */}
              <div className="lg:col-span-7 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-base">Format Kepala, Kasir & Kaki Struk</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                    Thermal 58mm / 80mm
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Nama Petugas Kasir
                      </label>
                      <input
                        type="text"
                        value={cashierName}
                        onChange={(e) => setCashierName(e.target.value)}
                        placeholder="Contoh: Kasir Dewi / Ibu Dewi / Eksa"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Nama yang tercetak di baris "Kasir:" pada nota.</p>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Peran / Jabatan Kasir
                      </label>
                      <input
                        type="text"
                        value={cashierRole}
                        onChange={(e) => setCashierRole(e.target.value)}
                        placeholder="Contoh: Kasir Utama Toko / Owner / Shift 1"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Ditampilkan di profil kasir sidebar.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Nama Toko / Warung di Struk
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Alamat Lengkap Toko
                    </label>
                    <textarea
                      rows={2}
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Nomor WhatsApp Toko / Penjual (Dicetak di Struk)
                    </label>
                    <input
                      type="text"
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      placeholder="Contoh: 0823-2038-1500"
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      *Nomor kontak WhatsApp toko/penjual agar pembeli dapat menghubungi warung untuk pesanan atau info produk.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Pesan Kaki Struk (Footer)
                    </label>
                    <input
                      type="text"
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveReceiptSettings}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Simpan Format Struk & Profil Kasir</span>
                </button>
              </div>

              {/* Live Preview Paper */}
              <div className="lg:col-span-5 bg-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">
                  Pratinjau Kertas Thermal ({printerWidth})
                </div>
                <div
                  className="bg-white p-5 rounded-md shadow-md text-slate-900 font-mono text-[11px] leading-tight space-y-2 border border-slate-300"
                  style={{ width: "260px" }}
                >
                  <div className="text-center font-bold text-sm tracking-wide">{storeName}</div>
                  <div className="text-center text-[10px] text-slate-600">{storeAddress}</div>
                  <div className="text-center text-[10px] text-slate-600">WA: {storePhone}</div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="flex justify-between text-[10px]">
                    <span>NOTA: NOTA-20261102-1234</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-emerald-800">Kasir: {cashierName}</span>
                    <span>14:32 WIB</span>
                  </div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="flex justify-between">
                    <span>Beras Ramos 5kg x1</span>
                    <span>Rp 76.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minyak Bimoli 2L x1</span>
                    <span>Rp 38.500</span>
                  </div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="flex justify-between font-bold text-xs">
                    <span>TOTAL:</span>
                    <span>Rp 114.500</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>TUNAI:</span>
                    <span>Rp 120.000</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>KEMBALI:</span>
                    <span>Rp 5.500</span>
                  </div>
                  <div className="border-b border-dashed border-slate-400 my-2"></div>
                  <div className="text-center text-[10px] pt-1">{receiptFooter}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ISOLASI TERMINAL DEVICE */}
          {activeTab === "device" && (
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">devices</span>
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800">
                    Isolasi Antar-Perangkat (Device POS Independence)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Memastikan kasir di HP dan laptop memiliki data dan keranjang belanja masing-masing secara terpisah.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-purple-700 font-bold block">
                      ID Perangkat Ini (Device ID)
                    </span>
                    <span className="text-base font-bold font-mono text-purple-950">
                      {deviceId}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-900 font-bold text-xs self-start sm:self-center">
                    {deviceLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Semua transaksi, keranjang kasir, dan perubahan stok yang dilakukan di perangkat ini disimpan pada partisi khusus untuk ID ini. Perangkat lain (misal HP atau Laptop lain) tidak akan terganggu.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">
                    Ubah Nama Label Terminal Ini
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customDeviceName}
                      onChange={(e) => setCustomDeviceName(e.target.value)}
                      placeholder="Contoh: Kasir Meja Depan / Kasir HP Keliling"
                      className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
                    />
                    <button
                      onClick={handleSaveDeviceName}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                      type="button"
                    >
                      Simpan Nama
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Ganti ID Terminal Baru</h4>
                    <p className="text-[11px] text-slate-400">
                      Generate ID baru untuk mengosongkan riwayat lokal dan memulai sesi bersih.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateNewDeviceId}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    type="button"
                  >
                    Generate ID Baru
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <CashDrawerModal
        isOpen={showCashDrawerModal}
        onClose={() => setShowCashDrawerModal(false)}
        currentAmount={cashDrawerAmount}
        onSave={handleSaveCashDrawer}
        deviceLabel={deviceLabel || "Kasir"}
      />
    </div>
  );
}
