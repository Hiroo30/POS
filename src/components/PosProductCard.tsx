"use client";

import { useState } from "react";
import type { Product, CartItem } from "@/lib/types";
import CategoryIcon from "./CategoryIcon";

interface Props {
  product: Product;
  onAddToCart: (product: Product, unitUsed: "BASE" | "PACK") => void;
  cartItems: CartItem[];
}

function formatRupiah(n: number) {
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "jt";
  if (n >= 1_000) return "Rp " + (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "rb";
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PosProductCard({ product, onAddToCart, cartItems }: Props) {
  const [selectedUnit, setSelectedUnit] = useState<"BASE" | "PACK">("BASE");

  const inCart = cartItems.find(
    (it) => it.product.id === product.id && it.unitUsed === selectedUnit
  );

  const price = selectedUnit === "PACK" && product.hasMultiUnit && product.sellPricePack
    ? product.sellPricePack
    : product.sellPrice;

  const unitLabel = selectedUnit === "PACK" && product.hasMultiUnit
    ? `/${product.packUnit ?? "Pak"}`
    : `/${product.baseUnit}`;

  const isOutOfStock = product.stockInBase === 0;
  const isLowStock = !isOutOfStock && product.stockInBase <= (product.minStockInBase ?? 5);

  let stockBadgeClass = "kp-product-stock-badge ok";
  let stockLabel = `Stok: ${product.stockInBase} ${product.baseUnit}`;
  if (isOutOfStock) {
    stockBadgeClass = "kp-product-stock-badge out";
    stockLabel = "Habis";
  } else if (isLowStock) {
    stockBadgeClass = "kp-product-stock-badge low";
    stockLabel = `Sisa ${product.stockInBase}`;
  }

  return (
    <div className="kp-product-card">
      {/* Cart indicator */}
      {inCart && (
        <div style={{
          position:"absolute", top:6, right:6,
          background:"#16a34a", color:"#fff",
          borderRadius:"50%", width:18, height:18,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:10, fontWeight:800, boxShadow:"0 1px 4px rgba(22,163,74,0.4)"
        }}>
          {inCart.quantity}
        </div>
      )}

      {/* Icon */}
      <div className="kp-product-icon-box">
        <CategoryIcon category={product.category} size={24} />
      </div>

      {/* Name */}
      <div className="kp-product-name">{product.name}</div>

      {/* Stock */}
      <div className={stockBadgeClass}>{stockLabel}</div>

      {/* Unit toggle */}
      {product.hasMultiUnit && product.packUnit && (
        <div className="kp-product-unit-toggle">
          <button
            className={`kp-product-unit-btn ${selectedUnit === "BASE" ? "active" : ""}`}
            onClick={() => setSelectedUnit("BASE")}
          >
            {product.baseUnit}
          </button>
          <button
            className={`kp-product-unit-btn ${selectedUnit === "PACK" ? "active" : ""}`}
            onClick={() => setSelectedUnit("PACK")}
          >
            {product.packUnit}
          </button>
        </div>
      )}

      {/* Price */}
      <div className="kp-product-price">
        {formatRupiah(price)}
        <span style={{fontSize:10, fontWeight:500, color:"#94a3b8"}}>{unitLabel}</span>
      </div>

      {/* Add button */}
      <button
        className="kp-add-btn"
        onClick={() => onAddToCart(product, selectedUnit)}
        disabled={isOutOfStock}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {isOutOfStock ? "Stok Habis" : "Tambah"}
      </button>
    </div>
  );
}
