import { NextResponse } from "next/server";
import { getStoreSummary } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // Read request url to ensure dynamic evaluation
    const _ = request.url;
    const summary = await getStoreSummary();
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
