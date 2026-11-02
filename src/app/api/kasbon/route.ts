import { NextResponse } from "next/server";
import { getKasbonList, addKasbonManual, payKasbon } from "@/lib/db";

export async function GET() {
  try {
    const list = await getKasbonList();
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
    });

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
    const body = await request.json();
    if (!body.id || body.amount === undefined) {
      return NextResponse.json(
        { success: false, error: "ID kasbon dan nominal pembayaran wajib diisi" },
        { status: 400 }
      );
    }

    const updated = await payKasbon(body.id, Number(body.amount));
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Catatan kasbon tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message:
        updated.status === "LUNAS"
          ? "Kasbon berhasil DILUNASI!"
          : "Pembayaran kasbon berhasil dicatat",
    });
  } catch (error) {
    console.error("Error paying kasbon:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui kasbon" },
      { status: 500 }
    );
  }
}
