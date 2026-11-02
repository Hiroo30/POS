import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "Toko DEWI — Kasir Pintar Sembako & Manajemen Toko",
  description:
    "Aplikasi Kasir Pintar POS, Katalog Stok, dan Pembukuan Toko Sembako DEWI modern, cepat, dan ramah pengguna.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Toko DEWI",
  },
  applicationName: "Toko DEWI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#006c49",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Toko DEWI" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="h-full bg-[#f4f6fb] text-[#131b2e] antialiased">
        <div className="min-h-screen flex flex-col md:flex-row">
          <Navbar />
          <main className="app-main-content flex-1 min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
