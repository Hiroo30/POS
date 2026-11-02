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

// Keys for Redis (if enabled)
const PRODUCTS_KEY = "sembako:products";
const TRANSACTIONS_KEY = "sembako:transactions";
const SALES_KEY = "sembako:sales";
const KASBON_KEY = "sembako:kasbon";

// File path for local fallback
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface DatabaseSchema {
  products: Product[];
  transactions: Transaction[];
  sales: SaleTransaction[];
  kasbon: KasbonRecord[];
  lastBackupDate?: string;
}

// In-memory fallback
let memDb: DatabaseSchema = {
  products: INITIAL_PRODUCTS,
  transactions: [],
  sales: [],
  kasbon: INITIAL_KASBON,
  lastBackupDate: new Date().toISOString(),
};

function hasRedisEnv(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
}

function hasBlobEnv(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL_OIDC_TOKEN
  );
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

// ─── Local File Helpers ───────────────────────────────────────────────────────

function readLocalDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {
        return memDb;
      }
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = {
        products: INITIAL_PRODUCTS,
        transactions: [],
        sales: [],
        kasbon: INITIAL_KASBON,
        lastBackupDate: new Date().toISOString(),
      };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      } catch {
        memDb = initial;
      }
      return initial;
    }

    const content = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (!parsed.products || parsed.products.length === 0) parsed.products = INITIAL_PRODUCTS;
    if (!parsed.transactions) parsed.transactions = [];
    if (!parsed.sales) parsed.sales = [];
    if (!parsed.kasbon) parsed.kasbon = INITIAL_KASBON;
    return parsed;
  } catch {
    return memDb;
  }
}

function writeLocalDb(data: DatabaseSchema): void {
  memDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch {
    // In-memory fallback active
  }
}

// ─── Vercel Blob Helpers ─────────────────────────────────────────────────────

async function readBlobDb(): Promise<DatabaseSchema | null> {
  if (!hasBlobEnv()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const l = await list({ prefix: "sembako-state-" });
    if (!l.blobs || l.blobs.length === 0) {
      const initial: DatabaseSchema = {
        products: INITIAL_PRODUCTS,
        transactions: [],
        sales: [],
        kasbon: INITIAL_KASBON,
        lastBackupDate: new Date().toISOString(),
      };
      await writeBlobDb(initial);
      return initial;
    }

    l.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const latestBlob = l.blobs[0];
    const res = await fetch(latestBlob.url, { cache: "no-store" });
    if (!res.ok) return null;
    const parsed = (await res.json()) as DatabaseSchema;
    if (!parsed.products || parsed.products.length === 0) parsed.products = INITIAL_PRODUCTS;
    if (!parsed.transactions) parsed.transactions = [];
    if (!parsed.sales) parsed.sales = [];
    if (!parsed.kasbon) parsed.kasbon = INITIAL_KASBON;
    return parsed;
  } catch (err) {
    console.error("readBlobDb error:", err);
    return null;
  }
}

