export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string; // Nomor WhatsApp Toko / Penjual
  receiptFooter: string;
  cashierName: string;
  cashierRole: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "TOKO DEWI",
  storeAddress: "Jl. Melati No. 12, RT 02/RW 04",
  storePhone: "0823-2038-1500",
  receiptFooter: "Terima kasih telah berbelanja di Toko DEWI!",
  cashierName: "Kasir Dewi",
  cashierRole: "Kasir Utama Toko",
};

const STORAGE_KEY = "toko_dewi_store_settings";

export function getStoreSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_STORE_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_STORE_SETTINGS,
        ...parsed,
      };
    }
  } catch {}
  return DEFAULT_STORE_SETTINGS;
}

export function saveStoreSettings(settings: Partial<StoreSettings>): StoreSettings {
  if (typeof window === "undefined") return { ...DEFAULT_STORE_SETTINGS, ...settings };
  try {
    const current = getStoreSettings();
    const updated: StoreSettings = {
      ...current,
      ...settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("pos-settings-updated", { detail: updated }));
    return updated;
  } catch {
    return { ...DEFAULT_STORE_SETTINGS, ...settings };
  }
}

export function getCashierInitials(name: string): string {
  if (!name || !name.trim()) return "KD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
