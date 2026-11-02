import { NextResponse } from "next/server";
import { getTransactions, recordStockMutation, getDeviceIdFromRequest } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const productId = searchParams.get("productId") || undefined;

    const list = await getTransactions(limit, productId, deviceId);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil riwayat transaksi" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();
    if (!body.productId || !body.type || body.quantityInput === undefined) {
      return NextResponse.json(
        { success: false, error: "Data transaksi tidak lengkap" },
        { status: 400 }
      );
    }

    const qty = Number(body.quantityInput);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json(
        { success: false, error: "Jumlah harus berupa angka valid" },
        { status: 400 }
      );
    }

    const result = await recordStockMutation({
      productId: body.productId,
      type: body.type,
      unitUsed: body.unitUsed === "PACK" ? "PACK" : "BASE",
      quantityInput: qty,
      note: body.note,
      newCostPrice: body.newCostPrice ? Number(body.newCostPrice) : undefined,
    }, deviceId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message:
        body.type === "IN"
          ? "Stok berhasil ditambahkan"
          : body.type === "OUT"
          ? "Stok berhasil dikurangi"
          : "Stok fisik berhasil disesuaikan",
    });
  } catch (error) {
    console.error("Error creating stock mutation:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses transaksi stok" },
      { status: 500 }
    );
  }
}
