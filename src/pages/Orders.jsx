// src/pages/Orders.jsx
// Pedidos premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import "../styles/Orders.css";
import {
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Loader2,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  TrendingUp,
  XCircle,
  Undo2,
} from "lucide-react";

const FILTERS = [
  { key: "all",          label: "Todos" },
  { key: "pending",      label: "Pendientes" },
  { key: "consultation", label: "A confirmar" },
  { key: "paid",         label: "Pagados (MP)" },
  { key: "green",        label: "Confirmados" },
  { key: "blue",         label: "En proceso" },
  { key: "red",          label: "Con problema" },
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

// Pedidos sin pago confirmado, o que dejaron de ser una venta real (cancelados/reembolsados) —
// no se les muestra ganancia en ningún caso.
function isUnpaid(order) {
  return ["pending", "consultation", "cancelled", "refunded", "rejected"].includes(order.color || "pending");
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
    paid: {
      label: "Pagado",
      tone: "green",
      icon: BadgeCheck,
      description: "Pago confirmado por MercadoPago.",
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
    consultation: {
      label: "Pendiente de confirmación",
      tone: "consultation",
      icon: Clock3,
      description: "Pago y envío pendientes de coordinación con el comprador.",
    },
    packaged: {
      label: "Empaquetado",
      tone: "blue",
      icon: PackageCheck,
      description: "El pedido está empaquetado y siendo preparado para el despacho.",
    },
    shipped: {
      label: "Enviado",
      tone: "green",
      icon: Truck,
      description: "El pedido fue despachado por Correo Argentino.",
    },
    cancelled: {
      label: "Cancelado",
      tone: "red",
      icon: XCircle,
      description: "El pedido se canceló y no se concretó la venta.",
    },
    refunded: {
      label: "Reembolsado",
      tone: "red",
      icon: Undo2,
      description: "Se procesó una devolución para este pedido.",
    },
    rejected: {
      label: "Rechazado",
      tone: "red",
      icon: XCircle,
      description: "El pago fue rechazado.",
    },
  };

  return map[color] || map.pending;
}

const PAGE_SIZE = 30;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  // Tarjetas de totales (Ganancia acumulada, Total vendido, Cantidad de pedidos, Pendientes) —
  // sobre TODOS los pedidos del vendedor, no solo los ya cargados en pantalla (ver
  // /seller/store/orders/stats) — independiente de la paginación y de filtro/búsqueda.
  const [stats, setStats] = useState({ totalGanancia: 0, totalVenta: 0, totalPedidos: 0, pendientes: 0 });
  const debounceRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    client.get("/seller/store/orders/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  // Antes esto traía TODOS los pedidos de una — con varios cientos, la pantalla tardaba
  // muchísimo en cargar. Ahora trae de a PAGE_SIZE, y filter/search se resuelven en el backend
  // (así la búsqueda encuentra un pedido aunque todavía no se haya scrolleado hasta ahí).
  function fetchOrders(offset) {
    const setLoadingState = offset === 0 ? setLoading : setLoadingMore;
    setLoadingState(true);
    const params = { limit: PAGE_SIZE, offset };
    if (filter !== "all") params.status = filter;
    if (search.trim()) params.search = search.trim();
    client.get("/seller/store/orders", { params })
      .then(res => {
        const { orders: page, total: newTotal, hasMore: more } = res.data;
        setOrders(prev => offset === 0 ? page : [...prev, ...page.filter(o => !prev.some(p => p.id === o.id))]);
        setTotal(newTotal);
        setHasMore(more);
      })
      .finally(() => setLoadingState(false));
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setHasMore(false); // desconecta el observer mientras cambian los filtros, evita loadMore con filtros viejos
    debounceRef.current = setTimeout(() => fetchOrders(0), search.trim() ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  // Scroll infinito — mismo patrón que ya se usa en Catálogo/Publicar.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchOrders(orders.length); },
      { rootMargin: "300px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, orders.length]);

  const filteredOrders = orders; // el filtro/búsqueda ya se aplicó en el backend

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
              <TrendingUp size={15} />
              <strong>Costos por volumen</strong>
            </div>
            <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.4 }}>
              Cuanto más vendés, más bajo es el costo de los productos — y mayor tu ganancia.
            </p>
            <div className="vtz-orders-tier"><span>Hasta $100.000 vendidos</span><b>Costo base</b></div>
            <div className="vtz-orders-tier"><span>+$100.000 vendidos</span><b>Costo reducido</b></div>
            <div className="vtz-orders-tier"><span>+$250.000 vendidos</span><b>Costo muy reducido</b></div>
            <div className="vtz-orders-tier"><span>+$500.000 vendidos</span><b>Costo mínimo</b></div>
          </div>
        </aside>

        <section className="vtz-orders-list-wrap">
          <div className="vtz-orders-list-head">
            <div>
              <span>Lista de pedidos</span>
              <strong>{total} resultados</strong>
            </div>
          </div>

          {loading ? (
            <div className="vtz-orders-loading">
              {[1, 2, 3].map((item) => (
                <div key={item} className="vtz-orders-skeleton" />
              ))}
            </div>
          ) : total === 0 && filter === "all" && !search.trim() ? (
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
                        <span className="vtz-order__number">
                          Pedido #{order.numero}
                          {order.channel === "mercadolibre" && (
                            <span style={{
                              marginLeft: 8, fontSize: ".68rem", fontWeight: 700, padding: "2px 8px",
                              borderRadius: 99, background: "#FFE600", color: "#2D3277", verticalAlign: "middle",
                            }}>
                              Mercado Libre
                            </span>
                          )}
                        </span>
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
                        {isUnpaid(order) ? (
                          <small style={{ color: "var(--text-tertiary, #999)" }}>Pago pendiente</small>
                        ) : (
                          <small style={{ color: "var(--success, #16a34a)" }}>+{money(order.ganancia_vendedor)} ganancia</small>
                        )}
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

                            {Number(order.shipping_amount) > 0 && (
                              <div className="vtz-order-item" style={{ color: "var(--text-secondary, #666)" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Truck size={13} />
                                  {order.shipping?.service_name || "Envío"}
                                  {order.shipping?.shipping_type === "branch"
                                    ? " — Sucursal"
                                    : order.shipping?.shipping_type === "home"
                                      ? " — Domicilio"
                                      : ""}
                                </span>
                                <strong>{money(order.shipping_amount)}</strong>
                              </div>
                            )}
                          </div>

                          <div className="vtz-order__resume">
                            <h3>Resumen</h3>

                            <div>
                              <span>Total vendido</span>
                              <strong>{money(order.total)}</strong>
                            </div>

                            {Number(order.shipping_amount) > 0 && (
                              <div>
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Truck size={13} /> Envío cobrado al cliente
                                </span>
                                <strong>+ {money(order.shipping_amount)}</strong>
                              </div>
                            )}

                            {Number(order.free_shipping_absorbed) > 0 && (
                              <div style={{ color: "var(--error, #dc2626)" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Truck size={13} /> Costo de envío gratis
                                </span>
                                <strong>− {money(order.free_shipping_absorbed)}</strong>
                              </div>
                            )}

                            {order.channel === "mercadolibre" && !isUnpaid(order) && (
                              <>
                                {Number(order.costo_producto) > 0 && (
                                  <div style={{ color: "var(--error, #dc2626)" }}>
                                    <span>Costo del producto (Ventaz)</span>
                                    <strong>− {money(order.costo_producto)}</strong>
                                  </div>
                                )}
                                {Number(order.comision_ml) > 0 && (
                                  <div style={{ color: "var(--error, #dc2626)" }}>
                                    <span>Comisión Mercado Libre</span>
                                    <strong>− {money(order.comision_ml)}</strong>
                                  </div>
                                )}
                                {order.ml_logistic_type === "self_service" ? (
                                  <div style={{ color: "var(--error, #dc2626)" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <Truck size={13} /> Costo de envío (Flex)
                                    </span>
                                    <strong>{order.envio_gratis_ml != null ? `− ${money(order.envio_gratis_ml)}` : "-"}</strong>
                                  </div>
                                ) : (
                                  Number(order.envio_gratis_ml) > 0 && (
                                    <div style={{ color: "var(--error, #dc2626)" }}>
                                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <Truck size={13} /> Costo de envío gratis (ML)
                                      </span>
                                      <strong>− {money(order.envio_gratis_ml)}</strong>
                                    </div>
                                  )
                                )}
                              </>
                            )}

                            {isUnpaid(order) ? (
                              <div className="is-highlight">
                                <span>Tu ganancia neta</span>
                                <strong style={{ color: "var(--text-tertiary, #999)" }}>Pago pendiente</strong>
                              </div>
                            ) : (
                              <div className="is-highlight">
                                <span>Tu ganancia neta</span>
                                <strong>{money(order.ganancia_vendedor)}</strong>
                              </div>
                            )}

                            <p style={{ fontSize: ".78rem", color: "var(--text-tertiary)", marginTop: 4 }}>
                              {status.description}
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

          {/* Sentinel de scroll infinito */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
              <Loader2 size={22} className="seller-products-spin" />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
