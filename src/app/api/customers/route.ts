import { NextResponse } from "next/server";
import {
  getCustomers,
  saveCustomer,
  deleteCustomer,
  redeemCustomerPoints,
  getDeviceIdFromRequest,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const customers = await getCustomers(limit, deviceId);
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data pelanggan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();

    // Check if this is a point redemption action
    if (body.action === "REDEEM") {
      const pointsToRedeem = Number(body.pointsToRedeem);
      if (
        !body.customerId ||
        typeof pointsToRedeem !== "number" ||
        !Number.isFinite(pointsToRedeem) ||
        !Number.isInteger(pointsToRedeem) ||
        pointsToRedeem <= 0
      ) {
        return NextResponse.json(
          { success: false, error: "Jumlah poin yang ditukarkan harus berupa bilangan bulat positif (> 0)" },
          { status: 400 }
        );
      }
      const result = await redeemCustomerPoints(
        body.customerId,
        pointsToRedeem,
        deviceId
      );
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || "Gagal menukar poin" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        data: result.customer,
        message: "Poin pelanggan berhasil ditukarkan",
      });
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama pelanggan wajib diisi" },
        { status: 400 }
      );
    }

    const customer = await saveCustomer(
      {
        id: body.id,
        name: body.name.trim(),
        phone: body.phone?.trim(),
        points: body.points !== undefined ? Number(body.points) : undefined,
        notes: body.notes?.trim(),
      },
      deviceId
    );

    return NextResponse.json({
      success: true,
      data: customer,
      message: "Data pelanggan berhasil disimpan",
    });
  } catch (error) {
    console.error("Error saving customer:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan data pelanggan" },
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
        { success: false, error: "ID pelanggan wajib disertakan" },
        { status: 400 }
      );
    }

    const success = await deleteCustomer(id, deviceId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pelanggan berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus pelanggan" },
      { status: 500 }
    );
  }
}
