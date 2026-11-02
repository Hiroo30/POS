"use client";

import { useState, useEffect } from "react";
import type { CartItem } from "@/lib/types";

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
  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);
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
              {cartCount > 0 && (
                <span style={{
                  background:"rgba(255,255,255,0.25)", color:"#fff",
                  fontSize:10, fontWeight:800, padding:"1px 7px", borderRadius:20,
                  marginLeft:8
                }}>
                  {cartCount} item
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
            return (
              <div key={`${item.product.id}-${item.unitUsed}`} className="kp-cart-item">
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
                  </div>
                </div>

                <div style={{textAlign:"right", flexShrink:0}}>
                  <div style={{fontSize:12, fontWeight:800, color:"#16a34a", marginBottom:4}}>
                    {new Intl.NumberFormat("id-ID").format(item.subtotal)}
                  </div>
                  <div className="kp-cart-qty-control">
                    <button className="kp-qty-btn" onClick={() => onUpdateQuantity(item.product.id, item.unitUsed, item.quantity - 1)}>−</button>
                    <span style={{fontSize:12, fontWeight:700, minWidth:20, textAlign:"center"}}>{item.quantity}</span>
                    <button className="kp-qty-btn" onClick={() => onUpdateQuantity(item.product.id, item.unitUsed, item.quantity + 1)}>+</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="kp-cart-footer">
        <div className="kp-cart-total-row">
          <span>Subtotal ({cartCount} item)</span>
          <span>{formatRupiah(totalAmount)}</span>
        </div>
        <div className="kp-cart-total-row">
          <span>Diskon</span>
          <span style={{color:"#dc2626"}}>- Rp 0</span>
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
