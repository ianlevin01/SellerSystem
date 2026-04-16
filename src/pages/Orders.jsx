// src/pages/Orders.jsx
import { useEffect, useState } from "react";
import client from "../api/client";
import { ChevronDown } from "lucide-react";

const PCT_LEVELS = [
  { min: 0,       max: 100000,   pct: 40, label: "hasta $100k" },
  { min: 100000,  max: 500000,   pct: 45, label: "$100k – $500k" },
  { min: 500000,  max: 1000000,  pct: 50, label: "$500k – $1M" },
  { min: 1000000, max: Infinity, pct: 60, label: "más de $1M" },
];

export default function Orders() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    client.get("/seller/store/orders")
      .then(res => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  const totalGanancia = orders.reduce((sum, o) => sum + Number(o.ganancia_vendedor || 0), 0);

  function toggleExpand(id) {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mis pedidos</h1>
        <p>Solo los pedidos realizados desde tu tienda.</p>
      </div>

      {/* Escala */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14, fontSize: ".8125rem", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-tertiary)" }}>
          Escala de comisiones
        </h2>
        <div className="commission-scale">
          {PCT_LEVELS.map(l => (
            <div key={l.pct} className="commission-tier">
              <span className="commission-tier__pct">{l.pct}%</span>
              <span className="commission-tier__range">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total ganancia */}
      <div className="ganancia-card">
        <div>
          <div className="ganancia-card__label">Ganancia total acumulada</div>
          <div className="ganancia-card__value">${fmt(totalGanancia)}</div>
        </div>
        <div className="ganancia-card__count">{orders.length} pedidos</div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">Aún no tenés pedidos.</div>
      ) : (
        <div className="orders-list">
          {orders.map((order, i) => {
            const isOpen = expanded[order.id];
            return (
              <div key={order.id} className="order-row" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="order-row__header" onClick={() => toggleExpand(order.id)}>
                  <div className="order-row__left">
                    <span className="order-row__number">Pedido #{order.numero}</span>
                    <span className={`badge badge--${order.color === "green" ? "green" : order.color === "red" ? "red" : order.color === "blue" ? "blue" : "pending"}`}>
                      {order.color}
                    </span>
                    <span className="order-row__customer">{order.customer_name || "Sin nombre"}</span>
                    <span className="order-row__date">{new Date(order.created_at).toLocaleDateString("es-AR")}</span>
                  </div>
                  <div className="order-row__right">
                    <div>
                      <div className="order-row__total">${fmt(order.total)}</div>
                      <div className="order-row__ganancia">
                        +${fmt(order.ganancia_vendedor)} ({(order.pct_ganancia * 100).toFixed(0)}%)
                      </div>
                    </div>
                    <ChevronDown className={`order-row__chevron${isOpen ? " order-row__chevron--open" : ""}`} />
                  </div>
                </div>

                {isOpen && (
                  <div className="order-row__detail">
                    <div className="order-row__items-title">Artículos</div>
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="order-row__item">
                        <span className="order-row__item-name">{item.name}</span>
                        <span className="order-row__item-qty">
                          {item.quantity} × ${fmt(item.unit_price)}
                        </span>
                      </div>
                    ))}
                    <div className="order-row__summary">
                      <div className="order-row__summary-row">
                        <span>Diferencia bruta</span>
                        <span>${fmt(order.ganancia_bruta)}</span>
                      </div>
                      <div className="order-row__summary-row order-row__summary-row--highlight">
                        <span>Tu comisión ({(order.pct_ganancia * 100).toFixed(0)}%)</span>
                        <span>${fmt(order.ganancia_vendedor)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
