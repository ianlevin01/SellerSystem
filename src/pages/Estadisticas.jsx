// src/pages/Estadisticas.jsx
import { useEffect, useState, useMemo } from "react";
import client from "../api/client";
import { BarChart2, ShoppingBag, TrendingUp, Eye, ChevronDown, ShoppingCart, Mail, Package, ChevronRight } from "lucide-react";
import "../styles/Estadisticas.css";

// ─── Helpers ────────────────────────────────────────────────
function fmt(n) {
  return Number(Math.round(n || 0)).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function fmtMoney(n) {
  return `$${fmt(n)}`;
}
function fmtDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
function buildDateRange(from, to) {
  const dates = [];
  const cur = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (cur <= end) {
    dates.push(toLocalISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
function toLocalISO(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── SVG bar chart ────────────────────────────────────────────
function BarChartSVG({ data, color = "#4db81a", height = 140, tooltip }) {
  const [hover, setHover] = useState(null);
  if (!data.length || data.every(d => d.value === 0)) return (
    <div className="est-chart-empty">Sin datos para el período</div>
  );
  const max   = Math.max(...data.map(d => d.value), 1);
  const W     = 600;
  const barW  = Math.max(4, Math.floor((W - data.length * 3) / data.length));
  const padT  = 10;
  const padB  = 24;
  const chartH = height - padT - padB;
  const every  = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="est-chart-wrap">
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={0} y1={padT + chartH * (1 - pct)} x2={W} y2={padT + chartH * (1 - pct)} stroke="var(--border)" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const bH = Math.max(2, (d.value / max) * chartH);
          const x  = i * (W / data.length) + 1;
          const y  = padT + chartH - bH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bH}
                fill={hover === i ? `${color}bb` : color} rx={3}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              {i % every === 0 && (
                <text x={x + barW / 2} y={height - 5} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">
                  {fmtDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="est-tooltip">
          <strong>{fmtDate(data[hover].date)}</strong> — {tooltip ? tooltip(data[hover]) : fmt(data[hover].value)}
        </div>
      )}
    </div>
  );
}

// ─── SVG dual line chart ──────────────────────────────────────
function LineChartSVG({ data1, data2, color1 = "#4db81a", color2 = "#6366f1", label1, label2, height = 160 }) {
  if (!data1.length) return <div className="est-chart-empty">Sin datos</div>;
  const W = 600; const padT = 16; const padB = 28; const padLR = 8;
  const chartW = W - padLR * 2; const chartH = height - padT - padB;
  const maxAll = Math.max(...data1.map(d => d.value), ...data2.map(d => d.value), 1);
  const n      = data1.length;
  const pt = (i, val) => {
    const x = padLR + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
    const y = padT + chartH * (1 - val / maxAll);
    return `${x},${y}`;
  };
  const pts1  = data1.map((d, i) => pt(i, d.value)).join(" ");
  const pts2  = data2.map((d, i) => pt(i, d.value)).join(" ");
  const area1 = `${padLR},${padT + chartH} ${pts1} ${padLR + chartW},${padT + chartH}`;
  const area2 = `${padLR},${padT + chartH} ${pts2} ${padLR + chartW},${padT + chartH}`;
  const every = Math.max(1, Math.floor(n / 8));

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color1} stopOpacity="0.22" /><stop offset="100%" stopColor={color1} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity="0.18" /><stop offset="100%" stopColor={color2} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={0} y1={padT + chartH * (1 - pct)} x2={W} y2={padT + chartH * (1 - pct)} stroke="var(--border)" strokeWidth={1} />
        ))}
        <polygon points={area1} fill="url(#lg1)" />
        <polygon points={area2} fill="url(#lg2)" />
        <polyline points={pts1} fill="none" stroke={color1} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts2} fill="none" stroke={color2} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data1.map((d, i) => {
          if (i % every !== 0) return null;
          const [x] = pt(i, d.value).split(",");
          return <text key={i} x={x} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">{fmtDate(d.date)}</text>;
        })}
      </svg>
      <div className="est-legend">
        <span><i style={{ background: color1 }} />{label1}</span>
        <span><i style={{ background: color2 }} />{label2}</span>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card est-stat-card">
      <div className="est-stat-card__top">
        <div>
          <p className="est-stat-card__label">{label}</p>
          <p className="est-stat-card__value">{value}</p>
          {sub && <p className="est-stat-card__sub">{sub}</p>}
        </div>
        <div className="est-stat-card__icon" style={{ background: `${color}1a` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  );
}

