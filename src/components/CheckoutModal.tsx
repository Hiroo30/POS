"use client";

import { useState } from "react";
import type { CartItem, SaleTransaction } from "@/lib/types";
import { deviceFetch } from "@/lib/device";
import { getStoreSettings } from "@/lib/storeSettings";

interface Props {
  cart: CartItem[];
  totalAmount: number;
  initialCustomerName?: string;
  initialPoints?: number;
  onClose: () => void;
  onSuccess: (sale: SaleTransaction) => void;
}

type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER" | "KASBON";

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
  { key: "TUNAI", label: "Tunai", icon: "💵", color: "#16a34a" },
  { key: "QRIS", label: "QRIS", icon: "📱", color: "#7c3aed" },
  { key: "TRANSFER", label: "Transfer", icon: "🏦", color: "#2563eb" },
  { key: "KASBON", label: "Kasbon", icon: "📒", color: "#dc2626" },
];

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];

export default function CheckoutModal({
  cart,
  totalAmount,
  initialCustomerName,
  initialPoints = 0,
  onClose,
  onSuccess,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TUNAI");
  const [cashInput, setCashInput] = useState("");
  const [customerName, setCustomerName] = useState(
    initialCustomerName && initialCustomerName !== "Walk-in (Umum)"
      ? initialCustomerName
      : ""
  );
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 10 poin = Diskon Rp 5.000
  const pointsDiscount = redeemPoints > 0 ? (redeemPoints / 10) * 5000 : 0;
  const finalTotal = Math.max(0, totalAmount - pointsDiscount);
  const pointsEarned = Math.floor(finalTotal / 10000);

  const cashAmount = parseInt(cashInput.replace(/\D/g, "")) || 0;
  const change = paymentMethod === "TUNAI" ? cashAmount - finalTotal : 0;

  const handleNumpad = (val: string) => {
    if (val === "C") { setCashInput(""); return; }
    if (val === "⌫") { setCashInput((p) => p.slice(0, -1)); return; }
    const raw = (cashInput + val).replace(/^0+/, "") || "0";
    if (raw.length > 10) return;
    setCashInput(raw);
  };

  const handleQuickAmount = (amount: number) => {
    const need = Math.ceil(finalTotal / amount) * amount;
    setCashInput(String(need));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "TUNAI" && cashAmount < finalTotal) {
      setErrorMessage("Jumlah bayar kurang dari total tagihan!");
      return;
    }
    if (paymentMethod === "KASBON" && !customerName.trim()) {
      setErrorMessage("Nama pelanggan kasbon wajib diisi!");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await deviceFetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          paymentMethod,
          amountPaid: paymentMethod === "TUNAI" ? cashAmount : finalTotal,
          customerName: customerName.trim() || undefined,
          cashierName: getStoreSettings().cashierName,
          notes: notes.trim() || undefined,
          dueDate: paymentMethod === "KASBON" ? dueDate : undefined,
          pointsRedeemed: redeemPoints > 0 ? redeemPoints : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal memproses transaksi");
      onSuccess(data.data.sale);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  const numpadKeys = ["1","2","3","4","5","6","7","8","9","C","0","⌫"];

  return (
    <div className="kp-modal-overlay">
      <div className="kp-modal" style={{maxWidth:520}}>
        {/* Header */}
        <div className="kp-modal-header">
          <div>
            <div style={{fontSize:10, fontWeight:700, color:"#86efac", textTransform:"uppercase", letterSpacing:1, marginBottom:4}}>
              KASIR POS TERMINAL
            </div>
            <div style={{display:"flex", alignItems:"baseline", gap:8}}>
              <span style={{fontSize:11, color:"#86efac"}}>Tagihan:</span>
              <span style={{fontSize:26, fontWeight:900, color:"#fff"}}>{formatRupiah(finalTotal)}</span>
              {pointsDiscount > 0 && (
                <span style={{fontSize:12, textDecoration:"line-through", color:"rgba(255,255,255,0.6)"}}>
                  {formatRupiah(totalAmount)}
                </span>
              )}
            </div>
          </div>
          <button className="kp-modal-close" onClick={onClose} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="kp-modal-body">
            {/* Error */}
            {errorMessage && (
              <div style={{
                background:"#fee2e2", border:"1px solid #fecaca", color:"#dc2626",
                borderRadius:8, padding:"10px 12px", fontSize:12, fontWeight:600,
                display:"flex", alignItems:"center", gap:8, marginBottom:14
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Loyalty Points & Customer Box */}
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>⭐</span> POIN LOYALITAS PELANGGAN
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 12 }}>
                  +{pointsEarned} Poin Transaksi Ini
                </span>
              </div>

              {/* Customer Input */}
              <div style={{ marginBottom: 6 }}>
                <input
                  className="kp-input"
                  style={{ background: "#ffffff", fontSize: 12, padding: "7px 10px", borderColor: "#86efac" }}
                  type="text"
                  placeholder="Ketik nama pelanggan untuk kumpulkan poin..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Points status & redemption */}
              {customerName ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#166534" }}>
                    <span>Saldo Poin Saat Ini:</span>
                    <span style={{ fontWeight: 800, fontSize: 12 }}>
                      {initialPoints} Poin {initialPoints >= 10 ? `(Setara Diskon ${formatRupiah(Math.floor(initialPoints / 10) * 5000)})` : "(Min. 10 poin untuk tukar)"}
                    </span>
                  </div>

                  {initialPoints >= 10 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #bbf7d0" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#15803d", marginBottom: 5 }}>
                        🎁 Tukar Poin Jadi Diskon Belanja:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setRedeemPoints(0)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            background: redeemPoints === 0 ? "#15803d" : "#ffffff",
                            color: redeemPoints === 0 ? "#ffffff" : "#475569",
                            border: `1px solid ${redeemPoints === 0 ? "#15803d" : "#cbd5e1"}`,
                          }}
                        >
                          Jangan Tukar
                        </button>
                        {Array.from({ length: Math.min(5, Math.floor(initialPoints / 10)) }, (_, i) => (i + 1) * 10).map((pts) => {
                          const disc = (pts / 10) * 5000;
                          if (disc > totalAmount) return null;
                          const isSel = redeemPoints === pts;
                          return (
                            <button
                              key={pts}
                              type="button"
                              onClick={() => setRedeemPoints(pts)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: isSel ? "#15803d" : "#ffffff",
                                color: isSel ? "#ffffff" : "#15803d",
                                border: `1.5px solid ${isSel ? "#15803d" : "#86efac"}`,
                              }}
                            >
                              Tukar {pts} Poin (-{formatRupiah(disc)})
                            </button>
                          );
                        })}
                      </div>
                      {redeemPoints > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#15803d", display: "flex", alignItems: "center", gap: 4 }}>
                          <span>🎉 Diskon {formatRupiah(pointsDiscount)} berhasil dipasang!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  💡 Masukkan nama pelanggan agar mereka mendapat 1 poin setiap belanja kelipatan Rp 10.000.
                </div>
              )}
            </div>

            {/* Payment methods */}
            <div style={{marginBottom:14}}>
              <div className="kp-label">Metode Pembayaran</div>
              <div className="kp-pay-methods">
                {PAYMENT_METHODS.map((pm) => (
                  <div
                    key={pm.key}
                    className={`kp-pay-method ${paymentMethod === pm.key ? "active" : ""}`}
                    onClick={() => setPaymentMethod(pm.key)}
                  >
                    <div className="kp-pay-method-icon" style={{fontSize:18}}>{pm.icon}</div>
                    <div className="kp-pay-method-label" style={{color: paymentMethod === pm.key ? pm.color : "#374151"}}>
                      {pm.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Due date for Kasbon */}
            {paymentMethod === "KASBON" && (
              <div className="kp-form-group">
                <label className="kp-label">Jatuh Tempo Kasbon</label>
                <input
                  className="kp-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )}

            {/* Tunai: numpad */}
            {paymentMethod === "TUNAI" && (
              <div>
                {/* Cash input display */}
                <div className="kp-form-group">
                  <label className="kp-label">Jumlah Bayar</label>
                  <div style={{
                    background:"#f0fdf4", border:"2px solid #16a34a", borderRadius:8,
                    padding:"10px 14px", textAlign:"right"
                  }}>
                    <span style={{fontSize:22, fontWeight:900, color:"#16a34a"}}>
                      {cashAmount > 0 ? formatRupiah(cashAmount) : "Rp 0"}
                    </span>
                  </div>
                </div>

                {/* Quick amounts */}
                <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6, marginBottom:10}}>
                  {QUICK_AMOUNTS.map((amt) => {
                    const label = amt >= 1000 ? `${amt/1000}rb` : String(amt);
                    const need = Math.ceil(finalTotal / amt) * amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAmount(amt)}
                        style={{
                          background: need === cashAmount ? "#16a34a" : "#f1f5f9",
                          color: need === cashAmount ? "#fff" : "#374151",
                          border: "1px solid #e2e8f0",
                          borderRadius:6, padding:"7px 0",
                          fontSize:11, fontWeight:700, cursor:"pointer"
                        }}
                      >
                        {formatRupiah(need)}
                      </button>
                    );
                  })}
                </div>

                {/* Numpad */}
                <div className="kp-numpad">
                  {numpadKeys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleNumpad(k)}
                      className={`kp-numpad-btn ${k === "⌫" ? "del" : k === "C" ? "clear" : ""}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Change */}
                {cashAmount >= finalTotal && (
                  <div style={{
                    background:"#f0fdf4", border:"1px solid #dcfce7",
                    borderRadius:8, padding:"10px 14px", marginTop:10,
                    display:"flex", justifyContent:"space-between", alignItems:"center"
                  }}>
                    <span style={{fontSize:12, fontWeight:600, color:"#15803d"}}>Kembalian:</span>
                    <span style={{fontSize:18, fontWeight:900, color:"#16a34a"}}>{formatRupiah(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="kp-form-group" style={{marginTop:10}}>
              <label className="kp-label">Catatan (Opsional)</label>
              <input
                className="kp-input"
                type="text"
                placeholder="Catatan tambahan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Submit */}
          <div style={{padding:"0 20px 20px"}}>
            <button type="submit" className="kp-pay-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  Memproses...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  PROSES PEMBAYARAN — {formatRupiah(finalTotal)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
