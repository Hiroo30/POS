# Kasir Pintar Sembako — POS & Manajemen Toko

Aplikasi Point of Sale (POS) & Manajemen Stok Toko Sembako modern berbasis Next.js 16, Tailwind CSS, dan Vercel Blob Storage dengan antarmuka yang terinspirasi dari aplikasi **Kasir Pintar**.

## 🚀 Fitur Utama

- **Kasir POS Cepat & Responsif**:
  - Grid katalog produk sembako dengan selektor multi-satuan instan (Eceran / Dus / Sak / Karton) tanpa membuka modal.
  - Laci keranjang belanja dinamis dengan kalkulasi diskon, subtotal, dan total tagihan.
  - Terminal pembayaran kasir interaktif dengan **kalkulator touch numpad**, pecahan uang cepat, dan pilihan metode bayar (*Tunai, QRIS, Transfer, Kasbon*).
  - Cetak struk belanja thermal (58mm/80mm) dan bagikan struk via WhatsApp.

- **Katalog & Manajemen Stok Barang**:
  - Filter kategori sembako lengkap (Beras, Minyak, Mie, Telur, Bumbu, Sabun, Gas/Galon, dsb.).
  - Indikator stok real-time (*Aman, Menipis, Habis*).
  - Aksi cepat: Tambah stok masuk (kulakan) sekaligus update harga modal, stok keluar, opname/koreksi fisik, dan edit/hapus produk.

- **Buku Kasbon & Piutang Pelanggan**:
  - Rekap total piutang aktif toko dan jumlah pelanggan berhutang.
  - Pelacakan jatuh tempo kasbon pelanggan.
  - Aksi pelunasan hutang kasbon satu klik.

- **Laporan & Rekapitulasi Omzet**:
  - Metrik harian: Jumlah nota transaksi, total pendapatan omzet kotor, dan estimasi laba bersih.
  - Riwayat nota penjualan lengkap dengan rincian item, laba, dan metode pembayaran.

- **Pengaturan & Cadangan Data**:
  - Backup seluruh data database ke format JSON.
  - Ekspor laporan katalog stok ke format Excel / CSV.
  - Fitur restore data cadangan dan reset ke data bawaan.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS & KasirPintar Custom Design System
- **Icons**: Lucide React SVG
- **Storage / Database**: Vercel Blob Storage (Cloud) & Fallback File Storage
- **Deployment**: Vercel Production

## 💻 Menjalankan Secara Lokal

1. Clone repositori:
   ```bash
   git clone https://github.com/Hiroo30/POS.git
   cd POS
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

4. Buka `http://localhost:3000` di peramban Anda.
