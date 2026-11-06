import { NextResponse } from "next/server";
import {
  getShiftRecords,
  recordShiftClose,
  deleteShiftRecord,
  clearAllShiftRecords,
  getDeviceIdFromRequest,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 100) : 100;

    const shifts = await getShiftRecords(limit, deviceId);
    return NextResponse.json({ success: true, data: shifts });
  } catch (error) {
    console.error("Error fetching shift records:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil riwayat tutup shift" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Data rekap tutup shift tidak valid" },
        { status: 400 }
      );
    }

    const newShift = await recordShiftClose(
      {
        cashierName:
          typeof body.cashierName === "string" && body.cashierName.trim()
            ? body.cashierName.trim()
            : "Kasir Dewi",
        deviceLabel:
          typeof body.deviceLabel === "string" && body.deviceLabel.trim()
            ? body.deviceLabel.trim()
            : "Kasir POS",
        orderCount: Math.max(0, Number(body.orderCount) || 0),
        tunai: Number(body.tunai) || 0,
        qris: Number(body.qris) || 0,
        transfer: Number(body.transfer) || 0,
        kasbon: Number(body.kasbon) || 0,
        totalRevenue: Number(body.totalRevenue) || 0,
        drawerExpenses: Number(body.drawerExpenses) || 0,
        totalExpenses: Number(body.totalExpenses) || 0,
        netProfit: Number(body.netProfit) || 0,
        systemCashDrawer: Number(body.systemCashDrawer) || 0,
        actualCashDrawer: Number(body.actualCashDrawer) || 0,
        cashDifference: Number(body.cashDifference) || 0,
        notes:
          typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : undefined,
      },
      deviceId
    );

    return NextResponse.json({
      success: true,
      data: newShift,
      message: "Rekap tutup shift berhasil disimpan",
    });
  } catch (error) {
    console.error("Error saving shift close record:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan rekap tutup shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const deleted = await deleteShiftRecord(id, deviceId);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: "Catatan tutup shift tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Catatan rekap tutup shift berhasil dihapus",
      });
    }

    await clearAllShiftRecords(deviceId);
    return NextResponse.json({
      success: true,
      message: "Seluruh riwayat tutup shift berhasil dikosongkan",
    });
  } catch (error) {
    console.error("Error deleting shift close record:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus riwayat tutup shift" },
      { status: 500 }
    );
  }
}
