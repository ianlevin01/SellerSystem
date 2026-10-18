// src/pages/ml/RentabilidadTab.jsx — ganancia real mes a mes de la operación en Mercado Libre.
// Facturación, comisión de ML, costo de envío y costo de producto son datos reales que ya
// guardamos al procesar cada venta (ver mlWebhookController.processOrder) — nunca estimados.
// Publicidad, Ingresos Brutos y gastos fijos se cargan a mano acá porque Mercado Libre no los
// reporta (impuestos/gastos propios del vendedor) o todavía no confirmamos si los expone
// (publicidad — ver la nota fija al pie de esta pantalla).
import { useEffect, useRef, useState } from "react";
import { PiggyBank, TrendingUp, Package, Truck, Percent, Megaphone, Landmark, Wallet, Info, Loader2 } from "lucide-react";
import client from "../../api/client";

function fmt(n) { return Number(Math.round(n || 0)).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
function fmtMoney(n) { return `$${fmt(n)}`; }
function monthLabel(monthKey, showYear) {
  const d = new Date(`${monthKey}-01T12:00:00`);
  const label = d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  return showYear ? `${label} '${monthKey.slice(2, 4)}` : label;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
// Último día real del mes (o hoy, si el mes elegido es el actual — no tiene sentido pedirle a
// la API un rango que termina en el futuro).
function monthEndDate(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  return end > todayISO() ? todayISO() : end;
}

// Mide el ancho real en píxeles del contenedor para que el viewBox del SVG coincida 1:1 con el
// tamaño renderizado — sin esto, un viewBox fijo (ej. 600) estirado con preserveAspectRatio
// "none" sobre un contenedor mucho más ancho deforma círculos y texto (quedan aplastados/
// estirados), que es justo lo que se veía mal.
function useMeasuredWidth(fallback = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// ── KPI card — mismo lenguaje visual que SummaryCard de MercadoLibre.jsx ──────────────────
function Kpi({ icon, label, value, tone, editable, draftValue, onDraftChange, onSave, saving, autoBadge }) {
  const Icon = icon;
  const toneColor = { green: "#16a34a", red: "#ef4444", brand: "var(--brand,#4db81a)", gray: "var(--text-secondary)" }[tone] || "var(--text-secondary)";
  return (
    <div className="card" style={{
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5,
      border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".74rem", fontWeight: 600, color: "var(--text-secondary)" }}>
        <Icon size={13} color={toneColor} />
        {label}
        {autoBadge && (
          <span style={{ fontSize: ".62rem", fontWeight: 700, color: "var(--brand,#4db81a)", background: "var(--brand-light,#eafbe0)", padding: "1px 6px", borderRadius: 99 }}>
            Automático
          </span>
        )}
      </div>
      {editable ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>$</span>
          <input
            type="number" min={0} value={draftValue}
            onChange={e => onDraftChange(e.target.value)}
            onBlur={onSave}
            style={{ width: "100%", fontSize: 17, fontWeight: 800, border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px" }}
          />
          {saving && <Loader2 size={13} className="seller-products-spin" />}
        </div>
      ) : (
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: toneColor }}>{value}</div>
      )}
    </div>
  );
}

// ── Gráfico de líneas liviano (facturación vs. ganancia neta) — mismo enfoque SVG sin
// librería que ya usa Estadisticas.jsx (BarChartSVG/LineChartSVG), adaptado a buckets mensuales.
function MonthlyLineChart({ months, key1, key2, color1, color2, label1, label2 }) {
  const [hover, setHover] = useState(null);
  const [wrapRef, W] = useMeasuredWidth(600);
  const H = 240, padT = 20, padB = 28, padLR = 12;
  if (!months.length) return <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Sin datos</div>;
  const chartW = W - padLR * 2, chartH = H - padT - padB;
  const maxAll = Math.max(...months.map(m => m[key1]), ...months.map(m => m[key2]), 1);
  const minAll = Math.min(0, ...months.map(m => m[key2]));
  const range = maxAll - minAll || 1;
  const n = months.length;
  const pt = (i, val) => {
    const x = padLR + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
    const y = padT + chartH * (1 - (val - minAll) / range);
    return [x, y];
  };
  const pts1 = months.map((m, i) => pt(i, m[key1]).join(",")).join(" ");
  const pts2 = months.map((m, i) => pt(i, m[key2]).join(",")).join(" ");
  const zeroY = padT + chartH * (1 - (0 - minAll) / range);
  const showYear = new Set(months.map(m => m.monthKey.slice(0, 4))).size > 1;

  return (
    <div ref={wrapRef}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={0} y1={padT + chartH * (1 - pct)} x2={W} y2={padT + chartH * (1 - pct)} stroke="var(--border)" strokeWidth={1} />
        ))}
        {minAll < 0 && <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="var(--text-tertiary)" strokeWidth={1} strokeDasharray="3,3" />}
        <polyline points={pts1} fill="none" stroke={color1} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts2} fill="none" stroke={color2} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {months.map((m, i) => {
          const [x, y1] = pt(i, m[key1]);
          const [, y2] = pt(i, m[key2]);
          return (
            <g key={m.monthKey} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x - (chartW / n) / 2} y={0} width={chartW / n} height={H} fill="transparent" style={{ cursor: "pointer" }} />
              <circle cx={x} cy={y1} r={hover === i ? 4 : 2.5} fill={color1} />
              <circle cx={x} cy={y2} r={hover === i ? 4 : 2.5} fill={color2} />
              <text x={x} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-tertiary)">{monthLabel(m.monthKey, showYear)}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && months[hover] && (
        <div style={{ fontSize: 12, textAlign: "center", color: "var(--text-secondary)" }}>
          <strong>{monthLabel(months[hover].monthKey, true)}</strong> — {label1}: {fmtMoney(months[hover][key1])} · {label2}: {fmtMoney(months[hover][key2])}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: color1, marginRight: 4 }} />{label1}</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: color2, marginRight: 4 }} />{label2}</span>
      </div>
    </div>
  );
}

