import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import {
  Product,
  Transaction,
  StoreSummary,
  TransactionType,
  SaleTransaction,
  KasbonRecord,
  PaymentMethod,
  CartItem,
} from "./types";
import { INITIAL_PRODUCTS, INITIAL_KASBON } from "./seedData";

// File path for local fallback
const DATA_DIR = path.join(process.cwd(), "data");

export interface DatabaseSchema {
  products: Product[];
  transactions: Transaction[];
  sales: SaleTransaction[];
  kasbon: KasbonRecord[];
  lastBackupDate?: string;
}

// In-memory fallback keyed by device ID
const memDbByDevice: Record<string, DatabaseSchema> = {};

function normalizeDeviceId(deviceId?: string): string {
  if (!deviceId || typeof deviceId !== "string" || deviceId.trim() === "") {
    return "default";
  }
  // Sanitize alphanumeric + dash + underscore
  return deviceId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export function getDeviceIdFromRequest(request: Request): string {
  try {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get("deviceId");
    if (fromQuery) return normalizeDeviceId(fromQuery);

    const fromHeader = request.headers.get("x-device-id");
    if (fromHeader) return normalizeDeviceId(fromHeader);

    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/pos_device_id=([^;]+)/);
    if (match && match[1]) {
      return normalizeDeviceId(decodeURIComponent(match[1]));
    }
  } catch {
    // ignore
  }
  return "default";
}

function hasRedisEnv(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
}

function hasBlobEnv(): boolean {
  // Completely disabled in favor of Upstash Redis (avoids Vercel Blob quota limits)
  return false;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!hasRedisEnv()) return null;
  if (!_redis) {
    try {
      const url =
        process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
      const token =
        process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
      if (url && token) {
        _redis = new Redis({ url, token });
      }
    } catch (e) {
      console.warn("Failed to initialize Redis client:", e);
      _redis = null;
    }
  }
  return _redis;
}

function cleanMockSeedProducts(products: Product[]): Product[] {
  if (!Array.isArray(products) || products.length === 0) return [];
  // If the product list is exclusively the mock seed items (prod-1 to prod-15), purge them to empty
  const isSeedOnly = products.every((p) => {
    const num = parseInt(p.id.replace("prod-", ""), 10);
    return !isNaN(num) && num >= 1 && num <= 15 && p.id === `prod-${num}`;
  });
  if (isSeedOnly) return [];
  return products;
}

function cleanOrphanTransactions(
  transactions: Transaction[],
  products: Product[]
): Transaction[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  // If product list is completely empty, purge all transactions to ensure 100% clean zero state
  if (!products || products.length === 0) return [];
  const validProductIds = new Set(products.map((p) => p.id));
  return transactions.filter((t) => validProductIds.has(t.productId));
}

function createInitialState(): DatabaseSchema {
  return {
    products: [],
    transactions: [],
    sales: [],
    kasbon: [],
    lastBackupDate: new Date().toISOString(),
  };
}

// ─── Local File Helpers ───────────────────────────────────────────────────────

function getDbFilePath(deviceId: string): string {
  return path.join(DATA_DIR, `db-${deviceId}.json`);
}

function readLocalDb(deviceId: string): DatabaseSchema {
  const normId = normalizeDeviceId(deviceId);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {
        return memDbByDevice[normId] || (memDbByDevice[normId] = createInitialState());
      }
    }

    const filePath = getDbFilePath(normId);
    if (!fs.existsSync(filePath)) {
      // Legacy fallback: if deviceId is default and db.json exists, load it
      const legacyFile = path.join(DATA_DIR, "db.json");
      if (normId === "default" && fs.existsSync(legacyFile)) {
        try {
          const content = fs.readFileSync(legacyFile, "utf-8");
          const parsed = JSON.parse(content);
          memDbByDevice[normId] = parsed;
          return parsed;
        } catch {
          // fallback
        }
      }

      const initial = createInitialState();
      try {
        fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
      } catch {
        // In-memory fallback
      }
      memDbByDevice[normId] = initial;
      return initial;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    parsed.products = cleanMockSeedProducts(parsed.products || []);
    parsed.transactions = cleanOrphanTransactions(parsed.transactions || [], parsed.products);
    if (!parsed.sales) parsed.sales = [];
    if (!parsed.kasbon) parsed.kasbon = [];
    memDbByDevice[normId] = parsed;
    return parsed;
  } catch {
    return memDbByDevice[normId] || (memDbByDevice[normId] = createInitialState());
  }
}

