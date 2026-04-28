// src/pages/Orders.jsx
// Pedidos premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import "../styles/Orders.css";
import {
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const PCT_LEVELS = [
  { min: 0, max: 100000, pct: 40, label: "hasta $100k" },
  { min: 100000, max: 500000, pct: 45, label: "$100k a $500k" },
  { min: 500000, max: 1000000, pct: 50, label: "$500k a $1M" },
  { min: 1000000, max: Infinity, pct: 60, label: "más de $1M" },
];

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "green", label: "Confirmados" },
  { key: "blue", label: "En proceso" },
  { key: "red", label: "Con problema" },
];

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
}

function money(n) {
  return `$${fmt(n)}`;
}

function dateFmt(d) {
  if (!d) return "Sin fecha";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function timeFmt(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(order) {
  const color = order.color || "pending";

  const map = {
    green: {
      label: "Confirmado",
      tone: "green",
      icon: BadgeCheck,
      description: "El pedido está confirmado.",
    },
    blue: {
      label: "En proceso",
      tone: "blue",
      icon: PackageCheck,
      description: "El pedido está siendo gestionado.",
    },
    red: {
      label: "Con problema",
      tone: "red",
      icon: Clock3,
      description: "Revisá este pedido.",
    },
    pending: {
      label: "Pendiente",
      tone: "pending",
      icon: Clock3,
      description: "Todavía necesita seguimiento.",
    },
  };

  return map[color] || map.pending;
}

function calcPct(order) {
  return Number(order.pct_ganancia || 0) * 100;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    client
      .get("/seller/store/orders")
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalGanancia = orders.reduce(
      (sum, order) => sum + Number(order.ganancia_vendedor || 0),
      0
    );

    const totalVenta = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const pendientes = orders.filter((order) => (order.color || "pending") === "pending").length;

    return {
      totalGanancia,
      totalVenta,
      totalPedidos: orders.length,
      pendientes,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const status = order.color || "pending";
      const matchesFilter = filter === "all" || status === filter;

      const matchesSearch =
        !query ||
        String(order.numero || "").toLowerCase().includes(query) ||
        String(order.customer_name || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, search]);

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <main className="vtz-orders">
      <section className="vtz-orders-hero">
        <div>
          <span className="vtz-orders-kicker">
            <Sparkles size={16} />
            Mis pedidos
          </span>
          <h1>Controlá tus ventas</h1>
          <p>
            Revisá cada pedido, entendé tu ganancia y seguí el estado de las ventas
            realizadas desde tu tienda.
          </p>
        </div>

        <div className="vtz-orders-hero__status">
          <ShoppingBag size={22} />
          <div>
            <strong>{stats.totalPedidos} pedidos</strong>
            <span>{stats.pendientes} pendientes</span>
          </div>
        </div>
      </section>

      <section className="vtz-orders-stats">
        <article className="vtz-orders-stat vtz-orders-stat--main">
          <CircleDollarSign size={24} />
          <span>Ganancia acumulada</span>
          <strong>{money(stats.totalGanancia)}</strong>
        </article>

        <article className="vtz-orders-stat">
          <TrendingUp size={24} />
          <span>Total vendido</span>
          <strong>{money(stats.totalVenta)}</strong>
        </article>

        <article className="vtz-orders-stat">
          <ClipboardList size={24} />
          <span>Cantidad de pedidos</span>
          <strong>{stats.totalPedidos}</strong>
        </article>
      </section>

      <section className="vtz-orders-content">
        <aside className="vtz-orders-side">
          <div className="vtz-orders-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o pedido..."
            />
          </div>

          <div className="vtz-orders-filters">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={filter === item.key ? "is-active" : ""}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="vtz-orders-scale">
            <div className="vtz-orders-scale__head">
              <span>Escala</span>
              <strong>Comisiones</strong>
            </div>

            {PCT_LEVELS.map((level) => (
              <div key={level.pct} className="vtz-orders-tier">
                <b>{level.pct}%</b>
                <span>{level.label}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="vtz-orders-list-wrap">
          <div className="vtz-orders-list-head">
            <div>
              <span>Lista de pedidos</span>
              <strong>{filteredOrders.length} resultados</strong>
            </div>
          </div>

          {loading ? (
            <div className="vtz-orders-loading">
              {[1, 2, 3].map((item) => (
                <div key={item} className="vtz-orders-skeleton" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="vtz-orders-empty">
              <ShoppingBag size={34} />
              <h2>Aún no tenés pedidos</h2>
              <p>Cuando alguien compre desde tu tienda, lo vas a ver en esta pantalla.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="vtz-orders-empty">
              <Search size={34} />
              <h2>No encontramos pedidos</h2>
              <p>Probá con otro filtro o buscá por nombre del cliente.</p>
            </div>
          ) : (
            <div className="vtz-orders-list">
              {filteredOrders.map((order, index) => {
                const isOpen = !!expanded[order.id];
                const status = getStatus(order);
                const StatusIcon = status.icon;
                const pct = calcPct(order);

                return (
                  <article
                    key={order.id}
                    className={`vtz-order ${isOpen ? "is-open" : ""}`}
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <button
                      type="button"
                      className="vtz-order__summary"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <div className="vtz-order__main">
                        <span className="vtz-order__number">Pedido #{order.numero}</span>
                        <strong>{order.customer_name || "Cliente sin nombre"}</strong>
                        <small>
                          {dateFmt(order.created_at)}
                          {order.created_at ? ` · ${timeFmt(order.created_at)}` : ""}
                        </small>
                      </div>

                      <div className={`vtz-order-status vtz-order-status--${status.tone}`}>
                        <StatusIcon size={15} />
                        {status.label}
                      </div>

                      <div className="vtz-order__money">
                        <span>Total</span>
                        <strong>{money(order.total)}</strong>
                        <small>+{money(order.ganancia_vendedor)} de ganancia</small>
                      </div>

                      <ChevronDown className="vtz-order__chevron" size={22} />
                    </button>

                    {isOpen && (
                      <div className="vtz-order__detail">
                        <div className="vtz-order__detail-grid">
                          <div className="vtz-order__items">
                            <h3>Artículos</h3>

                            {(order.items || []).length === 0 ? (
                              <p className="vtz-order__no-items">Sin artículos cargados</p>
                            ) : (
                              (order.items || []).map((item, idx) => (
                                <div key={`${item.name}-${idx}`} className="vtz-order-item">
                                  <span>{item.name}</span>
                                  <strong>
                                    {item.quantity} × {money(item.unit_price)}
                                  </strong>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="vtz-order__resume">
                            <h3>Resumen</h3>

                            <div>
                              <span>Diferencia bruta</span>
                              <strong>{money(order.ganancia_bruta)}</strong>
                            </div>

                            <div className="is-highlight">
                              <span>Tu comisión {Number.isFinite(pct) ? `(${pct.toFixed(0)}%)` : ""}</span>
                              <strong>{money(order.ganancia_vendedor)}</strong>
                            </div>

                            <p>
                              {status.description} El detalle te ayuda a entender cuánto ganaste en
                              esta venta.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
