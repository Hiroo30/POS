"use client";

import { useState, useEffect } from "react";
import type { CartItem } from "@/lib/types";
import { hasCustomDecimalPrices } from "@/lib/formatters";

interface Props {
  cart: CartItem[];
  totalAmount: number;
  onUpdateQuantity: (productId: string, unitUsed: "BASE" | "PACK", qty: number) => void;
  onCheckout: () => void;
  onClearCart: () => void;
}

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function CartSidebar({
  cart, totalAmount, onUpdateQuantity, onCheckout, onClearCart,
}: Props) {
  const rawCartCount = cart.reduce((s, it) => s + it.quantity, 0);
  const cartCount = Math.round(rawCartCount * 100) / 100;
  const [todayStr, setTodayStr] = useState("Hari ini");

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" }));
  }, []);

  return (
    <div className="app-desktop-cart kp-cart flex flex-col h-full bg-white border-l border-slate-200 shrink-0 w-80 lg:w-96 select-none">
      {/* Header */}
      <div className="kp-cart-header">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div>
            <div className="kp-cart-header-title">
              <span>Pesanan</span>
              {cart.length > 0 && (
                <span style={{
                  background:"rgba(255,255,255,0.25)", color:"#fff",
                  fontSize:10, fontWeight:800, padding:"1px 7px", borderRadius:20,
                  marginLeft:8
                }}>
                  {cart.length} barang ({cartCount})
                </span>
              )}
            </div>
            <div style={{fontSize:10, color:"#86efac", marginTop:2}}>{todayStr}</div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              style={{
                background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)",
                borderRadius:6, padding:"4px 8px", color:"#fff", fontSize:10, fontWeight:600,
                cursor:"pointer", display:"flex", alignItems:"center", gap:4
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Bersihkan
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="kp-cart-items">
        {cart.length === 0 ? (
          <div style={{textAlign:"center", padding:"40px 20px", color:"#94a3b8"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" style={{display:"inline-block"}}>
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <div style={{marginTop:10, fontSize:13, fontWeight:600, color:"#94a3b8"}}>Keranjang kosong</div>
            <div style={{fontSize:11, color:"#cbd5e1", marginTop:4}}>Ketuk produk untuk menambahkan</div>
          </div>
        ) : (
          cart.map((item, idx) => {
            const unitLabel = item.unitUsed === "PACK" && item.product.packUnit
              ? item.product.packUnit
              : item.product.baseUnit;
            const isWeighed =
              item.unitUsed === "BASE" &&
              ["kg", "liter", "ons", "gram"].includes(item.product.baseUnit.toLowerCase());
            const stepMinus = item.quantity <= 1 ? 0.25 : 1;

            return (
              <div key={`${item.product.id}-${item.unitUsed}`} className="kp-cart-item" style={{flexDirection:"column", alignItems:"stretch", gap:6}}>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  {/* Number */}
                  <div style={{
                    width:18, height:18, borderRadius:"50%", background:"#16a34a",
                    color:"#fff", fontSize:9, fontWeight:800, display:"flex",
                    alignItems:"center", justifyContent:"center", flexShrink:0
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{flex:1, minWidth:0}}>
                    <div className="kp-cart-item-name" style={{display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical", overflow:"hidden"}}>
                      {item.product.name}
                    </div>
                    <div className="kp-cart-item-price">
                      {new Intl.NumberFormat("id-ID").format(item.pricePerUnit)} × {item.quantity} {unitLabel}
                      {item.unitUsed === "PACK" && item.product.hasMultiUnit && item.product.packConversion ? (
                        <span style={{display:"block", fontSize:10, color:"#16a34a", fontWeight:700, marginTop:1}}>
                          ({Math.round(item.quantity * item.product.packConversion * 100) / 100} {item.product.baseUnit})
                        </span>
                      ) : null}
                      {item.unitUsed === "BASE" &&
                      hasCustomDecimalPrices(item.product) &&
                      item.quantity % 1 !== 0 ? (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 9.5,
                            color: "#15803d",
                            background: "#dcfce7",
                            padding: "0px 5px",
                            borderRadius: 4,
                            fontWeight: 700,
                            marginTop: 2,
                          }}
                        >
                          ⚖️ Harga desimal stok aktif
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{textAlign:"right", flexShrink:0}}>
                    <div style={{fontSize:12, fontWeight:800, color:"#16a34a", marginBottom:4}}>
                      {new Intl.NumberFormat("id-ID").format(Math.round(item.subtotal))}
                    </div>
                    <div className="kp-cart-qty-control">
                      <button
                        type="button"
                        className="kp-qty-btn"
                        onClick={() =>
                          onUpdateQuantity(
                            item.product.id,
                            item.unitUsed,
                            Math.round((item.quantity - stepMinus) * 100) / 100
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateQuantity(item.product.id, item.unitUsed, val);
                          }
                        }}
                        title="Ketik langsung jumlah barang (bisa desimal seperti 0.25 atau 0.5)"
                        style={{
                          width: 44,
                          fontSize: 11.5,
                          fontWeight: 800,
                          textAlign: "center",
                          border: "1px solid #cbd5e1",
                          borderRadius: 5,
                          padding: "1px 2px",
                          color: "#0f172a",
                          background: "#f8fafc",
                        }}
                      />
                      <button
                        type="button"
                        className="kp-qty-btn"
                        onClick={() =>
                          onUpdateQuantity(
                            item.product.id,
                            item.unitUsed,
                            Math.round((item.quantity + 1) * 100) / 100
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Fraction Chips for BASE items (especially Kg / Liter / timbangan) */}
                {item.unitUsed === "BASE" && (
                  <div style={{display:"flex", flexDirection:"column", paddingLeft:26, gap:4}}>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:4, flexWrap:"wrap"}}>
                      <span style={{fontSize:9.5, color:"#64748b", fontWeight:600}}>
                        {isWeighed ? "Timbangan:" : "Pecahan:"}
                      </span>
                      <div style={{display:"flex", gap:3, flexWrap:"wrap"}}>
                        {[
                          {
                            label: "1/4",
                            subPrice: item.product.sellPriceQuarter,
                            val: 0.25,
                          },
                          {
                            label: "1/2",
                            subPrice: item.product.sellPriceHalf,
                            val: 0.5,
                          },
                          {
                            label: "3/4",
                            subPrice: item.product.sellPriceThreeQuarter,
                            val: 0.75,
                          },
                          { label: "1", val: 1 },
                          {
                            label: "+0.5",
                            val: Math.round((item.quantity + 0.5) * 100) / 100,
                            isAdd: true,
                          },
                        ].map((chip) => {
                          const active = !chip.isAdd && item.quantity === chip.val;
                          return (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.product.id, item.unitUsed, chip.val)
                              }
                              title={
                                chip.subPrice
                                  ? `Harga khusus ${chip.label} ${unitLabel}: ${formatRupiah(chip.subPrice)}`
                                  : `Set jumlah ke ${chip.val} ${unitLabel}`
                              }
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                padding: "1.5px 5px",
                                borderRadius: 4,
                                cursor: "pointer",
                                border: active
                                  ? "1px solid #16a34a"
                                  : chip.subPrice
                                  ? "1px solid #86efac"
                                  : "1px solid #e2e8f0",
                                background: active
                                  ? "#dcfce7"
                                  : chip.subPrice
                                  ? "#f0fdf4"
                                  : "#f8fafc",
                                color: active ? "#15803d" : "#334155",
                              }}
                            >
                              {chip.label}
                              {chip.subPrice
                                ? ` (${
                                    chip.subPrice >= 1000
                                      ? `${(chip.subPrice / 1000).toLocaleString("id-ID", {
                                          maximumFractionDigits: 1,
                                        })}rb`
                                      : chip.subPrice
                                  })`
                                : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="kp-cart-footer">
        <div className="kp-cart-total-row">
          <span>Subtotal ({cart.length} macam)</span>
          <span>{formatRupiah(totalAmount)}</span>
        </div>
        <div className="kp-cart-total-row">
          <span>Diskon / Nego</span>
          <span style={{color:"#64748b", fontSize:10.5}}>Diatur saat bayar</span>
        </div>
        <div className="kp-cart-total-row grand">
          <span>Total Bayar</span>
          <span className="val">{formatRupiah(totalAmount)}</span>
        </div>
        <button
          className="kp-pay-btn"
          onClick={onCheckout}
          disabled={cart.length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          PROSES PEMBAYARAN
        </button>
      </div>
    </div>
  );
}
