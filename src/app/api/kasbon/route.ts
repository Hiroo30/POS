import { NextResponse } from "next/server";
import { getKasbonList, addKasbonManual, payKasbon, getDeviceIdFromRequest } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const list = await getKasbonList(deviceId);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("Error fetching kasbon:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat buku kasbon" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();
    if (!body.customerName || !body.amount) {
      return NextResponse.json(
        { success: false, error: "Nama pelanggan dan nominal wajib diisi" },
        { status: 400 }
      );
    }

    const newBon = await addKasbonManual({
      customerName: body.customerName.trim(),
      phone: body.phone?.trim() || "",
      itemsSummary: body.itemsSummary || "Bon belanja sembako",
      amount: Number(body.amount),
      dueDate: body.dueDate,
      notes: body.notes,
    }, deviceId);

    return NextResponse.json({
      success: true,
      data: newBon,
      message: "Catatan kasbon berhasil ditambahkan",
    });
  } catch (error) {
    console.error("Error adding kasbon:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan kasbon" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();
    if (!body.id || body.amount === undefined) {
      return NextResponse.json(
        { success: false, error: "ID dan jumlah pelunasan wajib diisi" },
        { status: 400 }
      );
    }

    const payAmount = Number(body.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Jumlah pembayaran kasbon harus berupa angka lebih dari Rp 0" },
        { status: 400 }
      );
    }

    const updated = await payKasbon(body.id, payAmount, deviceId);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Data kasbon tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message:
        updated.status === "LUNAS"
          ? "Hutang kasbon telah LUNAS sepenuhnya!"
          : "Pembayaran cicilan kasbon berhasil dicatat",
    });
  } catch (error) {
    console.error("Error updating kasbon:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses pembayaran kasbon" },
      { status: 500 }
    );
  }
}
