// src/pages/Estadisticas.jsx
import { useEffect, useState, useMemo } from "react";
import client from "../api/client";
import { BarChart2, ShoppingBag, TrendingUp, Users, Eye, ChevronDown, ShoppingCart } from "lucide-react";
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
export default function Estadisticas() {
  const [pages,     setPages]     = useState([]);
  const [pageId,    setPageId]    = useState("");
  const [rangeIdx,  setRangeIdx]  = useState(2);
  const [loading,   setLoading]   = useState(false);
  const [data,      setData]      = useState(null);
  const [error,     setError]     = useState("");
  const [chartMode, setChartMode] = useState("bars");

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
        </>
      )}
    </div>
  );
}
