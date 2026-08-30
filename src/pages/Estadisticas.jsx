// src/pages/Estadisticas.jsx
import { useEffect, useState, useMemo } from "react";
import client from "../api/client";
import { BarChart2, ShoppingBag, TrendingUp, Eye, ChevronDown, ShoppingCart, Mail, Package, ChevronRight, CheckCircle2, PauseCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
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
function StatCard({ icon, label, value, sub, color }) {
  const Icon = icon;
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

// ── Panel de resumen de Mercado Libre — reemplaza el de carritos abandonados para el track
// ML, que no tiene tienda propia. Reusa /seller/ml/summary y /seller/ml/listings, mismos
// endpoints que ya usa la pestaña "Resumen" de /mercado-libre.
function MlSummaryPanel({ summary, listings }) {
  const topListings = [...listings]
    .sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0))
    .slice(0, 8);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 20 }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Publicaciones en Mercado Libre</h2>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Estado actual y top publicaciones por ventas</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(5,150,105,.08)" }}>
          <CheckCircle2 size={14} color="#059669" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{summary?.active_count ?? "—"}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Activas</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(107,114,128,.1)" }}>
          <PauseCircle size={14} color="#6b7280" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{summary?.paused_count ?? "—"}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Pausadas</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(239,68,68,.08)" }}>
          <AlertTriangle size={14} color="#ef4444" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{summary?.error_count ?? "—"}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Con error</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(217,119,6,.08)" }}>
          <Package size={14} color="#d97706" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{summary?.stock_paused_count ?? "—"}</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Sin stock</span>
        </div>
      </div>

      <div style={{ padding: "0 24px 20px" }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".04em", margin: "8px 0 10px" }}>
          Top publicaciones
        </h3>
        {topListings.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 12px" }}>
            <div className="empty-state__icon"><ShoppingBag size={26} /></div>
            <h3>Sin publicaciones todavía</h3>
            <p>Publicá tu primer producto en Mercado Libre para ver sus ventas acá.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topListings.map(l => (
              <div key={l.ml_item_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                {l.image_url
                  ? <img src={l.image_url} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 34, height: 34, borderRadius: 6, background: "var(--surface-2,#f3f4f6)", flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {l.product_name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>SKU {l.sku || "—"}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4db81a", flexShrink: 0 }}>{l.units_sold || 0} vendidas</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Estadísticas de Mercado Libre — bloque nuevo ────────────────────────────

function formatBucket(bucket, groupBy) {
  if (groupBy === "hour") return `${String(bucket).padStart(2, "0")}h`;
  const d = new Date(`${bucket}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(bucket);
  if (groupBy === "month") return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// Completa los baldes vacíos (una hora o un día sin ventas no vuelve en el SELECT agrupado del
// backend) para que el gráfico no salte de fecha. En semana/mes se deja tal cual viene — no hay
// una cantidad fija de baldes esperados como sí la hay en horas (24) o días (rango exacto).
function fillBuckets(data, groupBy, from, to) {
  if (groupBy === "hour") {
    const map = Object.fromEntries(data.map(d => [d.bucket, d]));
    return Array.from({ length: 24 }, (_, h) => map[h] || { bucket: h, orders: 0, revenue: 0 });
  }
  if (groupBy === "day") {
    const map = Object.fromEntries(data.map(d => [d.bucket, d]));
    return buildDateRange(from, to).map(date => map[date] || { bucket: date, orders: 0, revenue: 0 });
  }
  return data;
}

function ComboChartSVG({ data, groupBy, height = 220 }) {
  const [showRevenue, setShowRevenue] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [hover, setHover] = useState(null);

  if (!data.length || data.every(d => d.revenue === 0 && d.orders === 0)) {
    return <div className="est-chart-empty">Sin datos para el período</div>;
  }

  const W = 720, padT = 16, padB = 26, padL = 6, padR = 6;
  const chartW = W - padL - padR, chartH = height - padT - padB;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const maxOrders  = Math.max(...data.map(d => d.orders), 1);
  const n     = data.length;
  const slot  = chartW / n;
  const barW  = Math.max(3, slot * 0.55);
  const every = Math.max(1, Math.floor(n / 8));

  const linePt = (i, val) => [padL + slot * i + slot / 2, padT + chartH * (1 - val / maxOrders)];
  const linePoints = data.map((d, i) => linePt(i, d.orders).join(",")).join(" ");

  return (
    <div>
      <div className="est-ml-legend">
        <button type="button" className={`est-ml-legend__item${showRevenue ? " is-active" : ""}`} onClick={() => setShowRevenue(v => !v)}>
          <i style={{ background: "#f59e0b" }} /> Facturación
        </button>
        <button type="button" className={`est-ml-legend__item${showOrders ? " is-active" : ""}`} onClick={() => setShowOrders(v => !v)}>
          <i style={{ background: "#4db81a" }} /> Pedidos
        </button>
      </div>
      <div className="est-chart-wrap">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <line key={pct} x1={0} y1={padT + chartH * (1 - pct)} x2={W} y2={padT + chartH * (1 - pct)} stroke="var(--border)" strokeWidth={1} />
          ))}
          {showRevenue && data.map((d, i) => {
            const bH = Math.max(1, (d.revenue / maxRevenue) * chartH);
            const x  = padL + slot * i + (slot - barW) / 2;
            const y  = padT + chartH - bH;
            return (
              <rect key={i} x={x} y={y} width={barW} height={bH} rx={2}
                fill={hover === i ? "#f59e0bcc" : "#f59e0b"} style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            );
          })}
          {showOrders && <polyline points={linePoints} fill="none" stroke="#4db81a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
          {showOrders && data.map((d, i) => {
            const [x, y] = linePt(i, d.orders);
            return <circle key={i} cx={x} cy={y} r={hover === i ? 4 : 2.5} fill="#4db81a" style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />;
          })}
          {data.map((d, i) => i % every === 0 && (
            <text key={i} x={padL + slot * i + slot / 2} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">
              {formatBucket(d.bucket, groupBy)}
            </text>
          ))}
        </svg>
        {hover !== null && data[hover] && (
          <div className="est-tooltip" style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: "translateX(-50%)" }}>
            <strong>{formatBucket(data[hover].bucket, groupBy)}</strong> — {fmtMoney(data[hover].revenue)} · {fmt(data[hover].orders)} pedido{data[hover].orders !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

const DOW_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function HeatmapGrid({ data }) {
  const map   = useMemo(() => Object.fromEntries(data.map(d => [`${d.dow}-${d.hour}`, d.orders])), [data]);
  const max   = Math.max(...data.map(d => d.orders), 1);
  const total = data.reduce((s, d) => s + d.orders, 0);
  const best  = useMemo(() => (data.length ? [...data].sort((a, b) => b.orders - a.orders)[0] : null), [data]);

  if (!data.length || total === 0) return <div className="est-chart-empty">Sin datos para el período</div>;

  return (
    <div>
      {best && (
        <p className="est-ml-heatmap__insight">
          El {DOW_LABELS[best.dow]} a las {String(best.hour).padStart(2, "0")}:00 hs es tu franja con más ventas
          ({fmt(best.orders)} pedido{best.orders !== 1 ? "s" : ""}, {Math.round((best.orders / total) * 100)}% del total).
        </p>
      )}
      <div className="est-ml-heatmap">
        <div className="est-ml-heatmap__row est-ml-heatmap__row--head">
          <span />
          {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ""}</span>)}
        </div>
        {DOW_LABELS.map((label, dow) => (
          <div key={dow} className="est-ml-heatmap__row">
            <span className="est-ml-heatmap__label">{label}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = map[`${dow}-${h}`] || 0;
              return (
                <span key={h} className="est-ml-heatmap__cell" title={`${label} ${h}hs — ${v} pedido${v !== 1 ? "s" : ""}`}
                  style={{ background: v === 0 ? "transparent" : `rgba(77,184,26,${0.12 + (v / max) * 0.78})` }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangeBadge({ pct }) {
  if (pct == null) return null;
  const positive = pct >= 0;
  return <span className={`est-ml-change ${positive ? "is-up" : "is-down"}`}>{positive ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

const KPI_TONES = { orange: "#f59e0b", blue: "#6366f1", green: "#4db81a", red: "#ef4444", gray: "#6b7280" };

function KpiCard({ icon, label, value, changePct, tone = "gray", sub }) {
  const Icon = icon;
  const color = KPI_TONES[tone] || KPI_TONES.gray;
  return (
    <div className="card est-stat-card">
      <div className="est-stat-card__top">
        <div>
          <p className="est-stat-card__label">{label}</p>
          <p className="est-stat-card__value">{value}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <ChangeBadge pct={changePct} />
            {sub && <span className="est-stat-card__sub" style={{ margin: 0 }}>{sub}</span>}
          </div>
        </div>
        <div className="est-stat-card__icon" style={{ background: `${color}1a` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  );
}

const SEVERITY_STYLE = {
  good:    { bg: "rgba(5,150,105,.08)", color: "#059669" },
  warning: { bg: "rgba(217,119,6,.08)", color: "#d97706" },
  danger:  { bg: "rgba(239,68,68,.08)", color: "#ef4444" },
};

function AlertsPanel({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <h2 className="est-chart-card__title" style={{ marginBottom: 12 }}>Alertas</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a, i) => {
          const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.warning;
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 9, background: s.bg }}>
              <AlertTriangle size={15} color={s.color} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{a.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalCard({ goal, onSave, saving }) {
  const [editing, setEditing] = useState(!goal);
  const [value, setValue] = useState(goal?.goal || "");

  if (editing) {
    return (
      <div className="card" style={{ padding: "16px 20px" }}>
        <h2 className="est-chart-card__title" style={{ marginBottom: 10 }}>Objetivo del mes</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" className="form-input" placeholder="Meta de facturación ($)" value={value}
            onChange={e => setValue(e.target.value)} style={{ flex: 1 }} />
          <button type="button" className="btn btn--primary btn--sm" disabled={saving || !value}
            onClick={() => { onSave(value); setEditing(false); }}>
            Guardar
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, goal.progressPct);
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 className="est-chart-card__title">Objetivo del mes</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setValue(goal.goal); setEditing(true); }}>Editar</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>{fmtMoney(goal.current)}</span>
        <span style={{ color: "var(--text-tertiary)" }}>de {fmtMoney(goal.goal)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: goal.onTrack ? "#4db81a" : "#f59e0b" }} />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: goal.onTrack ? "#059669" : "#d97706" }}>
        {goal.onTrack
          ? `Al ritmo actual, vas a llegar a ${fmtMoney(goal.projected)} este mes.`
          : `Al ritmo actual, proyectás ${fmtMoney(goal.projected)} — te faltarían ${fmtMoney(Math.max(0, goal.goal - goal.projected))} para cumplir la meta.`}
      </p>
    </div>
  );
}

const PRODUCT_SORTS = [
  { key: "revenue", label: "Facturación" },
  { key: "units", label: "Unidades" },
  { key: "revenueShare", label: "% Particip." },
  { key: "currentStock", label: "Stock" },
];

function ProductStatsTable({ products }) {
  const [query, setQuery]     = useState("");
  const [sortKey, setSortKey] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(p => !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [products, query, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  if (!products.length) {
    return (
      <div className="empty-state" style={{ padding: "48px 20px" }}>
        <div className="empty-state__icon"><ShoppingBag size={32} /></div>
        <h3>Sin ventas en este período</h3>
      </div>
    );
  }

  return (
    <div className="card est-table-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h2 className="est-chart-card__title" style={{ margin: 0 }}>Productos del período</h2>
        <input className="form-input" placeholder="Buscar por nombre o SKU..." value={query}
          onChange={e => setQuery(e.target.value)} style={{ maxWidth: 240 }} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="est-table">
          <thead>
            <tr>
              <th>Producto</th>
              {PRODUCT_SORTS.map(s => (
                <th key={s.key} style={{ cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => toggleSort(s.key)}>
                  {s.label} {sortKey === s.key && (sortDir === "desc" ? "↓" : "↑")}
                </th>
              ))}
              <th>Precio actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const isTop = p.revenueShare >= 15;
              const isLowStock = p.currentStock != null && p.currentStock <= 5;
              return (
                <tr key={p.productId} style={{ background: isTop ? "rgba(5,150,105,.05)" : isLowStock ? "rgba(239,68,68,.04)" : undefined }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--surface-2,#f3f4f6)", flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{p.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>SKU {p.sku || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: "#f59e0b" }}>{fmtMoney(p.revenue)}</td>
                  <td>{fmt(p.units)}</td>
                  <td>{p.revenueShare}%</td>
                  <td style={{ color: isLowStock ? "#ef4444" : undefined, fontWeight: isLowStock ? 700 : undefined }}>
                    {p.currentStock != null ? fmt(p.currentStock) : "—"}
                  </td>
                  <td>{p.currentPrice != null ? fmtMoney(p.currentPrice) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProvinceTable({ provinces }) {
  if (!provinces?.length) return null;
  const total = provinces.reduce((s, p) => s + p.revenue, 0);
  return (
    <div className="card est-table-card">
      <h2 className="est-chart-card__title" style={{ marginBottom: 14 }}>Ventas por provincia</h2>
      <table className="est-table">
        <thead><tr><th>Provincia</th><th>Pedidos</th><th>Facturación</th><th>% del total</th></tr></thead>
        <tbody>
          {provinces.map(p => (
            <tr key={p.province}>
              <td className="est-table__date">{p.province}</td>
              <td>{fmt(p.orders)}</td>
              <td style={{ fontWeight: 700, color: "#f59e0b" }}>{fmtMoney(p.revenue)}</td>
              <td>{total > 0 ? Math.round((p.revenue / total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShippingBreakdownCard({ shipping }) {
  if (!shipping?.length) return null;
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <h2 className="est-chart-card__title" style={{ marginBottom: 12 }}>Métodos de envío</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shipping.map(s => (
          <div key={s.method} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--surface-2,#f9fafb)" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.method}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{fmt(s.orders)} pedido{s.orders !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {s.avgDeliveryHours != null ? `${Math.round(s.avgDeliveryHours / 24 * 10) / 10} días promedio de entrega` : "sin datos de entrega todavía"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const GROUP_BY_OPTIONS = [
  { key: "day", label: "Día" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "hour", label: "Hora" },
];

function MlStatsSection({ from, to }) {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [groupBy, setGroupBy]     = useState("day");
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    setLoading(true); setError("");
    client.get("/seller/ml/stats", { params: { from, to, groupBy } })
      .then(r => setStats(r.data))
      .catch(() => setError("No se pudieron cargar las estadísticas de Mercado Libre."))
      .finally(() => setLoading(false));
  }, [from, to, groupBy]);

  function saveGoal(value) {
    setSavingGoal(true);
    const monthKey = new Date().toISOString().slice(0, 7);
    client.post("/seller/ml/stats/goal", { monthKey, revenueGoal: Number(value) })
      .then(() => client.get("/seller/ml/stats", { params: { from, to, groupBy } }))
      .then(r => setStats(r.data))
      .finally(() => setSavingGoal(false));
  }

  if (loading && !stats) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />
      </div>
    );
  }
  if (error) return <div className="alert alert--error">{error}</div>;
  if (!stats) return null;

  const filledSeries = fillBuckets(stats.timeSeries, groupBy, from, to);
  const { kpis } = stats;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="est-stats-grid">
        <KpiCard icon={TrendingUp}    label="Facturación"      value={fmtMoney(kpis.revenue)}   changePct={kpis.revenueChangePct}   tone="orange" />
        <KpiCard icon={ShoppingBag}   label="Pedidos"          value={fmt(kpis.orders)}         changePct={kpis.ordersChangePct}    tone="blue" />
        <KpiCard icon={Package}      label="Unidades vendidas" value={fmt(kpis.units)}          changePct={kpis.unitsChangePct}     tone="blue" />
        <KpiCard icon={BarChart2}    label="Ticket promedio"   value={fmtMoney(kpis.avgTicket)} changePct={kpis.avgTicketChangePct} tone="gray" />
        <KpiCard icon={TrendingUp}   label="Beneficio estimado" value={fmtMoney(kpis.profit)}   tone={kpis.profit >= 0 ? "green" : "red"} sub={kpis.profitNote} />
        <KpiCard icon={ShoppingCart} label="Compradores"       value={fmt(kpis.uniqueBuyers)}   tone="gray" />
        <KpiCard icon={AlertTriangle} label="Devoluciones"     value={`${kpis.returnRate}%`}    tone={kpis.returnRate > 5 ? "red" : "gray"} />
        <KpiCard icon={AlertTriangle} label="Cancelaciones"    value={`${kpis.cancelRate}%`}    tone={kpis.cancelRate > 10 ? "red" : "gray"} />
      </div>

      <div className="card est-chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 className="est-chart-card__title" style={{ margin: 0 }}>Facturación y pedidos</h2>
          <div className="est-chart-controls">
            {GROUP_BY_OPTIONS.map(o => (
              <button key={o.key} type="button" className={`btn btn--sm ${groupBy === o.key ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setGroupBy(o.key)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <ComboChartSVG data={filledSeries} groupBy={groupBy} height={240} />
      </div>

      <AlertsPanel alerts={stats.alerts} />

      <div className="est-dual-grid">
        <div className="card est-chart-card">
          <h2 className="est-chart-card__title" style={{ marginBottom: 14 }}>Mapa de calor — día y hora</h2>
          <HeatmapGrid data={stats.heatmap} />
        </div>
        <GoalCard goal={stats.goal} onSave={saveGoal} saving={savingGoal} />
      </div>

      <ProductStatsTable products={stats.products} />

      <div className="est-dual-grid">
        <ProvinceTable provinces={stats.provinces} />
        <ShippingBreakdownCard shipping={stats.shipping} />
      </div>
    </div>
  );
}

export default function Estadisticas() {
  const { seller } = useAuth();
  const isMlTrack = seller?.onboarding_track === "mercadolibre";

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
  const [mlSummary,      setMlSummary]      = useState(null);
  const [mlListings,     setMlListings]     = useState([]);

  const { from, to } = useMemo(() => {
    const now  = new Date();
    const days = RANGES[rangeIdx]?.days || 30;
    const f    = new Date(now); f.setDate(f.getDate() - days + 1);
    return { from: toLocalISO(f), to: toLocalISO(now) };
  }, [rangeIdx]);

  // Un vendedor de Mercado Libre no tiene tiendas — no tiene sentido pedirle que elija una.
  useEffect(() => {
    if (isMlTrack) return;
    client.get("/seller/store/pages").then(r => {
      const list = r.data || [];
      setPages(list);
      if (list.length === 1) setPageId(list[0].id);
    }).catch(() => {});
  }, [isMlTrack]);

  // ML tiene su propio endpoint (/seller/ml/stats, ver MlStatsSection) con KPIs, series y
  // tabla de productos — no necesita este fetch genérico de "todos los canales".
  useEffect(() => {
    if (isMlTrack) return;
    if (!pageId) { setData(null); return; }
    setLoading(true); setError("");
    client.get(`/seller/store/pages/${pageId}/analytics`, { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => setError("No se pudieron cargar las estadísticas."))
      .finally(() => setLoading(false));
  }, [isMlTrack, pageId, from, to]);

  useEffect(() => {
    if (!isMlTrack) return;
    client.get("/seller/ml/summary").then(r => setMlSummary(r.data)).catch(() => {});
    client.get("/seller/ml/listings").then(r => setMlListings(r.data || [])).catch(() => {});
  }, [isMlTrack]);

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
    if (isMlTrack || !pageId) { setAbandonedCarts([]); return; }
    setAcLoading(true);
    client.get(`/seller/store/pages/${pageId}/abandoned-carts`)
      .then(r => setAbandonedCarts(r.data || []))
      .catch(() => setAbandonedCarts([]))
      .finally(() => setAcLoading(false));
  }, [isMlTrack, pageId]);

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
            <p className="est-hero__sub">
              {isMlTrack ? "Ventas y publicaciones de Mercado Libre" : "Visitantes, pedidos y facturación de tu tienda"}
            </p>
          </div>
        </div>

        {/* Store selector — solo si hay más de una tienda (no aplica a Mercado Libre) */}
        {!isMlTrack && pages.length > 1 && (
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
        {!isMlTrack && pages.length === 1 && pageId && (
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
      {!isMlTrack && !pageId && pages.length > 1 && (
        <div className="empty-state" style={{ padding: "72px 20px" }}>
          <div className="empty-state__icon"><BarChart2 size={32} /></div>
          <h3>Seleccioná una tienda</h3>
          <p>Elegí la tienda que querés analizar.</p>
        </div>
      )}

      {(isMlTrack || pageId) && error && (
        <div className="alert alert--error" style={{ marginTop: 20 }}>{error}</div>
      )}

      {(isMlTrack || pageId) && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: 20, alignItems: "start" }}>

          {/* ── COLUMNA IZQUIERDA — gráficos y tabla ──────────────── */}
          <div>
          {isMlTrack ? (
            <MlStatsSection from={from} to={to} />
          ) : (
            <>
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
            </>
          )}
          </div>{/* fin columna izquierda */}

          {/* ── COLUMNA DERECHA — carritos abandonados (ecommerce) o resumen de ML ── */}
          {isMlTrack ? (
            <MlSummaryPanel summary={mlSummary} listings={mlListings} />
          ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 20 }}>
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
          )}{/* fin columna derecha */}

        </div>
      )}
    </div>
  );
}