// ── Gráfico de barras dobles (facturación vs. publicidad) ──────────────────────────────────
function MonthlyBarChart({ months, key1, key2, color1, color2, label1, label2 }) {
  const [wrapRef, W] = useMeasuredWidth(600);
  const H = 240, padT = 14, padB = 28;
  if (!months.length || months.every(m => m[key1] === 0 && m[key2] === 0)) {
    return <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Sin datos todavía</div>;
  }
  const chartH = H - padT - padB;
  const max = Math.max(...months.map(m => m[key1]), ...months.map(m => m[key2]), 1);
  const n = months.length;
  const groupW = W / n;
  const barW = Math.max(3, groupW * 0.28);
  const showYear = new Set(months.map(m => m.monthKey.slice(0, 4))).size > 1;

  return (
    <div ref={wrapRef}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={0} y1={padT + chartH * (1 - pct)} x2={W} y2={padT + chartH * (1 - pct)} stroke="var(--border)" strokeWidth={1} />
        ))}
        {months.map((m, i) => {
          const cx = i * groupW + groupW / 2;
          const h1 = Math.max(1, (m[key1] / max) * chartH);
          const h2 = Math.max(1, (m[key2] / max) * chartH);
          return (
            <g key={m.monthKey}>
              <rect x={cx - barW - 1} y={padT + chartH - h1} width={barW} height={h1} fill={color1} rx={2} />
              <rect x={cx + 1} y={padT + chartH - h2} width={barW} height={h2} fill={color2} rx={2} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-tertiary)">{monthLabel(m.monthKey, showYear)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: color1, marginRight: 4 }} />{label1}</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: color2, marginRight: 4 }} />{label2}</span>
      </div>
    </div>
  );
}

export default function RentabilidadTab() {
  const [monthsBack, setMonthsBack] = useState(6);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [draft, setDraft] = useState({ advertising: 0, grossReceiptsTax: 0, fixedCosts: 0 });
  const [saving, setSaving] = useState(null); // field name en curso de guardado, o null
  const [products, setProducts] = useState([]);

  // ── Modo "Por rango" — alternativa al selector de mes, para un desde/hasta cualquiera ──────
  const [viewMode, setViewMode] = useState("month"); // 'month' | 'range'
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeData, setRangeData] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const [rangeProducts, setRangeProducts] = useState([]);

  function loadRange() {
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) { setRangeError("El 'desde' tiene que ser anterior al 'hasta'."); return; }
    setRangeLoading(true); setRangeError("");
    Promise.all([
      client.get("/seller/finance/range", { params: { from: rangeFrom, to: rangeTo } }),
      client.get("/seller/ml/stats", { params: { from: rangeFrom, to: rangeTo, groupBy: "month" } }),
    ]).then(([financeRes, statsRes]) => {
      setRangeData(financeRes.data);
      setRangeProducts((statsRes.data?.products || []).slice(0, 6));
    }).catch(() => setRangeError("No se pudo cargar la información de ese rango."))
      .finally(() => setRangeLoading(false));
  }

  useEffect(() => { if (viewMode === "range" && !rangeData) loadRange(); }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  function load() {
    setLoading(true); setError("");
    client.get("/seller/finance/summary", { params: { months: monthsBack } })
      .then(r => {
        const data = r.data?.months || [];
        setMonths(data);
        setSelectedKey(prev => (prev && data.some(m => m.monthKey === prev)) ? prev : data[data.length - 1]?.monthKey || null);
      })
      .catch(() => setError("No se pudo cargar la información de rentabilidad."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [monthsBack]); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    const selected = months.find(m => m.monthKey === selectedKey);
    if (selected) setDraft({ advertising: selected.advertising, grossReceiptsTax: selected.grossReceiptsTax, fixedCosts: selected.fixedCosts }); // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedKey, months]);

  // Productos del MES SELECCIONADO únicamente — antes traía siempre el rango completo (6/12
  // meses) sin importar qué mes estuviera elegido arriba, así que nunca se podía ver, por
  // ejemplo, solo agosto.
  useEffect(() => {
    if (!selectedKey) return;
    client.get("/seller/ml/stats", { params: { from: `${selectedKey}-01`, to: monthEndDate(selectedKey), groupBy: "month" } })
      .then(r => setProducts((r.data?.products || []).slice(0, 6)))
      .catch(() => {});
  }, [selectedKey]);

  function saveField(field) {
    if (!selectedKey) return;
    setSaving(field);
    client.put(`/seller/finance/monthly/${selectedKey}`, draft)
      .then(() => setMonths(prev => prev.map(m => {
        if (m.monthKey !== selectedKey) return m;
        const grossProfit = m.revenue - m.productCost - m.mlCommission - m.shippingCost;
        const netProfit = grossProfit - draft.advertising - draft.grossReceiptsTax - draft.fixedCosts;
        return { ...m, ...draft, netProfit };
      })))
      .catch(() => setError("No se pudo guardar. Probá de nuevo."))
      .finally(() => setSaving(null));
  }

  const selected = months.find(m => m.monthKey === selectedKey);
  const hasAutoAds = months.some(m => m.advertisingSource === "ml");
  // Mismo shape en los dos modos (revenue/productCost/mlCommission/shippingCost/grossProfit/
  // advertising/advertisingSource/grossReceiptsTax/fixedCosts/netProfit) — así las tarjetas de
  // abajo no necesitan saber de qué modo vienen los datos.
  const data = viewMode === "month" ? selected : rangeData;

  if (loading && !months.length) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="seller-products-skeleton" style={{ height: 100 }} />
        <div className="seller-products-skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Rentabilidad</h2>
          <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
            Ganancia real de tu operación en Mercado Libre, mes a mes.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="seller-products-tabs">
            <button type="button" className={viewMode === "month" ? "is-active" : ""} onClick={() => setViewMode("month")}>Por mes</button>
            <button type="button" className={viewMode === "range" ? "is-active" : ""} onClick={() => setViewMode("range")}>Por rango</button>
          </div>
          {viewMode === "month" && (
            <div className="seller-products-tabs">
              <button type="button" className={monthsBack === 6 ? "is-active" : ""} onClick={() => setMonthsBack(6)}>6 meses</button>
              <button type="button" className={monthsBack === 12 ? "is-active" : ""} onClick={() => setMonthsBack(12)}>12 meses</button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "range" && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: ".76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Desde</label>
            <input type="date" value={rangeFrom} max={rangeTo} onChange={e => setRangeFrom(e.target.value)}
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "7px 10px", fontSize: ".84rem" }} />
          </div>
          <div>
            <label style={{ fontSize: ".76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Hasta</label>
            <input type="date" value={rangeTo} min={rangeFrom} max={todayISO()} onChange={e => setRangeTo(e.target.value)}
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "7px 10px", fontSize: ".84rem" }} />
          </div>
          <button type="button" className="btn btn--primary btn--sm" onClick={loadRange} disabled={rangeLoading}>
            {rangeLoading ? <Loader2 size={13} className="seller-products-spin" /> : "Buscar"}
          </button>
        </div>
      )}

      {(viewMode === "month" ? error : rangeError) && (
        <p style={{ margin: 0, fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{viewMode === "month" ? error : rangeError}</p>
      )}

      {/* Selector de mes */}
      {viewMode === "month" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {months.map(m => (
            <button key={m.monthKey} type="button"
              className={`btn btn--sm ${m.monthKey === selectedKey ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setSelectedKey(m.monthKey)}>
              {monthLabel(m.monthKey, true)}
            </button>
          ))}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Kpi icon={TrendingUp} label="Facturación"       value={fmtMoney(data.revenue)}      tone="gray" />
            <Kpi icon={Package}    label="Costo de productos" value={fmtMoney(data.productCost)}  tone="gray" />
            <Kpi icon={Percent}    label="Comisión Mercado Libre" value={fmtMoney(data.mlCommission)} tone="gray" />
            <Kpi icon={Truck}      label="Envío"              value={fmtMoney(data.shippingCost)} tone="gray" />
            <Kpi icon={PiggyBank}  label="Ganancia bruta"     value={fmtMoney(data.grossProfit)}  tone={data.grossProfit >= 0 ? "green" : "red"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {viewMode === "month" ? (
              <>
                {data.advertisingSource === "ml" ? (
                  <Kpi icon={Megaphone} label="Publicidad" value={fmtMoney(data.advertising)} tone="gray" autoBadge />
                ) : (
                  <Kpi icon={Megaphone} label="Publicidad (cargá el gasto del mes)" editable
                    draftValue={draft.advertising} onDraftChange={v => setDraft(d => ({ ...d, advertising: v }))}
                    onSave={() => saveField("advertising")} saving={saving === "advertising"} />
                )}
                <Kpi icon={Landmark} label="Ingresos Brutos (cargá lo que pagaste)" editable
                  draftValue={draft.grossReceiptsTax} onDraftChange={v => setDraft(d => ({ ...d, grossReceiptsTax: v }))}
                  onSave={() => saveField("grossReceiptsTax")} saving={saving === "grossReceiptsTax"} />
                <Kpi icon={Wallet} label="Gastos fijos del negocio" editable
                  draftValue={draft.fixedCosts} onDraftChange={v => setDraft(d => ({ ...d, fixedCosts: v }))}
                  onSave={() => saveField("fixedCosts")} saving={saving === "fixedCosts"} />
              </>
            ) : (
              <>
                <Kpi icon={Megaphone} label={`Publicidad${data.advertisingSource === "ml" ? "" : " (aprox.)"}`}
                  value={fmtMoney(data.advertising)} tone="gray" autoBadge={data.advertisingSource === "ml"} />
                <Kpi icon={Landmark} label={`Ingresos Brutos${data.isManualExact ? "" : " (aprox.)"}`} value={fmtMoney(data.grossReceiptsTax)} tone="gray" />
                <Kpi icon={Wallet} label={`Gastos fijos${data.isManualExact ? "" : " (aprox.)"}`} value={fmtMoney(data.fixedCosts)} tone="gray" />
              </>
            )}
            <Kpi icon={PiggyBank} label="Ganancia neta" value={fmtMoney(data.netProfit)} tone={data.netProfit >= 0 ? "green" : "red"} />
          </div>

          {viewMode === "range" && !data.isManualExact && (
            <p style={{ margin: 0, fontSize: ".76rem", color: "var(--text-secondary)" }}>
              (aprox.): tu carga de Ingresos Brutos/gastos fijos es un monto único por mes calendario — como el rango elegido no cubre meses completos, se prorratea por día. El gasto de publicidad real de Mercado Libre, cuando está disponible, no se prorratea: se pide exacto para estas fechas.
            </p>
          )}
        </>
      )}

      {(viewMode === "month" ? products : rangeProducts).length > 0 && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: ".9rem" }}>
            Productos que más facturaron {viewMode === "month" ? `en ${selectedKey ? monthLabel(selectedKey, true) : "el mes"}` : "en el rango"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(viewMode === "month" ? products : rangeProducts).map(p => (
              <div key={p.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--surface-2,#f9fafb)" }}>
                <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 10 }}>{fmt(p.units)} u.</span>
                <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 10 }}>{fmtMoney(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "month" && (
        <>
          <div className="card" style={{ padding: "16px 18px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: ".9rem" }}>Facturación vs. Ganancia neta</h3>
            <MonthlyLineChart months={months} key1="revenue" key2="netProfit" color1="#f59e0b" color2="#16a34a" label1="Facturación" label2="Ganancia neta" />
          </div>

          <div className="card" style={{ padding: "16px 18px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: ".9rem" }}>Facturación vs. Publicidad</h3>
            <MonthlyBarChart months={months} key1="revenue" key2="advertising" color1="#f59e0b" color2="#6366f1" label1="Facturación" label2="Publicidad" />
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderRadius: 10, background: "var(--surface-2,#f9fafb)", fontSize: ".78rem", color: "var(--text-secondary)" }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Facturación, comisión de Mercado Libre, costo de envío y costo de producto son datos reales de tus ventas.
          {hasAutoAds
            ? " Publicidad se trae automático de tu cuenta de Product Ads de Mercado Libre."
            : " Publicidad se carga a mano — tu cuenta de Mercado Libre no tiene Product Ads habilitado (si lo activás, Ventaz empieza a traerlo automático sin que tengas que hacer nada más)."}
          {" "}Ingresos Brutos y gastos fijos los cargás vos cada mes — Mercado Libre no tiene forma de reportar esos dos.
        </span>
      </div>
    </div>
  );
}