function writeLocalDb(data: DatabaseSchema, deviceId: string): void {
  const normId = normalizeDeviceId(deviceId);
  memDbByDevice[normId] = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const filePath = getDbFilePath(normId);
    const tempFile = `${filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, filePath);
  } catch {
    // In-memory fallback active
  }
}

// ─── Vercel Blob Helpers ─────────────────────────────────────────────────────

async function readBlobDb(deviceId: string): Promise<DatabaseSchema | null> {
  if (!hasBlobEnv()) return null;
  const normId = normalizeDeviceId(deviceId);
  try {
    const { list } = await import("@vercel/blob");
    const prefix = `sembako-state-${normId}-`;
    const l = await list({ prefix });
    if (!l.blobs || l.blobs.length === 0) {
      const initial = createInitialState();
      await writeBlobDb(initial, normId);
      return initial;
    }

    l.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const latestBlob = l.blobs[0];
    const res = await fetch(latestBlob.url, { cache: "no-store" });
    if (!res.ok) return null;
    const parsed = (await res.json()) as DatabaseSchema;
    parsed.products = cleanMockSeedProducts(parsed.products || []);
    parsed.transactions = cleanOrphanTransactions(parsed.transactions || [], parsed.products);
    if (!parsed.sales) parsed.sales = [];
    if (!parsed.kasbon) parsed.kasbon = [];
    return parsed;
  } catch (err) {
    console.error("readBlobDb error:", err);
    return null;
  }
}

async function writeBlobDb(data: DatabaseSchema, deviceId: string): Promise<void> {
  if (!hasBlobEnv()) return;
  const normId = normalizeDeviceId(deviceId);
  try {
    const { put, list, del } = await import("@vercel/blob");
    const filename = `sembako-state-${normId}-${Date.now()}.json`;
    await put(filename, JSON.stringify(data), { access: "public" });

    // Prune old versions in background (keep latest 3 per device)
    list({ prefix: `sembako-state-${normId}-` })
      .then(async (l) => {
        if (l.blobs && l.blobs.length > 3) {
          l.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const toDelete = l.blobs.slice(3).map((b) => b.url);
          if (toDelete.length > 0) {
            await del(toDelete);
          }
        }
      })
      .catch((e) => console.warn("Blob pruning warning:", e));
  } catch (err) {
    console.error("writeBlobDb error:", err);
  }
}

// ─── Unified Data Layer ───────────────────────────────────────────────────────

export async function getDbState(deviceId?: string): Promise<DatabaseSchema> {
  const normId = normalizeDeviceId(deviceId);

  // 1. Upstash Redis (Cloud Database)
  const redis = getRedis();
  if (redis) {
    try {
      const pKey = `sembako:products:${normId}`;
      const tKey = `sembako:transactions:${normId}`;
      const sKey = `sembako:sales:${normId}`;
      const kKey = `sembako:kasbon:${normId}`;

      const [products, transactions, sales, kasbon] = await Promise.all([
        redis.get<Product[]>(pKey),
        redis.get<Transaction[]>(tKey),
        redis.get<SaleTransaction[]>(sKey),
        redis.get<KasbonRecord[]>(kKey),
      ]);
      if (products !== null && products !== undefined) {
        const cleanedProducts = cleanMockSeedProducts(products);
        return {
          products: cleanedProducts,
          transactions: cleanOrphanTransactions(transactions || [], cleanedProducts),
          sales: sales || [],
          kasbon: kasbon || [],
          lastBackupDate: new Date().toISOString(),
        };
      } else {
        // Initialize clean state in Redis for new device partition
        const initial = createInitialState();
        await Promise.all([
          redis.set(pKey, initial.products),
          redis.set(tKey, initial.transactions),
          redis.set(sKey, initial.sales),
          redis.set(kKey, initial.kasbon),
        ]);
        return initial;
      }
    } catch (e) {
      console.warn("Redis getDbState error:", e);
    }
  }

  // 2. Local fallback
  return readLocalDb(normId);
}

export async function saveDbState(data: DatabaseSchema, deviceId?: string): Promise<void> {
  const normId = normalizeDeviceId(deviceId);
  memDbByDevice[normId] = data;

  // 1. Upstash Redis (Cloud Database)
  const redis = getRedis();
  if (redis) {
    try {
      const pKey = `sembako:products:${normId}`;
      const tKey = `sembako:transactions:${normId}`;
      const sKey = `sembako:sales:${normId}`;
      const kKey = `sembako:kasbon:${normId}`;

      await Promise.all([
        redis.set(pKey, data.products),
        redis.set(tKey, data.transactions || []),
        redis.set(sKey, data.sales || []),
        redis.set(kKey, data.kasbon || []),
      ]);
      // Also update local mem/file for dev offline backup
      writeLocalDb(data, normId);
      return; // Early return: NEVER touch Vercel Blob!
    } catch (e) {
      console.warn("Redis saveDbState error:", e);
    }
  }

  // 2. Local file
  writeLocalDb(data, normId);
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProducts(deviceId?: string): Promise<Product[]> {
  const db = await getDbState(deviceId);
  return (db.products || []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductById(id: string, deviceId?: string): Promise<Product | undefined> {
  const products = await getProducts(deviceId);
  return products.find((p) => p.id === id);
}

export async function addProduct(
  productData: Omit<Product, "id" | "createdAt" | "updatedAt">,
  deviceId?: string
): Promise<Product> {
  const db = await getDbState(deviceId);
  const newProduct: Product = {
    ...productData,
    id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.products.push(newProduct);
  await saveDbState(db, deviceId);
  return newProduct;
}

export async function updateProduct(
  id: string,
  updateData: Partial<Omit<Product, "id" | "createdAt">>,
  deviceId?: string
): Promise<Product | null> {
  const db = await getDbState(deviceId);
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  db.products[index] = {
    ...db.products[index],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  await saveDbState(db, deviceId);
  return db.products[index];
}

export async function deleteProduct(id: string, deviceId?: string): Promise<boolean> {
  const db = await getDbState(deviceId);
  const initialLength = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);
  if (db.products.length !== initialLength) {
    await saveDbState(db, deviceId);
    return true;
  }
  return false;
}

// ─── Single Stock Mutation (Kulakan / Koreksi) ────────────────────────────────

export interface MutateStockInput {
  productId: string;
  type: TransactionType;
  unitUsed: "BASE" | "PACK";
  quantityInput: number;
  note?: string;
  newCostPrice?: number;
}

export async function recordStockMutation(
  input: MutateStockInput,
  deviceId?: string
): Promise<{
  product: Product;
  transaction: Transaction;
} | null> {
  const db = await getDbState(deviceId);
  const productIndex = db.products.findIndex((p) => p.id === input.productId);
  if (productIndex === -1) return null;

  const product = { ...db.products[productIndex] };
  const conversion =
    product.hasMultiUnit && product.packConversion ? product.packConversion : 1;
  const quantityInBase =
    input.unitUsed === "PACK"
      ? input.quantityInput * conversion
      : input.quantityInput;

  const stockBefore = product.stockInBase;
  let stockAfter = stockBefore;

  if (input.type === "IN") {
    stockAfter = stockBefore + quantityInBase;
  } else if (input.type === "OUT") {
    stockAfter = Math.max(0, stockBefore - quantityInBase);
  } else if (input.type === "ADJUST") {
    stockAfter = quantityInBase;
  }

  if (input.newCostPrice && input.newCostPrice > 0 && input.type === "IN") {
    if (input.unitUsed === "PACK") {
      product.costPricePack = input.newCostPrice;
      product.costPrice = Math.round(input.newCostPrice / conversion);
    } else {
      product.costPrice = input.newCostPrice;
      if (product.hasMultiUnit) {
        product.costPricePack = input.newCostPrice * conversion;
      }
    }
  }

  product.stockInBase = stockAfter;
  product.updatedAt = new Date().toISOString();

  const pricePerUnit =
    input.unitUsed === "PACK"
      ? input.type === "IN"
        ? product.costPricePack || product.costPrice * conversion
        : product.sellPricePack || product.sellPrice * conversion
      : input.type === "IN"
      ? product.costPrice
      : product.sellPrice;

  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: product.id,
    productName: product.name,
    type: input.type,
    quantityInBase,
    unitUsed: input.unitUsed,
    quantityInput: input.quantityInput,
    pricePerUnit,
    totalPrice: pricePerUnit * input.quantityInput,
    note:
      input.note ||
      (input.type === "IN"
        ? "Kulakan / Barang Masuk"
        : input.type === "OUT"
        ? "Barang Keluar / Terjual"
        : "Penyesuaian Fisik"),
    stockBefore,
    stockAfter,
    createdAt: new Date().toISOString(),
  };

  db.products[productIndex] = product;
  if (!db.transactions) db.transactions = [];
  db.transactions.unshift(newTx);
  if (db.transactions.length > 1000) {
    db.transactions = db.transactions.slice(0, 1000);
  }

  await saveDbState(db, deviceId);
  return { product, transaction: newTx };
}

// ─── POS Sale Checkout (Kasir Pintar Checkout) ────────────────────────────────

export interface CreateSaleInput {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerName?: string;
  cashierName?: string;
  notes?: string;
  dueDate?: string; // Untuk Kasbon
}

export async function processSale(
  input: CreateSaleInput,
  deviceId?: string
): Promise<{
  sale: SaleTransaction;
  kasbon?: KasbonRecord;
}> {
  const db = await getDbState(deviceId);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const receiptNo = `NOTA-${dateStr}-${randomSuffix}`;
  const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let totalAmount = 0;
  let totalCost = 0;
  const newTransactions: Transaction[] = [];

  const saleItems = input.items.map((cartItem: any) => {
    const rawProdId =
      cartItem.product?.id ||
      cartItem.productId ||
      (typeof cartItem.product === "string" ? cartItem.product : "");
    const pIndex = db.products.findIndex((p) => p.id === rawProdId);
    const prod =
      pIndex !== -1
        ? db.products[pIndex]
        : cartItem.product || {
            id: rawProdId || `prod-custom-${Date.now()}`,
            name: cartItem.productName || cartItem.product?.name || "Barang Sembako",
            category: "lainnya",
            baseUnit: "Pcs",
            hasMultiUnit: false,
            stockInBase: 0,
            costPrice: 0,
            sellPrice: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };

    const conversion =
      prod.hasMultiUnit && prod.packConversion ? prod.packConversion : 1;
    const unitUsed: "BASE" | "PACK" =
      cartItem.unitUsed === "PACK" ? "PACK" : "BASE";
    const quantity = Number(cartItem.quantity || cartItem.qty) || 1;
    const qtyInBase =
      unitUsed === "PACK" ? quantity * conversion : quantity;

    // Hitung cost price modal
    const costPerUnit =
      unitUsed === "PACK"
        ? prod.costPricePack || prod.costPrice * conversion
        : prod.costPrice;

    const pricePerUnit =
      Number(cartItem.pricePerUnit) ||
      (unitUsed === "PACK" && prod.sellPricePack
        ? prod.sellPricePack
        : prod.sellPrice);

    const itemSubtotal = pricePerUnit * quantity;
    const itemCost = costPerUnit * quantity;

    totalAmount += itemSubtotal;
    totalCost += itemCost;

    if (pIndex !== -1) {
      const stockBefore = db.products[pIndex].stockInBase;
      const stockAfter = Math.max(0, stockBefore - qtyInBase);
      db.products[pIndex].stockInBase = stockAfter;
      db.products[pIndex].updatedAt = now.toISOString();

      newTransactions.push({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        productId: prod.id,
        productName: prod.name,
        type: "SALE",
        quantityInBase: qtyInBase,
        unitUsed,
        quantityInput: quantity,
        pricePerUnit,
        totalPrice: itemSubtotal,
        note: `Penjualan Kasir (${receiptNo})${
          input.customerName ? ` - ${input.customerName}` : ""
        }`,
        stockBefore,
        stockAfter,
        createdAt: now.toISOString(),
      });
    }

    return {
      productId: prod.id,
      productName: prod.name,
      quantity,
      unitUsed,
      unitLabel:
        unitUsed === "PACK"
          ? prod.packUnit || "Dus"
          : prod.baseUnit || "Pcs",
      pricePerUnit,
      costPricePerUnit: costPerUnit,
      subtotal: itemSubtotal,
    };
  });

  const profit = totalAmount - totalCost;
  const changeAmount =
    input.paymentMethod === "KASBON"
      ? 0
      : Math.max(0, input.amountPaid - totalAmount);

  const sale: SaleTransaction = {
    id: saleId,
    receiptNo,
    items: saleItems,
    totalAmount,
    totalCost,
    profit,
    paymentMethod: input.paymentMethod,
    amountPaid: input.paymentMethod === "KASBON" ? 0 : input.amountPaid,
    changeAmount,
    customerName:
      input.customerName ||
      (input.paymentMethod === "KASBON" ? "Pelanggan Bon" : "Pelanggan Umum"),
    cashierName: input.cashierName || "Kasir Dewi",
    notes: input.notes,
    createdAt: now.toISOString(),
  };

  let kasbonRecord: KasbonRecord | undefined;
  if (input.paymentMethod === "KASBON") {
    const summaryStr =
      saleItems
        .map((it) => `${it.productName} (${it.quantity} ${it.unitLabel})`)
        .slice(0, 3)
        .join(", ") + (saleItems.length > 3 ? "..." : "");

    kasbonRecord = {
      id: `bon-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      saleId: sale.id,
      customerName: input.customerName?.trim() || "Pelanggan Bon",
      itemsSummary: summaryStr,
      amount: totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: "BELUM_LUNAS",
      dueDate:
        input.dueDate ||
        new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      notes: input.notes || "Kasbon belanja sembako",
      createdAt: now.toISOString(),
    };
  }

  if (!db.sales) db.sales = [];
  db.sales.unshift(sale);
  if (db.sales.length > 1000) db.sales = db.sales.slice(0, 1000);

  if (!db.transactions) db.transactions = [];
  db.transactions = [...newTransactions, ...db.transactions].slice(0, 1000);

  if (kasbonRecord) {
    if (!db.kasbon) db.kasbon = [];
    db.kasbon.unshift(kasbonRecord);
  }

  await saveDbState(db, deviceId);
  return { sale, kasbon: kasbonRecord };
}

