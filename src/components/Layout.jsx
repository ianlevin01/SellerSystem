// src/components/Layout.jsx
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import AiAssistant from "./AiAssistant";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";
import {
  LayoutDashboard, ShoppingBag,
  Calculator, LogOut, ExternalLink, Layers, User, MessageSquare, ChevronUp, Store, Wallet, Menu, X, Puzzle
} from "lucide-react";

const nav = [
  { to: "/dashboard",    label: "Dashboard",      icon: LayoutDashboard },
  { to: "/pages",        label: "Mis tiendas",    icon: Layers },
  { to: "/orders",       label: "Mis pedidos",    icon: ShoppingBag },
  { to: "/cobros",       label: "Cobros",         icon: Wallet },
  { to: "/integrations", label: "Integraciones",  icon: Puzzle },
  { to: "/chat",         label: "Chat",           icon: MessageSquare },
  { to: "/calculator",   label: "Calculadora",    icon: Calculator },
  { to: "/profile",      label: "Mi perfil",      icon: User },
];

/**
 * En desarrollo apunta a SellerPage en localhost:5174 con ?shop=slug.
 * En producción genera la URL del subdominio real.
 */
function storeUrl(slug) {
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}?shop=${slug}`;
  }
  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}`;
}

export default function Layout() {
  const { seller, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pages, setPages]         = useState([]);
  const [storeOpen, setStoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const storeRef                  = useRef(null);

  useEffect(() => {
    client.get("/seller/store/pages").then(r => setPages(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setStoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-menu-open", mobileOpen);
    return () => document.body.classList.remove("mobile-menu-open");
  }, [mobileOpen]);

  useEffect(() => {
    if (!storeOpen) return;
    function onOutside(e) {
      if (storeRef.current && !storeRef.current.contains(e.target)) setStoreOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [storeOpen]);

  function handleLogout() {
    setMobileOpen(false);
    logout();
    navigate("/login");
  }

  return (
    <div className={`layout ${mobileOpen ? "layout--mobile-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-topbar__menu"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <div className="mobile-topbar__brand">
          <img src="/ventaz.png" alt="Ventaz" />
          <span>Panel</span>
        </div>

        <div className="mobile-topbar__avatar">
          {(seller?.name?.[0] || "V").toUpperCase()}
        </div>
      </header>

      <button
        type="button"
        className={`mobile-sidebar-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Cerrar menú"
      />

      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <button
          type="button"
          className="sidebar__mobile-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">
            <img src="/ventaz.png" alt="Ventaz" style={{ height: 32, objectFit: "contain" }} />
          </div>
          <div className="sidebar__store-name">
            {seller?.store_name || seller?.name || "Mi tienda"}
          </div>
        </div>

        <div className="sidebar__avatar">
          <div className="sidebar__avatar-img">
            {(seller?.name?.[0] || "V").toUpperCase()}
          </div>
          <div className="sidebar__avatar-info">
            <div className="sidebar__avatar-name">{seller?.name || "Vendedor"}</div>
            <div className="sidebar__avatar-status">
              <span className="sidebar__avatar-dot" />
              En línea
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                "sidebar__link" + (isActive ? " active" : "")
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          {pages.length > 0 && (
            <div className="sidebar__store-picker" ref={storeRef}>
              {storeOpen && (
                <div className="sidebar__store-menu">
                  {pages.map(page => (
                    <a
                      key={page.id}
                      href={storeUrl(page.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="sidebar__store-item"
                      onClick={() => { setStoreOpen(false); setMobileOpen(false); }}
                    >
                      <ExternalLink size={12} />
                      <span>{page.store_name || page.page_name}</span>
                    </a>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={`sidebar__footer-btn${storeOpen ? " sidebar__footer-btn--active" : ""}`}
                onClick={() => setStoreOpen(p => !p)}
              >
                <Store size={15} />
                Ver mis tiendas
                <ChevronUp
                  size={12}
                  style={{ marginLeft: "auto", transition: "transform .2s", transform: storeOpen ? "rotate(0deg)" : "rotate(180deg)" }}
                />
              </button>
            </div>
          )}
          <button type="button" className="sidebar__footer-btn" onClick={handleLogout}>
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="layout__main">
        <Outlet />
      </main>

      <AiAssistant />
    </div>
  );
}
