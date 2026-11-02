export type UnitType =
  | "Bungkus"
  | "Kg"
  | "Liter"
  | "Botol"
  | "Pcs"
  | "Sachet"
  | "Butir"
  | "Kaleng"
  | "Renteng"
  | "Pouch"
  | "Tabung"
  | "Galon"
  | "Kotak"
  | string;

export type PackUnitType =
  | "Dus"
  | "Karton"
  | "Sak"
  | "Bal"
  | "Slop"
  | "Krat"
  | "Peti"
  | string;

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  category: string;
  baseUnit: UnitType;
  hasMultiUnit: boolean;
  packUnit?: PackUnitType;
  packConversion?: number; // Contoh: 1 Dus = 40 Bungkus
  stockInBase: number; // Total stok dalam baseUnit
  minStockInBase: number; // Batas minimum peringatan stok menipis
  costPrice: number; // Harga modal per satuan dasar
  sellPrice: number; // Harga jual per satuan dasar
  costPricePack?: number; // Harga modal per satuan dus/karton
  sellPricePack?: number; // Harga jual per satuan dus/karton
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "IN" | "OUT" | "ADJUST" | "SALE";

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  type: TransactionType;
  quantityInBase: number;
  unitUsed: "BASE" | "PACK";
  quantityInput: number;
  pricePerUnit: number;
  totalPrice: number;
  note: string;
  stockBefore: number;
  stockAfter: number;
  createdAt: string;
}

export type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER" | "KASBON";

export interface CartItem {
  product: Product;
  quantity: number;
  unitUsed: "BASE" | "PACK";
  pricePerUnit: number;
  subtotal: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitUsed: "BASE" | "PACK";
  unitLabel: string;
  pricePerUnit: number;
  costPricePerUnit: number;
  subtotal: number;
}

export interface SaleTransaction {
  id: string;
  receiptNo: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  customerName?: string;
  notes?: string;
  createdAt: string;
}

export interface KasbonRecord {
  id: string;
  saleId?: string;
  customerName: string;
  phone?: string;
  itemsSummary: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "BELUM_LUNAS" | "LUNAS";
  dueDate?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

export interface StoreSummary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAssetValue: number; // Total modal barang di toko
  totalPotentialRevenue: number; // Nilai jual seluruh stok
  todaySales: number; // Total omzet penjualan hari ini
  todayProfit: number; // Laba kotor hari ini
  todayOrderCount: number; // Jumlah nota/transaksi hari ini
  totalKasbon: number; // Total piutang kasbon belum lunas
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  border: string;
  accent: string;
}
