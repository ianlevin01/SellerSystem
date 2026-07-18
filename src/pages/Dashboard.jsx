// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";
import { ShoppingBag, Package, TrendingUp, Clock, ExternalLink, AlertTriangle } from "lucide-react";
import OnboardingChecklist from "../components/OnboardingChecklist";

function storeUrl(slug) {
  if (!slug) return "#";

  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}?shop=${slug}`;
  }

  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}`;
}

export default function Dashboard() {
  const { seller } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]           = useState([]);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [checklistShown, setChecklistShown] = useState(true);
  const [mlNeedsFirstListing, setMlNeedsFirstListing] = useState(false);
  const [mlBlockedDebt, setMlBlockedDebt] = useState(0);

  // Primer acceso: todavía no eligió si quiere vender por tienda propia o por Mercado Libre.
  // OJO: no redirigir acá a "/start" cuando falta onboarding_track — este efecto corre al
  // montar usando el `seller` cacheado en localStorage de sesiones viejas (de antes de que
  // este campo existiera), mientras AuthContext hace su propio fetch fresco en paralelo que
  // llega un instante después con el dato correcto. Como este efecto no se re-ejecuta, todos
  // los vendedores ya existentes quedaban atrapados en "/start" por ese falso negativo.
  useEffect(() => {
    if (!seller) return;

    // Track Mercado Libre: el paso obligatorio inicial es publicar el primer producto. Antes
    // esto sacaba al vendedor del Dashboard a la fuerza — ahora se queda en el Dashboard (que
    // es lo que espera ver al entrar) con un aviso, en vez de secuestrar la navegación.
    if (seller.onboarding_track === "mercadolibre") {
      client.get("/seller/ml/listings").then(res => {
        setMlNeedsFirstListing((res.data || []).length === 0);
      }).catch(() => {});
      client.get("/seller/ml/wallet").then(res => {
        setMlBlockedDebt(Number(res.data?.blockedDebt || 0));
      }).catch(() => {});
      return;
    }

    // Track ecommerce (comportamiento de siempre): si seller.slug es null (sin tiendas en
    // AuthContext), verificar con la API para confirmar antes de redirigir. Esto evita un
    // loop si el usuario acaba de crear su primera tienda pero AuthContext todavía no se actualizó.
    if (seller.slug) return;
    client.get("/seller/store/pages").then(res => {
      if (res.data.length === 0) {
        navigate("/pages?new=true", { replace: true });
      }
    }).catch(() => {});
  }, [seller]);

  useEffect(() => {
    Promise.all([
      client.get("/seller/store/orders"),
      client.get("/seller/products?only_mine=true"),
    ]).then(([ordersRes, productsRes]) => {
      setOrders(ordersRes.data);
      setProductsCount(productsRes.data.length);
    }).finally(() => setLoading(false));
  }, []);

  // Pedidos sin pago confirmado — no se les muestra ganancia porque todavía no es plata real.
  const isUnpaid = order => ["pending", "consultation"].includes(order.color || "pending");

  const totalGanancia = orders.filter(o => !isUnpaid(o)).reduce((sum, o) => sum + Number(o.ganancia_vendedor || 0), 0);
  const pendingOrders = orders.filter(o => o.color === "pending").length;

  const stats = [
    { label: "Productos activos",  value: productsCount,              icon: Package,     color: "#5b52f0", bg: "#eeecff" },
    { label: "Pedidos totales",    value: orders.length,              icon: ShoppingBag, color: "#2563eb", bg: "#eff6ff" },
    { label: "Pendientes",         value: pendingOrders,              icon: Clock,       color: "#d97706", bg: "#fffbeb" },
    { label: "Ganancia total",     value: `$${fmt(totalGanancia)}`,   icon: TrendingUp,  color: "#16a34a", bg: "#f0fdf4" },
  ];

  const profileIncomplete = !seller?.cvu;

  return (
    <div>
      {mlBlockedDebt > 0 && (
        <Link
          to="/mercado-libre"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#FEF2F2", border: "1px solid #FCA5A5",
            borderRadius: "var(--radius-md)", padding: "12px 16px",
            marginBottom: 20, color: "#7f1d1d", textDecoration: "none",
            fontSize: ".9rem",
          }}
        >
          <AlertTriangle size={16} color="#dc2626" />
          <span>
            <strong>Tenés ${fmt(mlBlockedDebt)} de deuda vencida en Mercado Libre</strong> — tus publicaciones están pausadas y tus pedidos no se pueden despachar hasta que la pagues.
          </span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>Pagar ahora →</span>
        </Link>
      )}

      {mlNeedsFirstListing && (
        <Link
          to="/mercado-libre"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#FFFBEA", border: "1px solid #FFE600",
            borderRadius: "var(--radius-md)", padding: "12px 16px",
            marginBottom: 20, color: "#2D3277", textDecoration: "none",
            fontSize: ".9rem",
          }}
        >
          <ShoppingBag size={16} color="#2D3277" />
          <span><strong>Publicá tu primer producto en Mercado Libre</strong> — conectá tu cuenta y elegí qué vender.</span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>Ir a Mercado Libre →</span>
        </Link>
      )}

      {profileIncomplete && (
        <Link
          to="/profile"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: "var(--radius-md)", padding: "12px 16px",
            marginBottom: 20, color: "#92400e", textDecoration: "none",
            fontSize: ".9rem",
          }}
        >
          <AlertTriangle size={16} color="#d97706" />
          <span><strong>Configurá tu CVU</strong> — necesitás un CVU para poder recibir cobros.</span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>Completar →</span>
        </Link>
      )}

      <div className="welcome-banner">
        <div className="welcome-banner__content">
          <div className="welcome-banner__greeting">Bienvenido de vuelta</div>
          <h1 className="welcome-banner__name">{seller?.name?.split(" ")[0] || "Vendedor"}</h1>
          {seller?.slug && (
            <a href={storeUrl(seller.slug)} target="_blank" rel="noreferrer"
               className="welcome-banner__store-link">
              <ExternalLink size={12} />
              Ver tienda pública
            </a>
          )}
        </div>

        <div className="welcome-banner__social">
          <a href="https://chat.whatsapp.com/I9o3OsMEeqC7R8WUFTlU3E" target="_blank" rel="noreferrer" className="welcome-banner__social-btn welcome-banner__social-btn--wa">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.554 4.103 1.523 5.828L.057 23.428a.75.75 0 0 0 .916.916l5.635-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.715 9.715 0 0 1-4.964-1.363l-.355-.211-3.684.96.984-3.595-.232-.371A9.715 9.715 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            Canal de WhatsApp
          </a>
          <a href="https://www.instagram.com/ventaz.oficial/" target="_blank" rel="noreferrer" className="welcome-banner__social-btn welcome-banner__social-btn--ig">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
            Seguir en Instagram
          </a>
        </div>

        <div className="welcome-banner__shapes" aria-hidden="true">
          <div className="welcome-banner__shape welcome-banner__shape--1" />
          <div className="welcome-banner__shape welcome-banner__shape--2" />
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <div className="stat-card" key={label} style={{ animationDelay: `${i * 60}ms`, '--stat-color': color }}>
            <div className="stat-card__icon" style={{ background: bg }}>
              <Icon size={16} color={color} />
            </div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">
              {loading ? <span className="skeleton" style={{ display: "inline-block", width: 60, height: 26 }} /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Checklist + Últimos pedidos */}
      <div className="dash-bottom-grid" data-checklist={checklistShown ? "true" : "false"}>
        {checklistShown && (
          <OnboardingChecklist onHide={() => setChecklistShown(false)} />
        )}

        <div className="card">
          <div className="section-header">
            <h2>Últimos pedidos</h2>
            <Link to="/orders" className="btn btn--ghost btn--sm">Ver todos →</Link>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">Aún no tenés pedidos.</div>
          ) : (
            orders.slice(0, 5).map(order => (
              <div key={order.id} className="order-preview-row">
                <div>
                  <div className="order-preview-row__title">
                    Pedido #{order.numero}
                    <span className={`badge badge--${order.color === "paid" ? "green" : order.color === "rejected" || order.color === "cancelled" ? "red" : "pending"}`}
                      style={{ marginLeft: 8 }}>
                      {order.color === "paid" ? "Pagado" : order.color === "pending" ? "Pendiente" : order.color === "rejected" ? "Rechazado" : order.color === "cancelled" ? "Cancelado" : order.color}
                    </span>
                  </div>
                  <div className="order-preview-row__sub">
                    {order.customer_name || "Sin nombre"} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <div>
                  <div className="order-preview-row__total">${fmt(order.total)}</div>
                  {isUnpaid(order) ? (
                    <div className="order-preview-row__ganancia" style={{ color: "var(--text-secondary, #999)" }}>Pago pendiente</div>
                  ) : (
                    <div className="order-preview-row__ganancia">+${fmt(order.ganancia_vendedor)}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
