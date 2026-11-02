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
    <html lang="id" style={{height:"100%"}}>
      <body style={{margin:0, padding:0, height:"100%", userSelect:"none"}}>
        <div className="kp-layout">
          <Navbar />
          <div className="kp-main">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
