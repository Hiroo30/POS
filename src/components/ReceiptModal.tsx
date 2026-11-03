"use client";

import type { SaleTransaction } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { getStoreSettings } from "@/lib/storeSettings";

interface Props {
  sale: SaleTransaction;
  onClose: () => void;
}

export default function ReceiptModal({ sale, onClose }: Props) {
  const handlePrint = () => window.print();

  const handleShareWhatsApp = () => {
    const settings = getStoreSettings();
    const cashier = sale.cashierName || settings.cashierName;
    const lines = [
      `*${settings.storeName}*`,
      `*BUKTI PEMBAYARAN*`,
      `================================`,
      `No. Nota : ${sale.receiptNo}`,
      `Waktu    : ${formatDateTime(sale.createdAt)}`,
      `Pelanggan: ${sale.customerName || "Umum"}`,
      `Kasir    : ${cashier}`,
      `WA Toko  : ${settings.storePhone}`,
      `================================`,
      ...sale.items.map(
        (it) => `${it.productName}\n  ${it.quantity} ${it.unitLabel} x ${formatRupiah(it.pricePerUnit)} = ${formatRupiah(it.subtotal)}`
      ),
      `--------------------------------`,
      `*TOTAL : ${formatRupiah(sale.totalAmount)}*`,
      `Metode: ${sale.paymentMethod}`,
      ...(sale.paymentMethod === "TUNAI"
        ? [`Tunai: ${formatRupiah(sale.amountPaid)}`, `Kembalian: ${formatRupiah(sale.changeAmount)}`]
        : []),
      ...(sale.pointsEarned ? [`⭐ Poin Didapat: +${sale.pointsEarned} Poin`] : []),
      ...(sale.pointsRedeemed ? [`🎁 Poin Ditukar: -${sale.pointsRedeemed} Poin`] : []),
      `================================`,
      settings.receiptFooter || `Terima kasih telah berbelanja!`,
    ];
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  return (
    <div className="kp-modal-overlay">
      <div className="kp-modal" style={{maxWidth:380}}>
        {/* Header */}
        <div className="kp-modal-header" style={{background:"linear-gradient(135deg,#16a34a 0%,#15803d 100%)"}}>
          <div>
            <div style={{display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Transaksi Berhasil Disimpan
            </div>
            <div style={{fontSize:10, color:"rgba(255,255,255,0.7)", marginTop:2}}>{sale.receiptNo}</div>
          </div>
          <button className="kp-modal-close" onClick={onClose} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Receipt */}
        <div className="kp-receipt select-text" style={{margin:"16px 16px 0"}}>
          {/* Store info */}
          <div style={{textAlign:"center", marginBottom:12}}>
            <div style={{fontWeight:900, fontSize:14, letterSpacing:0.5}}>{getStoreSettings().storeName}</div>
            <div style={{fontSize:10, color:"#64748b"}}>{getStoreSettings().storeAddress}</div>
            <div style={{fontSize:10, color:"#64748b"}}>Telp / WA: {getStoreSettings().storePhone}</div>
          </div>

          <div className="kp-receipt-divider" />

          {/* Meta */}
          <div style={{fontSize:11}}>
            {[
              ["No. Nota", sale.receiptNo],
              ["Waktu", formatDateTime(sale.createdAt)],
              ["Pelanggan", sale.customerName || "Pelanggan Umum"],
              ["Kasir", sale.cashierName || getStoreSettings().cashierName || "Kasir Dewi"],
            ].map(([label, val]) => (
              <div key={label} style={{display:"flex", justifyContent:"space-between", marginBottom:2}}>
                <span style={{color:"#64748b"}}>{label}:</span>
                <span style={{fontWeight:700}}>{val}</span>
              </div>
            ))}
          </div>

          <div className="kp-receipt-divider" />

          {/* Items */}
          <div style={{fontSize:11}}>
            {sale.items.map((it, idx) => (
              <div key={idx} style={{marginBottom:6}}>
                <div style={{fontWeight:700}}>{it.productName}</div>
                <div style={{display:"flex", justifyContent:"space-between", color:"#64748b"}}>
                  <span>{it.quantity} {it.unitLabel} × {formatRupiah(it.pricePerUnit)}</span>
                  <span style={{fontWeight:800, color:"#1e293b"}}>{formatRupiah(it.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="kp-receipt-divider" />

          {/* Totals */}
          <div style={{fontSize:11}}>
            <div style={{display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:13, marginBottom:4}}>
              <span>TOTAL BELANJA</span>
              <span style={{color:"#16a34a"}}>{formatRupiah(sale.totalAmount)}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", color:"#64748b", marginBottom:2}}>
              <span>Metode Bayar</span>
              <span style={{fontWeight:700}}>{sale.paymentMethod}</span>
            </div>
            {sale.paymentMethod === "TUNAI" && (
              <>
                <div style={{display:"flex", justifyContent:"space-between", color:"#64748b", marginBottom:2}}>
                  <span>Tunai Diterima</span>
                  <span>{formatRupiah(sale.amountPaid)}</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", fontWeight:700, color:"#16a34a"}}>
                  <span>Kembalian</span>
                  <span>{formatRupiah(sale.changeAmount)}</span>
                </div>
              </>
            )}
            {sale.paymentMethod === "KASBON" && (
              <div style={{background:"#fef3c7", border:"1px solid #fde68a", borderRadius:6, padding:"6px 10px", marginTop:6, textAlign:"center", fontSize:10, fontWeight:700, color:"#92400e"}}>
                ⚠ DICATAT KE BUKU KASBON
              </div>
            )}

            {Boolean(sale.pointsEarned || sale.pointsRedeemed) && (
              <div style={{ background: "#f0fdf4", border: "1px dashed #86efac", borderRadius: 6, padding: "6px 8px", marginTop: 8, fontSize: 10 }}>
                {sale.pointsEarned ? (
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#166534" }}>
                    <span>⭐ Poin Diperoleh:</span>
                    <span>+{sale.pointsEarned} Poin</span>
                  </div>
                ) : null}
                {sale.pointsRedeemed ? (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", marginTop: 2 }}>
                    <span>🎁 Poin Ditukar (Diskon):</span>
                    <span>-{sale.pointsRedeemed} Poin</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="kp-receipt-divider" />

          {/* Barcode area */}
          <div style={{textAlign:"center", padding:"6px 0"}}>
            <div style={{fontFamily:"monospace", fontSize:24, letterSpacing:2, color:"#1e293b"}}>
              ||||| |||| ||| ||||||
            </div>
            <div style={{fontSize:9, letterSpacing:3, color:"#94a3b8"}}>{sale.receiptNo}</div>
            <div style={{fontSize:10, color:"#64748b", marginTop:6}}>
              {getStoreSettings().receiptFooter || "Terima kasih atas kunjungan Anda!"}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{padding:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}} className="no-print">
          <button className="kp-btn-secondary" onClick={handlePrint} style={{justifyContent:"center"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak Struk
          </button>
          <button className="kp-btn-primary" onClick={handleShareWhatsApp} style={{justifyContent:"center", background:"#16a34a"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </button>
          <button className="kp-btn-primary" onClick={onClose} style={{gridColumn:"1/-1", justifyContent:"center"}}>
            Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
