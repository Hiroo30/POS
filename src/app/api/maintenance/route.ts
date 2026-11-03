import { NextResponse } from "next/server";
import {
  getRawDatabase,
  restoreDatabase,
  resetDatabaseToDefault,
  getDeviceIdFromRequest,
} from "@/lib/db";

// Helper untuk mencegah CSV Formula Injection (=, +, -, @, \t, \r)
function sanitizeCsvCell(val: string | number | boolean | undefined | null): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    const raw = await getRawDatabase(deviceId);

    if (format === "csv") {
      // Export barang ke CSV
      const headers = [
        "ID",
        "Nama Barang",
        "Barcode",
        "Kategori",
        "Satuan Dasar",
        "Multi Satuan",
        "Satuan Kemasan",
        "Isi per Kemasan",
        "Sisa Stok (Satuan Dasar)",
        "Batas Minimum",
        "Harga Modal",
        "Harga Jual",
        "Nilai Aset Modal",
      ];

      const rows = raw.products.map((p) => {
        const asset = (p.stockInBase || 0) * (p.costPrice || 0);
        return [
          sanitizeCsvCell(p.id),
          sanitizeCsvCell(p.name),
          sanitizeCsvCell(p.barcode || ""),
          sanitizeCsvCell(p.category),
          sanitizeCsvCell(p.baseUnit),
          sanitizeCsvCell(p.hasMultiUnit ? "Ya" : "Tidak"),
          sanitizeCsvCell(p.packUnit || ""),
          p.packConversion || 1,
          p.stockInBase || 0,
          p.minStockInBase || 5,
          p.costPrice || 0,
          p.sellPrice || 0,
          asset,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="stok-sembako-${deviceId}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: Backup JSON
    return new NextResponse(JSON.stringify(raw, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="backup-sembako-${deviceId}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Error in maintenance GET:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses data backup" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();

    if (body.action === "reset") {
      const authPin =
        body.adminPin ||
        request.headers.get("x-admin-pin") ||
        new URL(request.url).searchParams.get("pin");
      const requiredPin = process.env.ADMIN_PIN || "1234";

      if (!authPin || String(authPin).trim() !== String(requiredPin).trim()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PIN Otorisasi Admin salah atau tidak disertakan. Aksi reset database ditolak demi keamanan.",
          },
          { status: 401 }
        );
      }

      await resetDatabaseToDefault(deviceId);
      return NextResponse.json({
        success: true,
        message: `Database perangkat (${deviceId}) berhasil direset ke setelan awal Toko Dewi`,
      });
    }

    if (body.action === "restore") {
      if (!body.data) {
        return NextResponse.json(
          { success: false, error: "Data backup tidak ditemukan" },
          { status: 400 }
        );
      }
      const success = await restoreDatabase(body.data, deviceId);
      if (!success) {
        return NextResponse.json(
          { success: false, error: "Format file cadangan tidak sesuai standar" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Data perangkat (${deviceId}) berhasil dipulihkan dari file backup!`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenali" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in maintenance POST:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat memproses data" },
      { status: 500 }
    );
  }
}