export async function getSales(limit = 100, deviceId?: string): Promise<SaleTransaction[]> {
  const db = await getDbState(deviceId);
  return (db.sales || []).slice(0, limit);
}

export async function deleteSale(
  id: string,
  restoreStock = true,
  deviceId?: string
): Promise<boolean> {
  const db = await getDbState(deviceId);
  if (!db.sales) return false;
  const index = db.sales.findIndex((s) => s.id === id);
  if (index === -1) return false;
  const sale = db.sales[index];

  // Kembalikan stok produk jika diminta
  if (restoreStock && sale.items && db.products) {
    for (const item of sale.items) {
      const prodIndex = db.products.findIndex((p) => p.id === item.productId);
      if (prodIndex !== -1) {
        const prod = db.products[prodIndex];
        const baseQty =
          item.unitUsed === "PACK" && prod.packConversion
            ? item.quantity * prod.packConversion
            : item.quantity;
        prod.stockInBase += baseQty;
        prod.updatedAt = new Date().toISOString();
      }
    }
  }

  // Hapus data kasbon yang terikat dengan penjualan ini (jika ada)
  if (db.kasbon) {
    db.kasbon = db.kasbon.filter((b) => b.saleId !== id);
  }

  db.sales.splice(index, 1);
  await saveDbState(db, deviceId);
  return true;
}

