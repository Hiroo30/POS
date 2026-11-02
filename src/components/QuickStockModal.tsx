"use client";

import { useState, useEffect } from "react";
import type { Product, TransactionType } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";
import { deviceFetch } from "@/lib/device";

interface Props {
  product: Product | null;
  mode: TransactionType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const modeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  IN: { label: "Stok Masuk (Kulakan)", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  OUT: { label: "Stok Keluar", color: "#dc2626", bg: "#fee2e2", border: "#fecaca" },
  ADJUST: { label: "Koreksi Stok Fisik", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
  SALE: { label: "Penjualan Kasir", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
};

export default function QuickStockModal({ product, mode, isOpen, onClose, onSuccess }: Props) {
  const [unitUsed, setUnitUsed] = useState<"BASE" | "PACK">("BASE");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [updateCostPrice, setUpdateCostPrice] = useState(false);
  const [newCostPrice, setNewCostPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!product) return;
    setErrorMessage("");
    if (mode === "IN" && product.hasMultiUnit && product.packUnit) {
      setUnitUsed("PACK");
      setNote("Kulakan dari Agen");
      setNewCostPrice(product.costPricePack ? product.costPricePack.toString() : "");
      setQuantity("1");
    } else if (mode === "OUT") {
      setUnitUsed("BASE");
      setNote("Terjual ke Pembeli");
      setNewCostPrice("");
      setQuantity("1");
    } else {
      setUnitUsed("BASE");
      setNote("Koreksi hitungan fisik");
      setNewCostPrice("");
      setQuantity(product.stockInBase.toString());
    }
  }, [product, mode]);

  if (!isOpen || !product) return null;

  const cfg = modeConfig[mode];
  const isPack = unitUsed === "PACK" && product.hasMultiUnit;
  const unitLabel = isPack ? (product.packUnit || "Dus") : product.baseUnit;
  const numQty = parseFloat(quantity) || 0;
  const conversion = product.hasMultiUnit && product.packConversion ? product.packConversion : 1;
  const totalBaseQty = isPack ? numQty * conversion : numQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty <= 0 && mode !== "ADJUST") {
      setErrorMessage("Jumlah harus lebih dari 0!");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await deviceFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          type: mode,
          unitUsed,
          quantityInput: numQty,
          note: note.trim(),
          newCostPrice: updateCostPrice && newCostPrice ? parseFloat(newCostPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menyimpan");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="kp-modal-overlay">
      <div className="kp-modal">
        {/* Header */}
        <div className="kp-modal-header">
          <div>
            <div style={{display:"inline-block", background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, borderRadius:4, fontSize:10, fontWeight:800, padding:"2px 8px", letterSpacing:0.5, textTransform:"uppercase", marginBottom:4}}>
              {cfg.label}
            </div>
            <div className="kp-modal-header-title">{product.name}</div>
            <div className="kp-modal-header-sub">Stok saat ini: {product.stockInBase} {product.baseUnit}</div>
          </div>
          <button className="kp-modal-close" onClick={onClose} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="kp-modal-body">
            {errorMessage && (
              <div style={{background:"#fee2e2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:600, marginBottom:14, display:"flex", alignItems:"center", gap:6}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Unit selector */}
            {product.hasMultiUnit && product.packUnit && mode !== "ADJUST" && (
              <div className="kp-form-group">
                <label className="kp-label">Satuan</label>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                  {[
                    { key:"PACK", label:product.packUnit, sub:`1 ${product.packUnit} = ${conversion} ${product.baseUnit}` },
                    { key:"BASE", label:product.baseUnit, sub:"Satuan eceran" },
                  ].map((u) => (
                    <div
                      key={u.key}
                      onClick={() => setUnitUsed(u.key as "BASE" | "PACK")}
                      style={{
                        border:`2px solid ${unitUsed === u.key ? "#16a34a" : "#e2e8f0"}`,
                        borderRadius:8, padding:"10px 12px", cursor:"pointer",
                        background: unitUsed === u.key ? "#f0fdf4" : "#fff",
                        textAlign:"center"
                      }}
                    >
                      <div style={{fontSize:13, fontWeight:700, color: unitUsed === u.key ? "#16a34a" : "#374151"}}>{u.label}</div>
                      <div style={{fontSize:10, color:"#94a3b8"}}>{u.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="kp-form-group">
              <label className="kp-label">{mode === "ADJUST" ? "Stok Fisik Sekarang" : "Jumlah"} ({unitLabel})</label>
              <input
                className="kp-input"
                type="number"
                min="0"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {mode !== "ADJUST" && totalBaseQty > 0 && isPack && (
                <div style={{fontSize:11, color:"#16a34a", marginTop:4, fontWeight:600}}>
                  = {totalBaseQty} {product.baseUnit} total
                </div>
              )}
            </div>

            {/* Quick presets */}
            <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:14}}>
              {(isPack ? [1,2,5,10] : [1,2,5,10,12,24]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => mode === "ADJUST" ? setQuantity(v.toString()) : setQuantity((parseFloat(quantity)||0) + v + "")}
                  style={{
                    background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:6,
                    padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", color:"#374151"
                  }}
                >
                  {mode === "ADJUST" ? v : `+${v}`} {unitLabel}
                </button>
              ))}
            </div>

            {/* Note */}
            <div className="kp-form-group">
              <label className="kp-label">Keterangan</label>
              <input className="kp-input" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {/* Update cost price (only for IN) */}
            {mode === "IN" && (
              <div className="kp-form-group">
                <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12, fontWeight:600, color:"#374151"}}>
                  <input type="checkbox" checked={updateCostPrice} onChange={(e) => setUpdateCostPrice(e.target.checked)} />
                  Update harga modal sekaligus
                </label>
                {updateCostPrice && (
                  <div style={{marginTop:8}}>
                    <label className="kp-label">Harga Modal Baru (per {unitLabel})</label>
                    <input
                      className="kp-input"
                      type="number"
                      placeholder={isPack ? String(product.costPricePack ?? "") : String(product.costPrice)}
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{padding:"0 20px 20px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <button type="button" className="kp-btn-secondary" onClick={onClose} style={{justifyContent:"center"}}>Batal</button>
            <button type="submit" className="kp-btn-primary" disabled={isLoading} style={{justifyContent:"center", background:cfg.color}}>
              {isLoading ? "Menyimpan..." : mode === "IN" ? "Simpan Stok Masuk" : mode === "OUT" ? "Simpan Stok Keluar" : "Simpan Koreksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
