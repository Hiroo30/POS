import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Kasir Pintar Sembako — POS & Manajemen Stok Toko",
  description:
    "Aplikasi Kasir Pintar POS dan Manajemen Stok Toko Sembako modern, cepat, dan ramah pengguna.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1b2e1f",
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
      </head>
      <body className="h-full bg-[#f4f6fb] text-[#131b2e] antialiased">
        <div className="min-h-screen flex flex-col md:flex-row">
          <Navbar />
          <main className="flex-1 min-w-0 md:pl-64 pt-14 md:pt-0 pb-20 md:pb-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
