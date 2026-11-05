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

export function formatMultiUnitBreakdown(
  stock: number,
  baseUnit: string,
  packUnit?: string,
  packConversion?: number
): {
  packCount: number;
  remainder: number;
  summary: string;
  isPackExact: boolean;
  canMakePack: boolean;
} {
  const conv = packConversion && packConversion > 1 ? packConversion : 1;
  const pUnit = packUnit || "Dus";
  const packCount = Math.floor(stock / conv);
  const remainder = stock % conv;
  const canMakePack = packCount > 0;
  const isPackExact = canMakePack && remainder === 0;

  let summary = "";
  if (packCount > 0 && remainder > 0) {
    summary = `${packCount} ${pUnit} + ${remainder} ${baseUnit}`;
  } else if (packCount > 0) {
    summary = `${packCount} ${pUnit} (Pas)`;
  } else {
    summary = `${remainder} ${baseUnit}`;
  }

  return {
    packCount,
    remainder,
    summary,
    isPackExact,
    canMakePack,
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

export function hasCustomDecimalPrices(product?: Product | null): boolean {
  if (!product) return false;
  return Boolean(
    (product.sellPriceQuarter && product.sellPriceQuarter > 0) ||
      (product.sellPriceHalf && product.sellPriceHalf > 0) ||
      (product.sellPriceThreeQuarter && product.sellPriceThreeQuarter > 0)
  );
}

export function calculateProductBaseSubtotal(
  product: Product,
  quantity: number,
  fallbackPricePerUnit?: number
): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const basePrice = fallbackPricePerUnit ?? product.sellPrice ?? 0;
  const whole = Math.floor(safeQty + 1e-9);
  const frac = Math.round((safeQty - whole) * 100) / 100;

  const wholePrice = whole * basePrice;
  let fracPrice = 0;

  if (frac === 0) {
    fracPrice = 0;
  } else if (frac === 0.25 && product.sellPriceQuarter && product.sellPriceQuarter > 0) {
    fracPrice = product.sellPriceQuarter;
  } else if (frac === 0.5 && product.sellPriceHalf && product.sellPriceHalf > 0) {
    fracPrice = product.sellPriceHalf;
  } else if (frac === 0.75) {
    if (product.sellPriceThreeQuarter && product.sellPriceThreeQuarter > 0) {
      fracPrice = product.sellPriceThreeQuarter;
    } else if (
      product.sellPriceHalf &&
      product.sellPriceHalf > 0 &&
      product.sellPriceQuarter &&
      product.sellPriceQuarter > 0
    ) {
      fracPrice = product.sellPriceHalf + product.sellPriceQuarter;
    } else {
      fracPrice = Math.round(0.75 * basePrice);
    }
  } else {
    fracPrice = Math.round(frac * basePrice);
  }

  return Math.round(wholePrice + fracPrice);
}
