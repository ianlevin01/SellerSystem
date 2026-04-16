// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";
import { ShoppingBag, Package, TrendingUp, Clock, ExternalLink, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { seller } = useAuth();
  const [orders, setOrders]           = useState([]);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      client.get("/seller/store/orders"),
      client.get("/seller/products?only_mine=true"),
    ]).then(([ordersRes, productsRes]) => {
      setOrders(ordersRes.data);
      setProductsCount(productsRes.data.length);
    }).finally(() => setLoading(false));
  }, []);

  const totalGanancia = orders.reduce((sum, o) => sum + Number(o.ganancia_vendedor || 0), 0);
  const pendingOrders = orders.filter(o => o.color === "pending").length;

  const stats = [
    { label: "Productos activos",  value: productsCount,              icon: Package,     color: "#5b52f0", bg: "#eeecff" },
    { label: "Pedidos totales",    value: orders.length,              icon: ShoppingBag, color: "#2563eb", bg: "#eff6ff" },
    { label: "Pendientes",         value: pendingOrders,              icon: Clock,       color: "#d97706", bg: "#fffbeb" },
    { label: "Ganancia total",     value: `$${fmt(totalGanancia)}`,   icon: TrendingUp,  color: "#16a34a", bg: "#f0fdf4" },
  ];

  const profileIncomplete = !seller?.city || !seller?.age || !seller?.how_found_us || !seller?.phone_verified;

  return (
    <div>
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
          <span><strong>Completá tu perfil</strong> — falta información requerida para operar.</span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>Completar →</span>
        </Link>
      )}

      <div className="page-header">
        <h1>Hola, {seller?.name?.split(" ")[0]} 👋</h1>
        <p>
          Tu tienda pública:{" "}
          <a href={`/store/${seller?.slug}`} target="_blank" rel="noreferrer"
             style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
            /{seller?.slug} <ExternalLink size={12} />
          </a>
        </p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <div className="stat-card" key={label} style={{ animationDelay: `${i * 60}ms` }}>
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

      {/* Últimos pedidos */}
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
                  <span className={`badge badge--${order.color === "green" ? "green" : order.color === "red" ? "red" : "pending"}`}
                    style={{ marginLeft: 8 }}>
                    {order.color}
                  </span>
                </div>
                <div className="order-preview-row__sub">
                  {order.customer_name || "Sin nombre"} ·{" "}
                  {new Date(order.created_at).toLocaleDateString("es-AR")}
                </div>
              </div>
              <div>
                <div className="order-preview-row__total">${fmt(order.total)}</div>
                <div className="order-preview-row__ganancia">+${fmt(order.ganancia_vendedor)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
