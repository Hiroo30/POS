"use client";

/**
 * Device identity manager for multi-device POS isolation.
 * Keeps Laptop (Terminal 1) and HP/Mobile (Terminal 2) completely independent.
 */

const DEVICE_ID_KEY = "pos_device_id";
const DEVICE_NAME_KEY = "pos_device_name";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate new unique ID for this device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    deviceId = isMobile ? `hp_${randomSuffix}` : `laptop_${randomSuffix}`;

    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  // Ensure cookie is set so all Next.js server requests receive it automatically
  try {
    document.cookie = `pos_device_id=${encodeURIComponent(
      deviceId
    )}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Cookie fallback
  }

  return deviceId;
}

export function getDeviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const id = getDeviceId();
  if (id.startsWith("hp_")) return "mobile";
  if (id.startsWith("laptop_")) return "desktop";
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

export function getDeviceLabel(): string {
  if (typeof window === "undefined") return "Terminal POS";
  const type = getDeviceType();
  const id = getDeviceId();
  const customName = localStorage.getItem(DEVICE_NAME_KEY);
  if (customName) return customName;

  return type === "mobile"
    ? `📱 Kasir HP (${id})`
    : `💻 Kasir Laptop (${id})`;
}

export function setDeviceCustomName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

export function resetDeviceId(): string {
  if (typeof window === "undefined") return "default";
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_NAME_KEY);
  return getDeviceId();
}

/**
 * Universal fetch wrapper that automatically appends x-device-id header
 * and deviceId query param so server API requests are always 100% device-scoped.
 */
export async function deviceFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const deviceId = getDeviceId();
  const headers = new Headers(init?.headers || {});
  headers.set("x-device-id", deviceId);

  // Append query param as backup
  const sep = input.includes("?") ? "&" : "?";
  const urlWithDevice = `${input}${sep}deviceId=${encodeURIComponent(deviceId)}`;

  return fetch(urlWithDevice, {
    ...init,
    headers,
  });
}