// ─── Date range presets ───────────────────────────────────────
const RANGES = [
  { label: "7 días",  days: 7  },
  { label: "14 días", days: 14 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

// ─── Main ─────────────────────────────────────────────────────
const STATUS_LABEL = { iniciado: "Iniciado", contactado: "Contactado", pagado: "Pagado" };
const STATUS_COLOR = { iniciado: "#f59e0b", contactado: "#6366f1", pagado: "#4db81a" };
const STATUS_BG    = { iniciado: "#fef3c7", contactado: "#ede9fe", pagado: "#dcfce7" };

function CartStatusBadge({ status }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: ".02em",
      background: STATUS_BG[status]   || "#f3f4f6",
      color:      STATUS_COLOR[status] || "#6b7280",
    }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function itemsSummary(items) {
  if (!items?.length) return "—";
  const first = items.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(", ");
  return items.length > 2 ? `${first} +${items.length - 2} más` : first;
}

export default function Estadisticas() {
  const [pages,          setPages]          = useState([]);
  const [pageId,         setPageId]         = useState("");
  const [rangeIdx,       setRangeIdx]       = useState(2);
  const [loading,        setLoading]        = useState(false);
  const [data,           setData]           = useState(null);
  const [error,          setError]          = useState("");
  const [chartMode,      setChartMode]      = useState("bars");
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [acLoading,      setAcLoading]      = useState(false);
  const [expandedCart,   setExpandedCart]   = useState(null);
  const [acFilter,       setAcFilter]       = useState("all");

  const { from, to } = useMemo(() => {
    const now  = new Date();
    const days = RANGES[rangeIdx]?.days || 30;
    const f    = new Date(now); f.setDate(f.getDate() - days + 1);
    return { from: toLocalISO(f), to: toLocalISO(now) };
  }, [rangeIdx]);

  useEffect(() => {
    client.get("/seller/store/pages").then(r => {
      const list = r.data || [];
      setPages(list);
      if (list.length === 1) setPageId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!pageId) { setData(null); return; }
    setLoading(true); setError("");
    client.get(`/seller/store/pages/${pageId}/analytics`, { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => setError("No se pudieron cargar las estadísticas."))
      .finally(() => setLoading(false));
  }, [pageId, from, to]);

  const allDates = useMemo(() => buildDateRange(from, to), [from, to]);

  const visitsByDate = useMemo(() => {
    if (!data) return [];
    const map = Object.fromEntries((data.visits || []).map(v => [v.date, v.count]));
    return allDates.map(date => ({ date, value: map[date] || 0 }));
  }, [data, allDates]);

  const ordersByDate = useMemo(() => {
    if (!data) return [];
    const map = Object.fromEntries((data.orders || []).map(o => [o.date, o.count]));
    return allDates.map(date => ({ date, value: map[date] || 0 }));
  }, [data, allDates]);

  const revByDate = useMemo(() => {
    if (!data) return [];
    const map = Object.fromEntries((data.orders || []).map(o => [o.date, o.revenue]));
    return allDates.map(date => ({ date, value: map[date] || 0 }));
  }, [data, allDates]);

  useEffect(() => {
    if (!pageId) { setAbandonedCarts([]); return; }
    setAcLoading(true);
    client.get(`/seller/store/pages/${pageId}/abandoned-carts`)
      .then(r => setAbandonedCarts(r.data || []))
      .catch(() => setAbandonedCarts([]))
      .finally(() => setAcLoading(false));
  }, [pageId]);

  const totals       = data?.totals || {};
  const selectedPage = pages.find(p => p.id === pageId);

  return (
    <div className="est-root">

      {/* ── Hero banner ────────────────────────────────────────── */}
      <div className="est-hero">
        <div className="est-hero__left">
          <div className="est-hero__icon-wrap">
            <BarChart2 size={20} />
          </div>
          <div>
            <h1 className="est-hero__title">Estadísticas</h1>
            <p className="est-hero__sub">Visitantes, pedidos y facturación de tu tienda</p>
          </div>
        </div>

        {/* Store selector — solo si hay más de una tienda */}
        {pages.length > 1 && (
          <div className="est-hero__select-wrap">
            <select
              className="est-select"
              value={pageId}
              onChange={e => setPageId(e.target.value)}
            >
              <option value="">Elegí una tienda</option>
              {pages.map(p => (
                <option key={p.id} value={p.id}>{p.store_name || p.page_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="est-select-icon" />
          </div>
        )}

        {/* Una sola tienda: muestra el nombre */}
        {pages.length === 1 && pageId && (
          <div className="est-hero__store-chip">
            <span className="est-hero__store-dot" />
            {selectedPage?.store_name || selectedPage?.page_name}
          </div>
        )}

        {/* Selector de rango */}
        <div className="est-range-pills">
          {RANGES.map((r, i) => (
            <button key={i} type="button"
              className={`est-range-pill${rangeIdx === i ? " est-range-pill--active" : ""}`}
              onClick={() => setRangeIdx(i)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ──────────────────────────────────────────── */}
      {!pageId && pages.length > 1 && (
        <div className="empty-state" style={{ padding: "72px 20px" }}>
          <div className="empty-state__icon"><BarChart2 size={32} /></div>
          <h3>Seleccioná una tienda</h3>
          <p>Elegí la tienda que querés analizar.</p>
        </div>
      )}

      {pageId && error && (
        <div className="alert alert--error" style={{ marginTop: 20 }}>{error}</div>
      )}

      {pageId && !error && (
        <>
          {/* Stat cards */}
          <div className="est-stats-grid">
            <StatCard icon={Eye}          label="Visitas"          value={loading ? "—" : fmt(totals.visits)}          sub={`Últimos ${RANGES[rangeIdx].days} días`} color="#6366f1" />
            <StatCard icon={ShoppingCart} label="Carritos creados" value={loading ? "—" : fmt(totals.carts)}           sub="Sesiones con al menos 1 producto"         color="#0ea5e9" />
            <StatCard icon={ShoppingBag}  label="Pedidos"          value={loading ? "—" : fmt(totals.orders)}          sub="Pagados + pendientes"                     color="#4db81a" />
            <StatCard icon={TrendingUp}   label="Facturación"      value={loading ? "—" : fmtMoney(totals.revenue)}    sub="Total del período"                        color="#f59e0b" />
          </div>

          {/* Chart type toggle */}
          <div className="est-chart-controls">
            <span className="est-chart-controls__label">Vista:</span>
            {[["bars", "Barras"], ["lines", "Líneas"]].map(([mode, lbl]) => (
              <button key={mode} type="button"
                className={`btn btn--sm ${chartMode === mode ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setChartMode(mode)}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Visits chart — full width */}
          <div className="card est-chart-card">
            <div className="est-chart-card__head">
              <span className="est-chart-dot" style={{ background: "#6366f1" }} />
              <h2 className="est-chart-card__title">Visitas por día</h2>
            </div>
            {loading
              ? <div className="skeleton" style={{ height: 140, borderRadius: 8 }} />
              : chartMode === "bars"
                ? <BarChartSVG data={visitsByDate} color="#6366f1" height={140} tooltip={d => `${fmt(d.value)} visita${d.value !== 1 ? "s" : ""}`} />
                : <LineChartSVG data1={visitsByDate} data2={ordersByDate} color1="#6366f1" color2="#4db81a" label1="Visitas" label2="Pedidos" height={160} />
            }
          </div>

          {/* Orders + Revenue — 2 columnas en desktop, 1 en mobile */}
          <div className="est-dual-grid">
            <div className="card est-chart-card">
              <div className="est-chart-card__head">
                <span className="est-chart-dot" style={{ background: "#4db81a" }} />
                <h2 className="est-chart-card__title">Pedidos por día</h2>
              </div>
              {loading
                ? <div className="skeleton" style={{ height: 110, borderRadius: 8 }} />
                : <BarChartSVG data={ordersByDate} color="#4db81a" height={110} tooltip={d => `${fmt(d.value)} pedido${d.value !== 1 ? "s" : ""}`} />
              }
            </div>
            <div className="card est-chart-card">
              <div className="est-chart-card__head">
                <span className="est-chart-dot" style={{ background: "#f59e0b" }} />
                <h2 className="est-chart-card__title">Facturación por día</h2>
              </div>
              {loading
                ? <div className="skeleton" style={{ height: 110, borderRadius: 8 }} />
                : <BarChartSVG data={revByDate} color="#f59e0b" height={110} tooltip={d => fmtMoney(d.value)} />
              }
            </div>
          </div>

          {/* Daily summary table */}
          {!loading && data && (
            (() => {
              const rows = allDates.slice().reverse().filter(date => {
                const v = visitsByDate.find(d => d.date === date)?.value || 0;
                const o = ordersByDate.find(d => d.date === date)?.value || 0;
                const r = revByDate.find(d => d.date === date)?.value || 0;
                return v > 0 || o > 0 || r > 0;
              }).slice(0, 15);

              if (!rows.length) return (
                <div className="empty-state" style={{ padding: "48px 20px" }}>
                  <div className="empty-state__icon"><BarChart2 size={32} /></div>
                  <h3>Aún no hay datos</h3>
                  <p>Las visitas y pedidos aparecerán cuando alguien entre a tu tienda.</p>
                </div>
              );

              return (
                <div className="card est-table-card">
                  <h2 className="est-chart-card__title" style={{ marginBottom: 14 }}>Resumen por día</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table className="est-table">
                      <thead>
                        <tr>
                          {["Fecha", "Visitas", "Pedidos", "Facturación"].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(date => {
                          const v = visitsByDate.find(d => d.date === date)?.value || 0;
                          const o = ordersByDate.find(d => d.date === date)?.value || 0;
                          const r = revByDate.find(d => d.date === date)?.value || 0;
                          return (
                            <tr key={date}>
                              <td className="est-table__date">{fmtDate(date)}</td>
                              <td style={{ color: "#6366f1", fontWeight: 600 }}>{fmt(v)}</td>
                              <td style={{ color: "#4db81a", fontWeight: 600 }}>{fmt(o)}</td>
                              <td style={{ color: "#f59e0b", fontWeight: 700 }}>{fmtMoney(r)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          )}
          {/* ── Recuperación de carritos abandonados ─────────────── */}
          <div className="card" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShoppingCart size={15} color="#f59e0b" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Recuperación de carritos abandonados</h2>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Compradores que ingresaron sus datos pero no completaron la compra</p>
                </div>
              </div>
              {/* Contadores */}
              {!acLoading && abandonedCarts.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["iniciado", "contactado", "pagado"].map(s => {
                    const n = abandonedCarts.filter(c => c.status === s).length;
                    if (!n) return null;
                    return (
                      <span key={s} style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: STATUS_BG[s], color: STATUS_COLOR[s], cursor: "pointer",
                        outline: acFilter === s ? `2px solid ${STATUS_COLOR[s]}` : "none",
                      }} onClick={() => setAcFilter(f => f === s ? "all" : s)}>
                        {n} {STATUS_LABEL[s]}{n !== 1 ? "s" : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Body */}
            {acLoading ? (
              <div style={{ padding: "32px 24px" }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />)}
              </div>
            ) : abandonedCarts.length === 0 ? (
              <div className="empty-state" style={{ padding: "48px 20px" }}>
                <div className="empty-state__icon"><ShoppingCart size={28} /></div>
                <h3>Sin carritos abandonados</h3>
                <p>Cuando un comprador llene sus datos y no complete la compra, aparecerá aquí.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="est-table" style={{ minWidth: 680 }}>
                  <thead>
                    <tr>
                      {["Cliente", "Contacto", "Productos", "Total", "Estado", "Fecha", ""].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedCarts
                      .filter(c => acFilter === "all" || c.status === acFilter)
                      .map(cart => {
                        const items  = typeof cart.items === "string" ? JSON.parse(cart.items) : (cart.items || []);
                        const isOpen = expandedCart === cart.id;
                        return [
                          <tr key={cart.id} style={{ cursor: "pointer" }} onClick={() => setExpandedCart(isOpen ? null : cart.id)}>
                            <td>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{cart.customer_name || "—"}</span>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                              <div>{cart.customer_email}</div>
                              {cart.customer_phone && <div style={{ color: "var(--text-tertiary)" }}>{cart.customer_phone}</div>}
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200 }}>
                              {itemsSummary(items)}
                            </td>
                            <td style={{ fontWeight: 700, color: "#4db81a", fontSize: 13, whiteSpace: "nowrap" }}>
                              {fmtMoney(cart.total)}
                            </td>
                            <td><CartStatusBadge status={cart.status} /></td>
                            <td className="est-table__date" style={{ whiteSpace: "nowrap" }}>
                              {fmtDate(cart.created_at?.slice(0, 10))}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <ChevronRight size={14} style={{ color: "var(--text-tertiary)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                            </td>
                          </tr>,
                          isOpen && (
                            <tr key={`${cart.id}-detail`}>
                              <td colSpan={7} style={{ padding: "0 16px 16px", background: "var(--bg-secondary)" }}>
                                <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", marginTop: 4 }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                    <div>
                                      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".05em" }}>Datos del cliente</p>
                                      <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{cart.customer_name}</p>
                                      <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--text-secondary)" }}>{cart.customer_email}</p>
                                      {cart.customer_phone     && <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--text-secondary)" }}>{cart.customer_phone}</p>}
                                      {cart.customer_doc_type  && <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{cart.customer_doc_type}: {cart.customer_doc_number}</p>}
                                    </div>
                                    <div>
                                      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".05em" }}>Resumen</p>
                                      <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--text-secondary)" }}>{items.length} producto{items.length !== 1 ? "s" : ""}</p>
                                      <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: "#4db81a" }}>{fmtMoney(cart.total)}</p>
                                      {cart.contacted_at && <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>Contactado: {fmtDate(cart.contacted_at?.slice(0, 10))}</p>}
                                    </div>
                                  </div>
                                  {items.length > 0 && (
                                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                                      <thead>
                                        <tr style={{ background: "var(--bg-secondary)" }}>
                                          <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textAlign: "left", textTransform: "uppercase" }}>Producto</th>
                                          <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textAlign: "center", textTransform: "uppercase" }}>Cant.</th>
                                          <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textAlign: "right", textTransform: "uppercase" }}>Precio unit.</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((item, idx) => (
                                          <tr key={idx}>
                                            <td style={{ padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", borderTop: "1px solid var(--border)" }}>{item.name}</td>
                                            <td style={{ padding: "8px 12px", fontSize: 13, color: "var(--text-secondary)", textAlign: "center", borderTop: "1px solid var(--border)" }}>×{item.quantity}</td>
                                            <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "right", borderTop: "1px solid var(--border)" }}>{fmtMoney(item.unit_price ?? item.price ?? 0)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                  {cart.status === "iniciado" && (
                                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#fef3c7", borderRadius: 8, border: "1px solid #fde68a" }}>
                                      <Mail size={13} color="#f59e0b" />
                                      <span style={{ fontSize: 12, color: "#92400e" }}>El cron enviará un email de recuperación automáticamente cuando venza el plazo configurado.</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ),
                        ];
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
