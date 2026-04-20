// src/components/Layout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  LayoutDashboard, Package, ShoppingBag,
  Calculator, LogOut, ExternalLink, Store, Zap, User, MessageSquare, Percent
} from "lucide-react";

const nav = [
  { to: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard },
  { to: "/products",     label: "Mis productos",  icon: Package },
  { to: "/orders",       label: "Mis pedidos",    icon: ShoppingBag },
  { to: "/store-config", label: "Mi tienda",      icon: Store },
  { to: "/discounts",    label: "Descuentos",     icon: Percent },
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

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">
            <div className="sidebar__logo-icon">
              <Zap size={16} />
            </div>
            <span className="sidebar__app-name">Vendedores</span>
          </div>
          <div className="sidebar__store-name">
            {seller?.store_name || seller?.name || "Mi tienda"}
          </div>
        </div>

        <nav className="sidebar__nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
          {seller?.slug && (
            <a
              href={storeUrl(seller.slug)}
              target="_blank"
              rel="noreferrer"
              className="sidebar__footer-btn"
            >
              <ExternalLink size={15} />
              Ver mi tienda
            </a>
          )}
          <button className="sidebar__footer-btn" onClick={handleLogout}>
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
