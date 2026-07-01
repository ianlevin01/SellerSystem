// src/components/Layout.jsx — trigger deploy
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import AiAssistant from "./AiAssistant";
import TrialWelcomeModal, { TrialExpiredModal } from "./TrialWelcomeModal";
import HowToUse from "./HowToUse";
import GuidedTour, { GuidedTourStyles } from "./GuidedTour";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";
import {
  LayoutDashboard, ShoppingBag,
  Calculator, LogOut, ExternalLink, Layers, User, MessageSquare, ChevronUp, ChevronLeft, ChevronRight,
  Store, Wallet, Menu, X, Puzzle, Info, Mail, FileText, GraduationCap, BarChart2, Megaphone
} from "lucide-react";

const ACADEMY_URL = import.meta.env.VITE_ACADEMY_URL || "https://academia.ventaz.com.ar";
const ACADEMY_TOOLTIP_KEY = "academy_new_courses_v1";

// Publicidad todavía no pasó la revisión de Meta — visible solo para la cuenta de prueba.
const BETA_SELLER_EMAIL = "yolodercye@gmail.com";

const nav = [
  { to: "/dashboard",    label: "Dashboard",      icon: LayoutDashboard },
  { to: "/pages",        label: "Mis tiendas",    icon: Layers },
  { to: "/orders",       label: "Mis pedidos",    icon: ShoppingBag },
  { to: "/estadisticas", label: "Estadísticas",   icon: BarChart2   },
  { to: "/cobros",       label: "Cobros",         icon: Wallet },
  { to: "/publicidad",   label: "Publicidad",      icon: Megaphone },
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
  const visibleNav = nav.filter(item => item.to !== "/publicidad" || seller?.email === BETA_SELLER_EMAIL);
  const [pages, setPages]               = useState([]);
  const [storeOpen, setStoreOpen]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [adminUnread, setAdminUnread]   = useState(0);
  const [collapsed, setCollapsed]       = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const [planInfo,       setPlanInfo]       = useState(null);
  const [showWelcome,    setShowWelcome]    = useState(false);
  const [welcomeDays,    setWelcomeDays]    = useState(15);
  const [showExpired,    setShowExpired]    = useState(false);
  const [showAcademyTip, setShowAcademyTip] = useState(() => !localStorage.getItem(ACADEMY_TOOLTIP_KEY));
  const storeRef                        = useRef(null);
  const academyRef                      = useRef(null);

  function toggleCollapse() {
    setCollapsed(prev => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  function isPlanBlocked(current) {
    if (!current) return false;
    if (current.plan_status === "expired") return true;
    if (current.plan_status === "trial" && current.trial_ends_at && new Date(current.trial_ends_at) < new Date()) return true;
    return false;
  }

  useEffect(() => {
    client.get("/seller/store/pages").then(r => setPages(r.data)).catch(() => {});
    client.get("/seller/subscriptions/status").then(r => {
      const current = r.data?.current;
      setPlanInfo(current);
      // Popup de bienvenida: trial activo, primera vez en este dispositivo
      if (current?.plan_status === "trial" && !localStorage.getItem("ventaz_welcome_shown")) {
        const days = current.trial_ends_at
          ? Math.max(0, Math.ceil((new Date(current.trial_ends_at) - new Date()) / 86400000))
          : 15;
        setWelcomeDays(days);
        setShowWelcome(true);
        localStorage.setItem("ventaz_welcome_shown", "1");
      }
      // Popup de expirado: trial vencido, primera vez en este dispositivo
      const trialExpired = current?.plan_status === "expired" ||
        (current?.plan_status === "trial" && current?.trial_ends_at && new Date(current.trial_ends_at) < new Date());
      if (trialExpired && !localStorage.getItem("ventaz_expired_shown")) {
        setShowExpired(true);
        localStorage.setItem("ventaz_expired_shown", "1");
      }
      const freeRoutes = ["/subscription", "/contact", "/cobros"];
      if (isPlanBlocked(current) && !freeRoutes.includes(location.pathname)) {
        navigate("/subscription", { replace: true });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function fetchUnread() {
      client.get("/seller/chat/admin/unread").then(r => {
        setAdminUnread(typeof r.data === "number" ? r.data : (r.data?.unread || 0));
      }).catch(() => {});
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setStoreOpen(false);
    const freeRoutes = ["/subscription", "/contact", "/cobros"];
    if (isPlanBlocked(planInfo) && !freeRoutes.includes(location.pathname)) {
      navigate("/subscription", { replace: true });
    }
  }, [location.pathname, planInfo]);

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
    <div className={`layout ${mobileOpen ? "layout--mobile-open" : ""} ${collapsed ? "layout--sidebar-collapsed" : ""}`}>
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
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt={seller?.name || "Usuario"} />
          ) : (
            (seller?.name?.[0] || "V").toUpperCase()
          )}
        </div>
      </header>

      <button
        type="button"
        className={`mobile-sidebar-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Cerrar menú"
      />

      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""} ${collapsed ? "sidebar--collapsed" : ""}`}>
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
            <button
              type="button"
              className="sidebar__collapse-btn"
              onClick={toggleCollapse}
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
              title={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>

        <div className="sidebar__avatar">
          <div className="sidebar__avatar-img">
            {seller?.avatar_url ? (
              <img src={seller.avatar_url} alt={seller?.name || "Usuario"} />
            ) : (
              (seller?.name?.[0] || "V").toUpperCase()
            )}
          </div>
          <div className="sidebar__avatar-info">
            <div className="sidebar__avatar-name">{seller?.name || "Vendedor"}</div>
            <div className="sidebar__avatar-status">
              <span className="sidebar__avatar-dot" />
              En línea
            </div>
          </div>
        </div>

        {/* ── Plan widget ──────────────────────────── */}
        {planInfo && (
          <NavLink
            to="/subscription"
            onClick={() => setMobileOpen(false)}
            className="sidebar__plan-widget"
            title={collapsed ? `Plan: ${planInfo.plan_name || "Inicial"}` : undefined}
          >
            <div className="sidebar__plan-info">
              <span className="sidebar__plan-name">{planInfo.plan_name || "Plan Inicial"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`sidebar__plan-status sidebar__plan-status--${planInfo.plan_status}`}>
                  {planInfo.plan_status === "trial"           && "En período de prueba"}
                  {planInfo.plan_status === "active"          && "Activo"}
                  {planInfo.plan_status === "cancelled"       && "Cancelado"}
                  {planInfo.plan_status === "expired"         && "Expirado"}
                  {planInfo.plan_status === "pending_payment" && "Pago pendiente"}
                </span>
                {planInfo.plan_status === "trial" && planInfo.trial_ends_at && (() => {
                  const days = Math.max(0, Math.ceil((new Date(planInfo.trial_ends_at) - new Date()) / 86400000));
                  return <span className="sidebar__trial-days">{days} días</span>;
                })()}
              </div>
            </div>
          </NavLink>
        )}

        <nav className="sidebar__nav">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                "sidebar__link" + (isActive ? " active" : "")
              }
            >
              <Icon size={15} />
              <span className="sidebar__label">{label}</span>
            </NavLink>
          ))}
          {/* Academia — enlace externo con token */}
          <a
            ref={academyRef}
            href={`${ACADEMY_URL}?token=${localStorage.getItem("seller_token") || ""}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => { setMobileOpen(false); setShowAcademyTip(false); localStorage.setItem(ACADEMY_TOOLTIP_KEY, "1"); }}
            className="sidebar__link"
            title={collapsed ? "Academia" : undefined}
          >
            <GraduationCap size={15} />
            <span className="sidebar__label">Academia</span>
          </a>
          {showAcademyTip && !collapsed && (() => {
            const rect = academyRef.current?.getBoundingClientRect();
            if (!rect) return null;
            return (
              <div className="academy-tip" style={{ top: rect.top + rect.height / 2, left: rect.right + 12 }}>
                <span className="academy-tip__arrow" />
                <div className="academy-tip__body">
                  <span className="academy-tip__badge">¡Nuevo!</span>
                  <p className="academy-tip__text">Los primeros cursos ya están disponibles</p>
                  <button
                    className="academy-tip__close"
                    onClick={() => { setShowAcademyTip(false); localStorage.setItem(ACADEMY_TOOLTIP_KEY, "1"); }}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            );
          })()}
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
                title={collapsed ? "Ver mis tiendas" : undefined}
              >
                <Store size={15} />
                <span className="sidebar__label">Ver mis tiendas</span>
                <ChevronUp
                  size={12}
                  className="sidebar__label"
                  style={{ marginLeft: "auto", transition: "transform .2s", transform: storeOpen ? "rotate(0deg)" : "rotate(180deg)" }}
                />
              </button>
            </div>
          )}
          <div className="sidebar__info-links">
            <NavLink to="/about" onClick={() => setMobileOpen(false)} title={collapsed ? "Quiénes somos" : undefined} className={({ isActive }) => "sidebar__footer-btn sidebar__footer-link" + (isActive ? " active" : "")}>
              <Info size={15} />
              <span className="sidebar__label">Quiénes somos</span>
            </NavLink>
            <NavLink to="/contact" onClick={() => { setMobileOpen(false); setAdminUnread(0); }} title={collapsed ? "Contacto" : undefined} className={({ isActive }) => "sidebar__footer-btn sidebar__footer-link" + (isActive ? " active" : "")}>
              <Mail size={15} />
              <span className="sidebar__label">Contacto</span>
              {adminUnread > 0 && (
                <span className="sidebar__link-badge">{adminUnread}</span>
              )}
            </NavLink>
            <NavLink to="/legal" onClick={() => setMobileOpen(false)} title={collapsed ? "Legal y privacidad" : undefined} className={({ isActive }) => "sidebar__footer-btn sidebar__footer-link" + (isActive ? " active" : "")}>
              <FileText size={15} />
              <span className="sidebar__label">Legal y privacidad</span>
            </NavLink>
          </div>

          <button type="button" className="sidebar__footer-btn" onClick={handleLogout} title={collapsed ? "Cerrar sesión" : undefined}>
            <LogOut size={15} />
            <span className="sidebar__label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="layout__main">
        {(() => {
          if (!planInfo) return null;
          const { plan_status, trial_ends_at, plan_period_end } = planInfo;
          let days = null;
          let msg  = null;

          if (plan_status === "trial" && trial_ends_at) {
            days = Math.max(0, Math.ceil((new Date(trial_ends_at) - new Date()) / 86400000));
            if (days > 0) msg = `Estás en el período de prueba. Te quedan ${days} día${days === 1 ? "" : "s"} gratis del Plan Inicial.`;
          } else if (plan_status === "cancelled" && plan_period_end) {
            days = Math.max(0, Math.ceil((new Date(plan_period_end) - new Date()) / 86400000));
            if (days <= 30 && days > 0) msg = `Cancelaste tu suscripción. Perdés el acceso en ${days} día${days === 1 ? "" : "s"}.`;
          }

          if (!msg) return null;
          return (
            <div className="plan-warning-banner">
              <span className="plan-warning-banner__text">{msg}</span>
              <NavLink to="/subscription" className="plan-warning-banner__btn">
                Actualizar plan
              </NavLink>
            </div>
          );
        })()}
        <Outlet />
      </main>

      <AiAssistant />
      <HowToUse />
      <GuidedTour />
      <GuidedTourStyles />
      {showWelcome && <TrialWelcomeModal days={welcomeDays} onClose={() => setShowWelcome(false)} />}
      {showExpired && <TrialExpiredModal onClose={() => setShowExpired(false)} />}

    </div>
  );
}
