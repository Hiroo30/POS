import { NextResponse } from "next/server";
import {
  getExpenses,
  recordExpense,
  deleteExpense,
  getDeviceIdFromRequest,
} from "@/lib/db";
import { ExpenseCategory } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const expenses = await getExpenses(limit, deviceId);
    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data pengeluaran toko" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();

    if (!body.category || !body.description || body.amount === undefined) {
      return NextResponse.json(
        { success: false, error: "Data pengeluaran tidak lengkap" },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal pengeluaran harus lebih dari Rp 0" },
        { status: 400 }
      );
    }

    const newExpense = await recordExpense(
      {
        category: body.category as ExpenseCategory,
        description: body.description,
        amount,
        paidFromDrawer: Boolean(body.paidFromDrawer),
        cashierName: body.cashierName,
      },
      deviceId
    );

    return NextResponse.json({
      success: true,
      data: newExpense,
      message: "Catatan pengeluaran berhasil disimpan",
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan pengeluaran toko" },
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
        { success: false, error: "ID pengeluaran wajib disertakan" },
        { status: 400 }
      );
    }

    const success = await deleteExpense(id, deviceId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Pengeluaran tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Catatan pengeluaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus pengeluaran" },
      { status: 500 }
    );
  }
}
