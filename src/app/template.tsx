"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Urutan tab sesuai Navbar — kiri ke kanan
const NAV_ORDER = [
  "/",
  "/riwayat",
  "/produk",
  "/kasbon",
  "/laporan",
  "/maintenance",
];

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [slideClass, setSlideClass] = useState("ios-slide-right");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // Render pertama: simpan path awal, tidak ada animasi
      isFirstRender.current = false;
      sessionStorage.setItem("pos_prev_path", pathname);
      setSlideClass("ios-slide-right");
      return;
    }

    const prev = sessionStorage.getItem("pos_prev_path") || "/";
    const prevIdx = NAV_ORDER.indexOf(prev);
    const currIdx = NAV_ORDER.indexOf(pathname);

    // Kalau path ga ada di nav order, default slide right
    const goingForward = currIdx === -1 || prevIdx === -1 || currIdx >= prevIdx;
    setSlideClass(goingForward ? "ios-slide-right" : "ios-slide-left");

    sessionStorage.setItem("pos_prev_path", pathname);
  }, [pathname]);

  return (
    <div key={pathname} className={`${slideClass} w-full min-h-full`}>
      {children}
    </div>
  );
}
