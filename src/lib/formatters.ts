import { Product } from "./types";

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatStockDisplay(product: Product): {
  mainDisplay: string;
  detailDisplay: string;
  isLow: boolean;
  isOut: boolean;
} {
  const stock = product.stockInBase || 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= (product.minStockInBase || 5);

  if (!product.hasMultiUnit || !product.packConversion || product.packConversion <= 1) {
    return {
      mainDisplay: `${stock} ${product.baseUnit}`,
      detailDisplay: "",
      isLow,
      isOut,
    };
  }

  const packCount = Math.floor(stock / product.packConversion);
  const remainder = stock % product.packConversion;

  let mainDisplay = "";
  if (packCount > 0 && remainder > 0) {
    mainDisplay = `${packCount} ${product.packUnit} + ${remainder} ${product.baseUnit}`;
  } else if (packCount > 0) {
    mainDisplay = `${packCount} ${product.packUnit}`;
  } else {
    mainDisplay = `${remainder} ${product.baseUnit}`;
  }

  const detailDisplay = `(Total: ${stock} ${product.baseUnit})`;

  return {
    mainDisplay,
    detailDisplay,
    isLow,
    isOut,
  };
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return dateString;
  }
}
