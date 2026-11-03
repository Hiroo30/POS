import { NextResponse } from "next/server";
import { getSales, processSale, deleteSale, getDeviceIdFromRequest } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const sales = await getSales(limit, deviceId);
    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil riwayat penjualan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Keranjang belanja kosong" },
        { status: 400 }
      );
    }

    const result = await processSale({
      items: body.items,
      paymentMethod: body.paymentMethod || "TUNAI",
      amountPaid: Number(body.amountPaid) || 0,
      customerName: body.customerName,
      cashierName: body.cashierName,
      notes: body.notes,
      dueDate: body.dueDate,
      pointsRedeemed: body.pointsRedeemed !== undefined ? Number(body.pointsRedeemed) : undefined,
    }, deviceId);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Transaksi penjualan berhasil disimpan",
    });
  } catch (error) {
    console.error("Error processing sale:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses transaksi penjualan" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID transaksi wajib dicantumkan" },
        { status: 400 }
      );
    }

    const success = await deleteSale(id, true, deviceId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaksi nota berhasil dibatalkan dan stok dikembalikan",
    });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membatalkan transaksi" },
      { status: 500 }
    );
  }
}
