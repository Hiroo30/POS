import { NextResponse } from "next/server";
import { getStoreSummary, getDeviceIdFromRequest } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const summary = await getStoreSummary(deviceId);
    return NextResponse.json(
      { success: true, data: summary },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil ringkasan toko" },
      { status: 500 }
    );
  }
}