// ─── Kasbon (Buku Hutang Pelanggan) ──────────────────────────────────────────

export async function getKasbonList(deviceId?: string): Promise<KasbonRecord[]> {
  const db = await getDbState(deviceId);
  return db.kasbon || INITIAL_KASBON;
}

export async function addKasbonManual(
  data: Omit<
    KasbonRecord,
    "id" | "status" | "createdAt" | "paidAmount" | "remainingAmount"
  >,
  deviceId?: string
): Promise<KasbonRecord> {
  const db = await getDbState(deviceId);
  const newBon: KasbonRecord = {
    ...data,
    id: `bon-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paidAmount: 0,
    remainingAmount: data.amount,
    status: "BELUM_LUNAS",
    createdAt: new Date().toISOString(),
  };

  if (!db.kasbon) db.kasbon = [];
  db.kasbon.unshift(newBon);
  await saveDbState(db, deviceId);
  return newBon;
}

export async function payKasbon(
  id: string,
  amountToPay: number,
  deviceId?: string
): Promise<KasbonRecord | null> {
  const db = await getDbState(deviceId);
  if (!db.kasbon) db.kasbon = [...INITIAL_KASBON];
  const index = db.kasbon.findIndex((b) => b.id === id);
  if (index === -1) return null;

  const bon = { ...db.kasbon[index] };
  const newPaid = (bon.paidAmount || 0) + amountToPay;
  const newRemaining = Math.max(0, bon.amount - newPaid);

  bon.paidAmount = newPaid;
  bon.remainingAmount = newRemaining;
  if (newRemaining <= 0) {
    bon.status = "LUNAS";
    bon.paidAt = new Date().toISOString();
  }

  db.kasbon[index] = bon;
  await saveDbState(db, deviceId);
  return bon;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(
  limit = 100,
  productId?: string,
  deviceId?: string
): Promise<Transaction[]> {
  const db = await getDbState(deviceId);
  let list = db.transactions || [];
  if (productId) {
    list = list.filter((t) => t.productId === productId);
  }
  return list.slice(0, limit);
}

export async function clearAllTransactions(deviceId?: string): Promise<void> {
  const db = await getDbState(deviceId);
  db.transactions = [];
  await saveDbState(db, deviceId);
}

export async function deleteTransaction(
  id: string,
  deviceId?: string
): Promise<boolean> {
  const db = await getDbState(deviceId);
  if (!db.transactions) return false;
  const initialLen = db.transactions.length;
  db.transactions = db.transactions.filter((t) => t.id !== id);
  if (db.transactions.length !== initialLen) {
    await saveDbState(db, deviceId);
    return true;
  }
  return false;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getStoreSummary(deviceId?: string): Promise<StoreSummary> {
  const [products, sales, kasbonList] = await Promise.all([
    getProducts(deviceId),
    getSales(500, deviceId),
    getKasbonList(deviceId),
  ]);

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalAssetValue = 0;
  let totalPotentialRevenue = 0;

  for (const p of products) {
    const stock = p.stockInBase || 0;
    if (stock <= 0) {
      outOfStockCount++;
    } else if (stock <= (p.minStockInBase || 5)) {
      lowStockCount++;
    }
    if (stock > 0) {
      totalAssetValue += stock * (p.costPrice || 0);
      totalPotentialRevenue += stock * (p.sellPrice || 0);
    }
  }

  // Hitung omzet & laba hari ini
  const todayStr = new Date().toISOString().slice(0, 10);
  let todaySales = 0;
  let todayProfit = 0;
  let todayOrderCount = 0;

  for (const s of sales) {
    if (s.createdAt && s.createdAt.startsWith(todayStr)) {
      todaySales += s.totalAmount || 0;
      todayProfit += s.profit || 0;
      todayOrderCount++;
    }
  }

  // Hitung total kasbon belum lunas
  let totalKasbon = 0;
  for (const b of kasbonList) {
    if (b.status === "BELUM_LUNAS") {
      totalKasbon += b.remainingAmount || 0;
    }
  }

  return {
    totalItems: products.length,
    lowStockCount,
    outOfStockCount,
    totalAssetValue,
    totalPotentialRevenue,
    todaySales,
    todayProfit,
    todayOrderCount,
    totalKasbon,
  };
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function resetDatabaseToDefault(deviceId?: string): Promise<void> {
  const db = createInitialState();
  await saveDbState(db, deviceId);
}

export async function getRawDatabase(deviceId?: string): Promise<{
  products: Product[];
  transactions: Transaction[];
  sales: SaleTransaction[];
  kasbon: KasbonRecord[];
  lastBackupDate?: string;
}> {
  const db = await getDbState(deviceId);
  return {
    products: db.products || [],
    transactions: db.transactions || [],
    sales: db.sales || [],
    kasbon: db.kasbon || [],
    lastBackupDate: db.lastBackupDate || new Date().toISOString(),
  };
}

export async function restoreDatabase(
  data: {
    products: Product[];
    transactions: Transaction[];
    sales?: SaleTransaction[];
    kasbon?: KasbonRecord[];
  },
  deviceId?: string
): Promise<boolean> {
  if (!data || !Array.isArray(data.products)) return false;

  const db: DatabaseSchema = {
    products: data.products,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    sales: Array.isArray(data.sales) ? data.sales : [],
    kasbon: Array.isArray(data.kasbon) ? data.kasbon : INITIAL_KASBON,
    lastBackupDate: new Date().toISOString(),
  };

  await saveDbState(db, deviceId);
  return true;
}