async function writeBlobDb(data: DatabaseSchema): Promise<void> {
  if (!hasBlobEnv()) return;
  try {
    const { put, list, del } = await import("@vercel/blob");
    const filename = `sembako-state-${Date.now()}.json`;
    await put(filename, JSON.stringify(data), { access: "public" });

    // Prune old versions in background (keep latest 3)
    list({ prefix: "sembako-state-" })
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

export async function getDbState(): Promise<DatabaseSchema> {
  // 1. Redis
  const redis = getRedis();
  if (redis) {
    try {
      const [products, transactions, sales, kasbon] = await Promise.all([
        redis.get<Product[]>(PRODUCTS_KEY),
        redis.get<Transaction[]>(TRANSACTIONS_KEY),
        redis.get<SaleTransaction[]>(SALES_KEY),
        redis.get<KasbonRecord[]>(KASBON_KEY),
      ]);
      if (products && products.length > 0) {
        return {
          products,
          transactions: transactions || [],
          sales: sales || [],
          kasbon: kasbon || INITIAL_KASBON,
          lastBackupDate: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn("Redis getDbState error:", e);
    }
  }

  // 2. Vercel Blob
  if (hasBlobEnv()) {
    const blobData = await readBlobDb();
    if (blobData) return blobData;
  }

  // 3. Local fallback
  return readLocalDb();
}

export async function saveDbState(data: DatabaseSchema): Promise<void> {
  memDb = data;

  // 1. Redis
  const redis = getRedis();
  if (redis) {
    try {
      await Promise.all([
        redis.set(PRODUCTS_KEY, data.products),
        redis.set(TRANSACTIONS_KEY, data.transactions || []),
        redis.set(SALES_KEY, data.sales || []),
        redis.set(KASBON_KEY, data.kasbon || []),
      ]);
    } catch (e) {
      console.warn("Redis saveDbState error:", e);
    }
  }

  // 2. Vercel Blob
  if (hasBlobEnv()) {
    try {
      await writeBlobDb(data);
    } catch (e) {
      console.warn("Vercel Blob saveDbState error:", e);
    }
  }

  // 3. Local file
  writeLocalDb(data);
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const db = await getDbState();
  return (db.products || []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}

export async function addProduct(
  productData: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  const db = await getDbState();
  const newProduct: Product = {
    ...productData,
    id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.products.push(newProduct);
  await saveDbState(db);
  return newProduct;
}

export async function updateProduct(
  id: string,
  updateData: Partial<Omit<Product, "id" | "createdAt">>
): Promise<Product | null> {
  const db = await getDbState();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  db.products[index] = {
    ...db.products[index],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  await saveDbState(db);
  return db.products[index];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = await getDbState();
  const initialLength = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);
  if (db.products.length !== initialLength) {
    await saveDbState(db);
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

export async function recordStockMutation(input: MutateStockInput): Promise<{
  product: Product;
  transaction: Transaction;
} | null> {
  const db = await getDbState();
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

  await saveDbState(db);
  return { product, transaction: newTx };
}

// ─── POS Sale Checkout (Kasir Pintar Checkout) ────────────────────────────────

export interface CreateSaleInput {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerName?: string;
  notes?: string;
  dueDate?: string; // Untuk Kasbon
}

export async function processSale(input: CreateSaleInput): Promise<{
  sale: SaleTransaction;
  kasbon?: KasbonRecord;
}> {
  const db = await getDbState();
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

  await saveDbState(db);
  return { sale, kasbon: kasbonRecord };
}

export async function getSales(limit = 100): Promise<SaleTransaction[]> {
  const db = await getDbState();
  return (db.sales || []).slice(0, limit);
}

// ─── Kasbon (Buku Hutang Pelanggan) ──────────────────────────────────────────

export async function getKasbonList(): Promise<KasbonRecord[]> {
  const db = await getDbState();
  return db.kasbon || INITIAL_KASBON;
}

export async function addKasbonManual(
  data: Omit<
    KasbonRecord,
    "id" | "status" | "createdAt" | "paidAmount" | "remainingAmount"
  >
): Promise<KasbonRecord> {
  const db = await getDbState();
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
  await saveDbState(db);
  return newBon;
}

export async function payKasbon(
  id: string,
  amountToPay: number
): Promise<KasbonRecord | null> {
  const db = await getDbState();
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
  await saveDbState(db);
  return bon;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(
  limit = 100,
  productId?: string
): Promise<Transaction[]> {
  const db = await getDbState();
  let list = db.transactions || [];
  if (productId) {
    list = list.filter((t) => t.productId === productId);
  }
  return list.slice(0, limit);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getStoreSummary(): Promise<StoreSummary> {
  const [products, sales, kasbonList] = await Promise.all([
    getProducts(),
    getSales(500),
    getKasbonList(),
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

export async function resetDatabaseToDefault(): Promise<void> {
  const db: DatabaseSchema = {
    products: INITIAL_PRODUCTS,
    transactions: [],
    sales: [],
    kasbon: INITIAL_KASBON,
    lastBackupDate: new Date().toISOString(),
  };
  await saveDbState(db);
}

export async function getRawDatabase(): Promise<{
  products: Product[];
  transactions: Transaction[];
  sales: SaleTransaction[];
  kasbon: KasbonRecord[];
  lastBackupDate?: string;
}> {
  const db = await getDbState();
  return {
    products: db.products || [],
    transactions: db.transactions || [],
    sales: db.sales || [],
    kasbon: db.kasbon || [],
    lastBackupDate: db.lastBackupDate || new Date().toISOString(),
  };
}

export async function restoreDatabase(data: {
  products: Product[];
  transactions: Transaction[];
  sales?: SaleTransaction[];
  kasbon?: KasbonRecord[];
}): Promise<boolean> {
  if (!data || !Array.isArray(data.products)) return false;

  const db: DatabaseSchema = {
    products: data.products,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    sales: Array.isArray(data.sales) ? data.sales : [],
    kasbon: Array.isArray(data.kasbon) ? data.kasbon : INITIAL_KASBON,
    lastBackupDate: new Date().toISOString(),
  };

  await saveDbState(db);
  return true;
}
