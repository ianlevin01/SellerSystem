import { useState } from "react";

const COMISIONES = [
  { min: 0,       max: 100000,   pct: 40 },
  { min: 100000,  max: 500000,   pct: 45 },
  { min: 500000,  max: 1000000,  pct: 50 },
  { min: 1000000, max: Infinity, pct: 60 },
];

function calcPct(total) {
  return COMISIONES.find(c => total >= c.min && total < c.max)?.pct || 40;
}

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }

export default function Calculator() {
  const [costo,      setCosto]      = useState("");
  const [pctVendedor, setPctVendedor] = useState(20);
  const [cantidad,   setCantidad]   = useState(1);

  const costoVendedor    = costo ? Number(costo) : 0;
  const precioMinimo     = costoVendedor * 1.2;
  const precioVenta      = precioMinimo * (1 + Number(pctVendedor) / 100);
  const difPorUnidad     = precioVenta - costoVendedor;
  const totalVenta       = precioVenta * Number(cantidad);
  const difTotal         = difPorUnidad * Number(cantidad);
  const pctComision      = calcPct(totalVenta);
  const gananciaVendedor = difTotal * (pctComision / 100);

  const niveles = COMISIONES.map(c => ({
    ...c,
    activo: pctComision === c.pct,
    label:  c.max === Infinity
      ? `> $${fmt(c.min)}`
      : `$${fmt(c.min)} – $${fmt(c.max)}`,
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Calculadora de ganancias</h1>
        <p>Simulá cuánto ganás según el costo del producto y tu configuración de precios.</p>
      </div>

      <div className="calc-grid">
        {/* Inputs */}
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>Parámetros</h2>

          <div className="form-group">
            <label className="form-label">Costo del producto (en pesos)</label>
            <input type="number" min={0} className="form-input"
              placeholder="ej: 5000"
              value={costo} onChange={e => setCosto(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Tu % de aumento sobre precio mínimo
              <span style={{ float: "right", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {pctVendedor}%
              </span>
            </label>
            <input type="range" min={0} max={300} step={1}
              value={pctVendedor} onChange={e => setPctVendedor(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Cantidad de unidades</label>
            <input type="number" min={1} step={1} className="form-input"
              value={cantidad}
              onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
        </div>

        {/* Resultados */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Desglose de precio</h2>
            <div className="calc-breakdown">
              {[
                ["Costo",             costoVendedor ? `$${fmt(costoVendedor)}` : "—",   "var(--text-secondary)"],
                ["Precio mínimo",     precioMinimo  ? `$${fmt(precioMinimo)}`  : "—",   "var(--text-primary)"],
                ["Tu precio de venta",precioVenta   ? `$${fmt(precioVenta)}`   : "—",   "var(--brand)"],
                ["Margen x unidad",   difPorUnidad > 0 ? `$${fmt(difPorUnidad)}` : "—","var(--warning)"],
                ["Total venta",       totalVenta    ? `$${fmt(totalVenta)}`    : "—",   "var(--text-primary)"],
              ].map(([label, value, color]) => (
                <div key={label} className="calc-breakdown__row">
                  <span className="calc-breakdown__label">{label}</span>
                  <span className="calc-breakdown__value" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="calc-result-main">
            <div className="calc-result-main__label">Tu ganancia estimada</div>
            <div className="calc-result-main__value">${fmt(gananciaVendedor)}</div>
            <div style={{ marginTop: 8, fontSize: ".8rem", color: "#166534" }}>
              {pctComision}% sobre ${fmt(difTotal)} de margen total
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 14, fontSize: ".8125rem", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-tertiary)" }}>
              Escala activa
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {niveles.map(n => (
                <div key={n.pct} className={`commission-tier${n.activo ? " commission-tier--active" : ""}`}
                     style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="commission-tier__pct">{n.pct}%</span>
                    <span className="commission-tier__range">{n.label}</span>
                  </div>
                  {n.activo && (
                    <span className="badge badge--green">← actual</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
