import { NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct, getDeviceIdFromRequest } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deviceId = getDeviceIdFromRequest(request);
    const product = await getProductById(id, deviceId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deviceId = getDeviceIdFromRequest(request);
    const body = await request.json();

    const updated = await updateProduct(id, {
      barcode: body.barcode !== undefined ? body.barcode : undefined,
      name: body.name ? body.name.trim() : undefined,
      category: body.category,
      baseUnit: body.baseUnit,
      hasMultiUnit: body.hasMultiUnit !== undefined ? Boolean(body.hasMultiUnit) : undefined,
      packUnit: body.packUnit,
      packConversion: body.packConversion !== undefined ? Number(body.packConversion) : undefined,
      stockInBase: body.stockInBase !== undefined ? Number(body.stockInBase) : undefined,
      minStockInBase: body.minStockInBase !== undefined ? Number(body.minStockInBase) : undefined,
      costPrice: body.costPrice !== undefined ? Number(body.costPrice) : undefined,
      sellPrice: body.sellPrice !== undefined ? Number(body.sellPrice) : undefined,
      costPricePack: body.costPricePack !== undefined ? Number(body.costPricePack) : undefined,
      sellPricePack: body.sellPricePack !== undefined ? Number(body.sellPricePack) : undefined,
    }, deviceId);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui barang" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deviceId = getDeviceIdFromRequest(request);
    const deleted = await deleteProduct(id, deviceId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "Barang berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus barang" },
      { status: 500 }
    );
  }
}
