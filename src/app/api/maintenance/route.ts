import { NextResponse } from "next/server";
import { getRawDatabase, restoreDatabase, resetDatabaseToDefault } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    const raw = await getRawDatabase();

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
          `"${p.id}"`,
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.barcode || ""}"`,
          `"${p.category}"`,
          `"${p.baseUnit}"`,
          `"${p.hasMultiUnit ? "Ya" : "Tidak"}"`,
          `"${p.packUnit || ""}"`,
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
          "Content-Disposition": `attachment; filename="stok-sembako-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: Backup JSON
    return new NextResponse(JSON.stringify(raw, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-sembako-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Error in maintenance GET:", error);
    return NextResponse.json({ success: false, error: "Gagal membuat backup" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "reset") {
      await resetDatabaseToDefault();
      return NextResponse.json({
        success: true,
        message: "Data berhasil direset ke contoh awal sembako",
      });
    }

    if (body.action === "restore" && body.data) {
      const ok = await restoreDatabase(body.data);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: "Format data backup tidak valid" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Data berhasil dipulihkan dari backup",
      });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error) {
    console.error("Error in maintenance POST:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses permintaan maintenance" },
      { status: 500 }
    );
  }
}
