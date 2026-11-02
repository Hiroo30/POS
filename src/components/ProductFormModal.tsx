"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
// Icons removed - using inline SVG

interface ProductFormModalProps {
  productToEdit?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductFormModal({
  productToEdit,
  isOpen,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("beras");
  const [baseUnit, setBaseUnit] = useState("Bungkus");
  const [hasMultiUnit, setHasMultiUnit] = useState(false);
  const [packUnit, setPackUnit] = useState("Dus");
  const [packConversion, setPackConversion] = useState("40");
  const [stockInBase, setStockInBase] = useState("10");
  const [minStockInBase, setMinStockInBase] = useState("5");
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [costPricePack, setCostPricePack] = useState("");
  const [sellPricePack, setSellPricePack] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setBarcode(productToEdit.barcode || "");
      setCategory(productToEdit.category);
      setBaseUnit(productToEdit.baseUnit);
      setHasMultiUnit(Boolean(productToEdit.hasMultiUnit));
      setPackUnit(productToEdit.packUnit || "Dus");
      setPackConversion(productToEdit.packConversion?.toString() || "40");
      setStockInBase(productToEdit.stockInBase.toString());
      setMinStockInBase(productToEdit.minStockInBase?.toString() || "5");
      setCostPrice(productToEdit.costPrice?.toString() || "");
      setSellPrice(productToEdit.sellPrice?.toString() || "");
      setCostPricePack(productToEdit.costPricePack?.toString() || "");
      setSellPricePack(productToEdit.sellPricePack?.toString() || "");
    } else {
      setName("");
      setBarcode("");
      setCategory("mie");
      setBaseUnit("Bungkus");
      setHasMultiUnit(false);
      setPackUnit("Dus");
      setPackConversion("40");
      setStockInBase("10");
      setMinStockInBase("5");
      setCostPrice("");
      setSellPrice("");
      setCostPricePack("");
      setSellPricePack("");
    }
    setErrorMessage("");
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleCostPriceChange = (val: string) => {
    setCostPrice(val);
    const num = parseFloat(val);
    const conv = parseFloat(packConversion);
    if (hasMultiUnit && num && conv && !costPricePack) {
      setCostPricePack((num * conv).toString());
    }
  };

  const handleSellPriceChange = (val: string) => {
    setSellPrice(val);
    const num = parseFloat(val);
    const conv = parseFloat(packConversion);
    if (hasMultiUnit && num && conv && !sellPricePack) {
      setSellPricePack((num * conv).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama barang tidak boleh kosong!");
      return;
    }
    if (!baseUnit.trim()) {
      setErrorMessage("Satuan eceran wajib dipilih!");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const payload = {
      name: name.trim(),
      barcode: barcode.trim() || undefined,
      category,
      baseUnit,
      hasMultiUnit,
      packUnit: hasMultiUnit ? packUnit : undefined,
      packConversion: hasMultiUnit ? parseFloat(packConversion) || 1 : 1,
      stockInBase: parseFloat(stockInBase) || 0,
      minStockInBase: parseFloat(minStockInBase) || 5,
      costPrice: parseFloat(costPrice) || 0,
      sellPrice: parseFloat(sellPrice) || 0,
      costPricePack: hasMultiUnit && costPricePack ? parseFloat(costPricePack) : undefined,
      sellPricePack: hasMultiUnit && sellPricePack ? parseFloat(sellPricePack) : undefined,
    };

    try {
      const url = isEditing ? `/api/products/${productToEdit!.id}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan barang");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToEdit) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus barang "${productToEdit.name}" dari sistem?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productToEdit.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus barang");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Gagal menghapus barang");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="kp-modal-overlay" style={{overflowY:"auto"}}>
      <div className="kp-modal" style={{maxWidth:540, margin:"20px auto"}}>
        {/* Header */}
        <div className="kp-modal-header">
          <div>
            <div style={{fontSize:10, fontWeight:800, color:"#86efac", textTransform:"uppercase", letterSpacing:1, marginBottom:4}}>
              {isEditing ? "UBAH DATA BARANG" : "TAMBAH BARANG BARU"}
            </div>
            <div className="kp-modal-header-title">
              {isEditing ? productToEdit!.name : "Formulir Produk Toko"}
            </div>
          </div>
          <button type="button" className="kp-modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{padding:"16px 20px", maxHeight:"75vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:12}}>
          {errorMessage && (
            <div style={{background:"#fee2e2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errorMessage}
            </div>
          )}

          {/* Nama Produk */}
          <div>
            <label className="kp-label">Nama Barang <span style={{color:"#dc2626"}}>*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Beras Ramos 5kg, Minyak Bimoli 2L" className="kp-input" />
          </div>

          {/* Kategori & Barcode */}
          <div className="kp-form-row">
            <div>
              <label className="kp-label">Kategori</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="kp-input">
                {CATEGORIES.filter((c) => c.id !== "semua").map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kp-label">Barcode (Opsional)</label>
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan / ketik barcode" className="kp-input" style={{fontFamily:"monospace"}} />
            </div>
          </div>

          {/* Satuan Dasar */}
          <div style={{background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px"}}>
            <label className="kp-label">Satuan Eceran <span style={{color:"#dc2626"}}>*</span></label>
            <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:8}}>
              {["Bungkus","Kg","Liter","Pouch","Botol","Pcs","Butir","Renteng"].map((unit) => (
                <button key={unit} type="button" onClick={() => setBaseUnit(unit)}
                  style={{padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:700, cursor:"pointer",
                    background: baseUnit === unit ? "#16a34a" : "#fff",
                    color: baseUnit === unit ? "#fff" : "#374151",
                    border: baseUnit === unit ? "none" : "1px solid #e2e8f0"
                  }}>
                  {unit}
                </button>
              ))}
            </div>
            <input type="text" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}
              placeholder="Atau ketik satuan lain..." className="kp-input" style={{fontSize:12}} />
          </div>

          {/* Multi unit */}
          <div style={{background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 12px"}}>
            <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12, fontWeight:600, color:"#1e293b", marginBottom:hasMultiUnit ? 10 : 0}}>
              <input type="checkbox" checked={hasMultiUnit} onChange={(e) => setHasMultiUnit(e.target.checked)} />
              Punya kemasan grosir (Dus / Sak / Karton)?
            </label>
            {hasMultiUnit && (
              <div className="kp-form-row" style={{marginTop:8}}>
                <div>
                  <label className="kp-label">Satuan Grosir</label>
                  <select value={packUnit} onChange={(e) => setPackUnit(e.target.value)} className="kp-input">
                    {["Dus","Sak","Karton","Bal","Slop","Peti","Krat"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="kp-label">1 {packUnit} = berapa {baseUnit}?</label>
                  <input type="number" min="1" value={packConversion} onChange={(e) => setPackConversion(e.target.value)} className="kp-input" />
                </div>
              </div>
            )}
          </div>

          {/* Harga */}
          <div className="kp-form-row">
            <div>
              <label className="kp-label">Harga Modal / {baseUnit} (Rp)</label>
              <input type="number" value={costPrice} onChange={(e) => handleCostPriceChange(e.target.value)} placeholder="2850" className="kp-input" />
              {hasMultiUnit && (
                <div style={{marginTop:6}}>
                  <label className="kp-label">Modal / {packUnit} (Rp)</label>
                  <input type="number" value={costPricePack} onChange={(e) => setCostPricePack(e.target.value)} placeholder="112000" className="kp-input" />
                </div>
              )}
            </div>
            <div>
              <label className="kp-label">Harga Jual / {baseUnit} (Rp)</label>
              <input type="number" value={sellPrice} onChange={(e) => handleSellPriceChange(e.target.value)} placeholder="3500" className="kp-input" style={{borderColor:"#16a34a", color:"#16a34a", fontWeight:800}} />
              {hasMultiUnit && (
                <div style={{marginTop:6}}>
                  <label className="kp-label">Jual / {packUnit} (Rp)</label>
                  <input type="number" value={sellPricePack} onChange={(e) => setSellPricePack(e.target.value)} placeholder="125000" className="kp-input" style={{borderColor:"#16a34a"}} />
                </div>
              )}
            </div>
          </div>

          {/* Stok */}
          <div className="kp-form-row">
            <div>
              <label className="kp-label">Stok Sekarang ({baseUnit})</label>
              <input type="number" value={stockInBase} onChange={(e) => setStockInBase(e.target.value)} className="kp-input" />
            </div>
            <div>
              <label className="kp-label">Batas Minimum ({baseUnit})</label>
              <input type="number" value={minStockInBase} onChange={(e) => setMinStockInBase(e.target.value)} className="kp-input" />
            </div>
          </div>

          {/* Buttons */}
          <div style={{borderTop:"1px solid #e2e8f0", paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8}}>
            {isEditing && (
              <button type="button" className="kp-btn-danger" onClick={handleDelete} disabled={isDeleting}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            )}
            <div style={{display:"flex", gap:8, marginLeft:"auto"}}>
              <button type="button" className="kp-btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="kp-btn-primary" disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {isLoading ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Barang"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
