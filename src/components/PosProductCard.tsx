"use client";

import { useState } from "react";
import type { Product, CartItem } from "@/lib/types";
import CategoryIcon from "./CategoryIcon";

interface Props {
  product: Product;
  onAddToCart: (product: Product, unitUsed: "BASE" | "PACK", customQty?: number) => void;
  cartItems: CartItem[];
}

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
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
    ? `${product.packUnit ?? "Pak"}`
    : `${product.baseUnit}`;

  const conversion = product.hasMultiUnit && product.packConversion ? product.packConversion : 1;
  const packsAvailable = Math.floor(product.stockInBase / conversion);
  const remainderBase = product.stockInBase % conversion;

  const isOutOfStock = product.stockInBase <= 0;
  const isLowStock = !isOutOfStock && product.stockInBase <= (product.minStockInBase ?? 5);
  const isPackOutOfStock = selectedUnit === "PACK" && packsAvailable <= 0;
  const isDisabled = isOutOfStock || (selectedUnit === "PACK" && isPackOutOfStock);

  let stockBadgeStyle = { background: "#dcfce7", color: "#15803d" };
  let stockLabel = `Stok: ${product.stockInBase} ${product.baseUnit}`;

  if (isOutOfStock) {
    stockBadgeStyle = { background: "#fee2e2", color: "#dc2626" };
    stockLabel = "Habis";
  } else if (selectedUnit === "PACK" && product.hasMultiUnit) {
    if (isPackOutOfStock) {
      stockBadgeStyle = { background: "#fee2e2", color: "#dc2626" };
      stockLabel = `Kurang 1 ${product.packUnit} (sisa ${product.stockInBase} ${product.baseUnit})`;
    } else {
      stockBadgeStyle = { background: "#dcfce7", color: "#15803d" };
      stockLabel = `Stok: ${packsAvailable} ${product.packUnit}${remainderBase > 0 ? ` (+${remainderBase})` : ""}`;
    }
  } else if (isLowStock) {
    stockBadgeStyle = { background: "#fef3c7", color: "#b45309" };
    stockLabel = `Sisa ${product.stockInBase} ${product.baseUnit}`;
  } else if (product.hasMultiUnit && product.packConversion && product.packConversion > 1) {
    stockLabel = `${product.stockInBase} ${product.baseUnit} (≈${packsAvailable} ${product.packUnit})`;
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 14,
        padding: "12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top badges & Cart Count */}
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8}}>
        <span style={{
          fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.5, color: "#64748b"
        }}>
          {product.category}
        </span>
        <div style={{display: "flex", alignItems: "center", gap: 6}}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px",
            borderRadius: 6, ...stockBadgeStyle
          }}>
            {stockLabel}
          </span>
          {inCart && (
            <span style={{
              background: "#10b981", color: "#fff",
              borderRadius: "50%", width: 20, height: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, boxShadow: "0 2px 6px rgba(16,185,129,0.3)"
            }}>
              {inCart.quantity}
            </span>
          )}
        </div>
      </div>

      {/* Image or Icon Container */}
      <div style={{
        position: "relative",
        width: "100%",
        height: 100,
        borderRadius: 10,
        overflow: "hidden",
        background: "#f8fafc",
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{width: "100%", height: "100%", objectFit: "cover"}}
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#f0fdf4", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#16a34a"
          }}>
            <CategoryIcon category={product.category} size={28} />
          </div>
        )}
      </div>

      {/* Product Title */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: "#0f172a",
        lineHeight: 1.3, minHeight: 34,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden", marginBottom: 6
      }}>
        {product.name}
      </div>

      {/* Multi-unit Switcher (Kg / Sak or Bks / Dus) */}
      {product.hasMultiUnit && product.packUnit ? (
        <div style={{
          display: "flex", background: "#f1f5f9",
          padding: 2, borderRadius: 8, marginBottom: 8
        }}>
          <button
            type="button"
            onClick={() => setSelectedUnit("BASE")}
            style={{
              flex: 1, border: "none", borderRadius: 6,
              padding: "4px 0", fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              background: selectedUnit === "BASE" ? "#ffffff" : "transparent",
              color: selectedUnit === "BASE" ? "#0f172a" : "#64748b",
              boxShadow: selectedUnit === "BASE" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {product.baseUnit}
          </button>
          <button
            type="button"
            onClick={() => setSelectedUnit("PACK")}
            style={{
              flex: 1, border: "none", borderRadius: 6,
              padding: "4px 0", fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              background: selectedUnit === "PACK" ? "#ffffff" : "transparent",
              color: selectedUnit === "PACK" ? "#0f172a" : "#64748b",
              boxShadow: selectedUnit === "PACK" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {product.packUnit} (×{product.packConversion})
          </button>
        </div>
      ) : (
        <div style={{height: 28, marginBottom: 4}} />
      )}

      {/* Price & Add Button */}
      <div style={{marginTop: "auto"}}>
        <div style={{display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4}}>
          <span style={{fontSize: 15, fontWeight: 800, color: "#006c49"}}>
            {formatRupiah(price)}
          </span>
          <span style={{fontSize: 10.5, color: "#64748b", fontWeight: 600}}>
            /{unitLabel}
          </span>
        </div>

        {/* Multi-unit conversion indicator */}
        {product.hasMultiUnit && product.packUnit && product.packConversion && (
          <div style={{
            fontSize: 10,
            color: selectedUnit === "PACK" ? "#16a34a" : "#64748b",
            background: selectedUnit === "PACK" ? "#f0fdf4" : "#f8fafc",
            padding: "2px 6px",
            borderRadius: 5,
            marginBottom: 6,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            {selectedUnit === "PACK" ? (
              <>
                <span>1 {product.packUnit} = {conversion} {product.baseUnit}</span>
                <span style={{color: "#059669"}}>Rp {Math.round(price / conversion).toLocaleString("id-ID")}/{product.baseUnit}</span>
              </>
            ) : (
              <>
                <span>Grosir: {product.packUnit} (×{conversion})</span>
                <span style={{color: "#0284c7"}}>{formatRupiah(product.sellPricePack ?? (product.sellPrice * conversion))}</span>
              </>
            )}
          </div>
        )}

        {/* Custom Decimal Prices Quick Buttons (1/4, 1/2, 3/4) */}
        {selectedUnit === "BASE" &&
          (product.sellPriceQuarter || product.sellPriceHalf || product.sellPriceThreeQuarter) && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 7,
                padding: "4px 6px",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#166534",
                  marginBottom: 3,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>⚖️ HARGA ECER DESIMAL:</span>
                <span>Klik +Keranjang</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                {[
                  { label: "1/4", qty: 0.25, price: product.sellPriceQuarter },
                  { label: "1/2", qty: 0.5, price: product.sellPriceHalf },
                  { label: "3/4", qty: 0.75, price: product.sellPriceThreeQuarter },
                ].map((dec) => {
                  const effPrice =
                    dec.price && dec.price > 0
                      ? dec.price
                      : Math.round(product.sellPrice * dec.qty);
                  const canAdd = product.stockInBase >= dec.qty;
                  return (
                    <button
                      key={dec.label}
                      type="button"
                      disabled={!canAdd}
                      onClick={() => onAddToCart(product, "BASE", dec.qty)}
                      title={`Tambah ${dec.label} ${product.baseUnit} (${formatRupiah(effPrice)})`}
                      style={{
                        border: dec.price ? "1px solid #86efac" : "1px solid #e2e8f0",
                        background: canAdd ? "#ffffff" : "#f1f5f9",
                        borderRadius: 5,
                        padding: "2px 3px",
                        cursor: canAdd ? "pointer" : "not-allowed",
                        opacity: canAdd ? 1 : 0.5,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: "#15803d" }}>
                        +{dec.label}
                      </div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: "#0f172a" }}>
                        {effPrice >= 1000
                          ? `${(effPrice / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}rb`
                          : `${effPrice}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onAddToCart(product, selectedUnit, 1)}
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            background: isDisabled ? "#e2e8f0" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: isDisabled ? "#94a3b8" : "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            cursor: isDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: isDisabled ? "none" : "0 2px 6px rgba(16,185,129,0.25)",
            transition: "all 0.15s ease",
          }}
        >
          {!isDisabled && (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
          {isDisabled ? (isOutOfStock ? "Stok Habis" : `Stok ${product.packUnit || "Dus"} Kurang`) : "Tambah"}
        </button>
      </div>
    </div>
  );
}
