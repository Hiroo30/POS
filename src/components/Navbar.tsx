"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Kasir POS",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
  },
  {
    label: "Katalog & Stok",
    href: "/produk",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    label: "Buku Kasbon",
    href: "/kasbon",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    label: "Laporan Omzet",
    href: "/laporan",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    label: "Pengaturan & Backup",
    href: "/maintenance",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v2M12 2v2"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="kp-sidebar">
        {/* Logo */}
        <div className="kp-sidebar-logo">
          <div className="kp-sidebar-logo-icon">ES</div>
          <span className="kp-sidebar-logo-text">Inventori</span>
        </div>
        <div className="kp-sidebar-version">Toko Dewi · v1.0.0</div>

        {/* Nav Items */}
        <div style={{flex:1, paddingTop:8}}>
          <div className="kp-sidebar-section">
            {navItems.slice(0, 1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`kp-sidebar-item ${pathname === item.href ? "active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="kp-sidebar-section">
            {navItems.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`kp-sidebar-item ${pathname === item.href ? "active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
                <svg className="kp-sidebar-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Status */}
        <div style={{padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#86efac'}}>
            <span className="pulse-dot" style={{display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#4ade80'}}/>
            Online · Toko DEWI
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="kp-mobile-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`kp-mobile-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
