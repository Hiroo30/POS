import { NextResponse } from "next/server";
import { getProducts, addProduct, getDeviceIdFromRequest } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const products = await getProducts(deviceId);
    return NextResponse.json(
      { success: true, data: products },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data barang" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();
    if (!body.name || !body.baseUnit) {
      return NextResponse.json(
        { success: false, error: "Nama barang dan satuan wajib diisi" },
        { status: 400 }
      );
    }

    const newProduct = await addProduct({
      barcode: body.barcode || "",
      name: body.name.trim(),
      category: body.category || "lainnya",
      baseUnit: body.baseUnit,
      hasMultiUnit: Boolean(body.hasMultiUnit),
      packUnit: body.packUnit || "",
      packConversion: body.packConversion ? Number(body.packConversion) : 1,
      stockInBase: Number(body.stockInBase) || 0,
      minStockInBase: Number(body.minStockInBase) || 5,
      costPrice: Number(body.costPrice) || 0,
      sellPrice: Number(body.sellPrice) || 0,
      costPricePack: body.costPricePack ? Number(body.costPricePack) : undefined,
      sellPricePack: body.sellPricePack ? Number(body.sellPricePack) : undefined,
    }, deviceId);

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan barang baru" },
      { status: 500 }
    );
  }
}
