"use client";

import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";
import CategoryIcon from "./CategoryIcon";

interface Props {
  product: Product;
  onStockIn: (product: Product) => void;
  onStockOut: (product: Product) => void;
  onEdit: (product: Product) => void;
  onAdjust: (product: Product) => void;
}

export default function ProductCard({ product, onStockIn, onStockOut, onEdit, onAdjust }: Props) {
  const isOut = product.stockInBase <= 0;
  const isLow = !isOut && product.stockInBase <= (product.minStockInBase ?? 5);

  let borderColor = "#e2e8f0";
  if (isOut) borderColor = "#fecaca";
  else if (isLow) borderColor = "#fde68a";

  return (
    <div className="kp-card" style={{borderColor, borderWidth:1.5, display:"flex", flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"10px 12px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8}}>
        <div style={{display:"flex", alignItems:"flex-start", gap:10}}>
          <div className="kp-product-icon-box" style={{flexShrink:0}}>
            <CategoryIcon category={product.category} size={22} />
          </div>
          <div>
            <div style={{fontSize:12.5, fontWeight:700, color:"#1e293b", lineHeight:1.3, marginBottom:3}}>
              {product.name}
            </div>
            {product.barcode && (
              <div style={{fontSize:10, color:"#94a3b8", fontFamily:"monospace"}}>{product.barcode}</div>
            )}
          </div>
        </div>

        {/* Stock badge */}
        {isOut ? (
          <span className="kp-badge red" style={{flexShrink:0}}>Habis</span>
        ) : isLow ? (
          <span className="kp-badge yellow" style={{flexShrink:0}}>Menipis</span>
        ) : (
          <span className="kp-badge green" style={{flexShrink:0}}>Aman</span>
        )}
      </div>

      {/* Stock & Price info */}
      <div style={{padding:"8px 12px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
        <div style={{background:"#f8fafc", borderRadius:6, padding:"6px 8px"}}>
          <div style={{fontSize:10, color:"#64748b", fontWeight:600, marginBottom:2}}>STOK</div>
          <div style={{fontSize:13, fontWeight:800, color: isOut ? "#dc2626" : isLow ? "#d97706" : "#16a34a"}}>
            {product.stockInBase} {product.baseUnit}
          </div>
        </div>
        <div style={{background:"#f8fafc", borderRadius:6, padding:"6px 8px"}}>
          <div style={{fontSize:10, color:"#64748b", fontWeight:600, marginBottom:2}}>HARGA JUAL</div>
          <div style={{fontSize:12, fontWeight:800, color:"#1e293b"}}>{formatRupiah(product.sellPrice)}</div>
        </div>
        {product.hasMultiUnit && product.packUnit && (
          <div style={{background:"#f0fdf4", borderRadius:6, padding:"6px 8px", gridColumn:"1/-1"}}>
            <div style={{fontSize:10, color:"#16a34a", fontWeight:600, marginBottom:1}}>
              {product.packUnit} (×{product.packConversion}) = {formatRupiah(product.sellPricePack ?? product.sellPrice * (product.packConversion ?? 1))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{padding:"8px 12px", borderTop:"1px solid #f1f5f9", display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:5}}>
        <button
          onClick={() => onStockIn(product)}
          style={{background:"#dcfce7", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:6, padding:"6px 0", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Masuk
        </button>
        <button
          onClick={() => onStockOut(product)}
          style={{background:"#fee2e2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:6, padding:"6px 0", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Keluar
        </button>
        <button
          onClick={() => onAdjust(product)}
          style={{background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", borderRadius:6, padding:"6px 0", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Opname
        </button>
        <button
          onClick={() => onEdit(product)}
          style={{background:"#dbeafe", color:"#1d4ed8", border:"1px solid #bfdbfe", borderRadius:6, padding:"6px 0", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
      </div>
    </div>
  );
}
