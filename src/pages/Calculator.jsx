import { useMemo, useState } from "react";
import "../styles/Calculator.css";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

// platformPct por tramo de monto del pedido
const PLATFORM_PCTS = [30, 27.5, 22, 20];

// Reducción de costo vs base (30%):
//   tier 1: 1.10×1.275 vs 1.10×1.30 → (1.43-1.4025)/1.43 ≈ 1.9% → ~2%
//   tier 2: 1.10×1.22  vs 1.10×1.30 → (1.43-1.342)/1.43  ≈ 6.2% → ~6%
//   tier 3: 1.10×1.20  vs 1.10×1.30 → (1.43-1.32)/1.43   ≈ 7.7% → ~8%
const TIERS = [
  { threshold: 0,       nextThreshold: 100_000, label: "Pedido estándar",   range: "Hasta $100k",     desc: "Costo base"       },
  { threshold: 100_000, nextThreshold: 250_000, label: "Pedido grande",     range: "$100k – $250k",   desc: "El costo baja ~2%" },
  { threshold: 250_000, nextThreshold: 500_000, label: "Pedido muy grande", range: "$250k – $500k",   desc: "El costo baja ~6%" },
  { threshold: 500_000, nextThreshold: null,    label: "Pedido mayorista",  range: "Más de $500k",    desc: "El costo baja ~8%" },
];

const QUICK_MARKUPS = [
  { label: "Mínimo", pct: 0 },
  { label: "+25%",   pct: 25 },
  { label: "+50%",   pct: 50 },
  { label: "+100%",  pct: 100 },
];

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function money(n) {
  if (!Number.isFinite(Number(n)) || Number(n) <= 0) return "—";
  return `$${fmt(n)}`;
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function Calculator() {
  const [costo,    setCosto]    = useState("");
  const [precio,   setPrecio]   = useState("");
  const [cantidad, setCantidad] = useState(1);

  const data = useMemo(() => {
    const costoUnidad  = Math.max(0, numberValue(costo));
    const precioVenta  = Math.max(0, numberValue(precio));
    const unidades     = Math.max(1, parseInt(cantidad, 10) || 1);

    const precioMinimo = costoUnidad; // precio mínimo = costo base (no se puede vender menos)
    const totalVenta   = precioVenta * unidades;

    // Tier del pedido según su monto total
    const activeTierIdx = totalVenta >= 500_000 ? 3
      : totalVenta >= 250_000 ? 2
      : totalVenta >= 100_000 ? 1 : 0;

    const platformPct = PLATFORM_PCTS[activeTierIdx];

    // costoUnidad fue calculado con tier base 30%.
    // Cuando el pedido cae en un tier mejor, el costo real es proporcialmente menor:
    //   adjustedCost = costoUnidad × (1 + platformPct/100) / 1.30
    const adjustedCost   = costoUnidad > 0 ? costoUnidad * (1 + platformPct / 100) / 1.30 : 0;
    const gananciaUnidad = Math.max(0, precioVenta - adjustedCost);
    const ganancia       = gananciaUnidad * unidades;
    const margenPct      = adjustedCost > 0 && precioVenta > adjustedCost
      ? ((precioVenta - adjustedCost) / adjustedCost * 100)
      : 0;

    const precioValido = costoUnidad > 0 && precioVenta >= precioMinimo;
    const faltaPrecio  = costoUnidad > 0 && precioVenta <= 0;
    const porDebajo    = costoUnidad > 0 && precioVenta > 0 && precioVenta < precioMinimo;

    return {
      costoUnidad, precioVenta, unidades, adjustedCost,
      precioMinimo, totalVenta, gananciaUnidad, ganancia, margenPct,
      precioValido, faltaPrecio, porDebajo, activeTierIdx,
    };
  }, [costo, precio, cantidad]);

  function setQuickPrice(pct) {
    if (!data.costoUnidad) return;
    const next = Math.round(data.precioMinimo * (1 + pct / 100));
    setPrecio(String(next));
  }

  function fillExample() {
    setCosto("15600");
    setCantidad(3);
    setPrecio("23000");
  }

  const ready   = data.costoUnidad > 0 && data.precioVenta > 0;
  const message = !data.costoUnidad
    ? "Primero cargá el costo del producto."
    : data.faltaPrecio
      ? "Ahora cargá el precio al que querés vender."
      : data.porDebajo
        ? `Ese precio está por debajo de tu costo: ${money(data.precioMinimo)}.`
        : "Precio válido. Todo lo que vendas por encima del costo es tuyo.";

  return (
    <main className="vtz-calc-simple">
      <section className="vtz-calc-top">
        <div>
          <span className="vtz-calc-kicker">
            <Sparkles size={16} />
            Calculadora
          </span>
          <h1>Calculá rápido tu ganancia.</h1>
          <p>
            Ingresá el costo del producto (el que figura en la plataforma), el precio al que lo vendés y la cantidad.
          </p>
        </div>

        <button type="button" onClick={fillExample} className="vtz-calc-example">
          Usar ejemplo
        </button>
      </section>

      <section className="vtz-calc-layout">
        <article className="vtz-calc-box vtz-calc-form">
          <div className="vtz-calc-box__title">
            <div>
              <h2>Calculadora</h2>
            </div>
          </div>

          <label className="vtz-calc-field">
            <span>Costo del producto</span>
            <div className="vtz-calc-input">
              <b>$</b>
              <input
                type="number"
                min="0"
                placeholder="Ej: 15600"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
            </div>
            <small style={{ color: "var(--text-tertiary, #9ca3af)", fontSize: ".78rem" }}>
              Usá el costo que aparece en la sección de productos.
            </small>
          </label>

          <label className="vtz-calc-field">
            <span>Precio al que querés vender</span>
            <div className="vtz-calc-input">
              <b>$</b>
              <input
                type="number"
                min="0"
                placeholder={data.costoUnidad ? `Mínimo: ${fmt(data.precioMinimo)}` : "Ej: 23000"}
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
          </label>

          <div className="vtz-calc-quick">
            <span>Precio rápido</span>
            <div>
              {QUICK_MARKUPS.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  disabled={!data.costoUnidad}
                  onClick={() => setQuickPrice(item.pct)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label className="vtz-calc-field vtz-calc-field--small">
            <span>Cantidad</span>
            <div className="vtz-calc-input">
              <input
                type="number"
                min="1"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
          </label>

          <div className={`vtz-calc-message ${data.porDebajo ? "is-warning" : ready ? "is-ok" : ""}`}>
            {data.porDebajo ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{message}</span>
          </div>
        </article>

        <article className="vtz-calc-result-card">
          <div className="vtz-calc-result-card__icon">
            <Zap size={30} />
          </div>

          <span>Tu ganancia estimada</span>
          <h2>{money(data.ganancia)}</h2>

          <p>
            {ready
              ? `Vendiendo ${data.unidades} unidad${data.unidades > 1 ? "es" : ""} a ${money(data.precioVenta)}.`
              : "Completá los datos para ver el resultado."}
          </p>

          {ready && data.activeTierIdx > 0 && (
            <p style={{ margin: "4px 0 8px", fontSize: ".8rem", color: "var(--brand)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} /> Pedido grande: {TIERS[data.activeTierIdx].desc.toLowerCase()}
            </p>
          )}

          <div className="vtz-calc-main-numbers">
            <div>
              <small>Precio mínimo</small>
              <strong>{money(data.precioMinimo)}</strong>
            </div>
            <div>
              <small>Ganancia por unidad</small>
              <strong>{money(data.gananciaUnidad)}</strong>
            </div>
          </div>

          <div className="vtz-calc-detail-title">Detalle</div>

          <div className="vtz-calc-detail">
            <div>
              <span>Total venta</span>
              <strong>{money(data.totalVenta)}</strong>
            </div>
            <div>
              <span>Ganancia total</span>
              <strong>{money(data.ganancia)}</strong>
            </div>
            <div>
              <span>Margen sobre costo</span>
              <strong>{ready && data.margenPct > 0 ? `${data.margenPct.toFixed(1)}%` : "—"}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="vtz-calc-guide">
        <div>
          <TrendingUp size={20} />
          <strong>Tu ganancia es el 100%</strong>
          <span>Todo lo que vendas por encima del costo mostrado es tuyo. Sin comisiones.</span>
        </div>

        <div>
          <Zap size={20} />
          <strong>El costo ya incluye todo</strong>
          <span>El costo que ves en la plataforma ya contempla los márgenes operativos.</span>
        </div>

        <div>
          <ArrowRight size={20} />
          <strong>Precio mínimo = costo</strong>
          <span>No podés vender por debajo del costo. Por encima, lo que quieras.</span>
        </div>
      </section>

      <section className="vtz-calc-tiers">
        <div className="vtz-calc-tiers__head">
          <TrendingUp size={18} />
          <strong>En pedidos grandes, el costo baja automáticamente</strong>
        </div>
        <p className="vtz-calc-tiers__sub">
          Si el total de un pedido supera cierto monto, el costo de todos sus productos se reduce. A más grande el pedido, más ganás.
        </p>

        <div className="vtz-calc-tiers__grid">
          {TIERS.map((t, i) => {
            const isActive  = data.totalVenta > 0 && data.activeTierIdx === i;
            const isReached = data.totalVenta > 0 && data.activeTierIdx > i;

            return (
              <div
                key={i}
                className={[
                  "vtz-calc-tier",
                  isActive  ? "is-current"  : "",
                  isReached ? "is-unlocked" : "",
                  !isActive && !isReached ? "is-locked" : "",
                  t.nextThreshold === null && isActive ? "is-max" : "",
                ].filter(Boolean).join(" ")}
              >
                <div className="vtz-calc-tier__header">
                  <span className="vtz-calc-tier__label">{t.label}</span>
                  {isActive && <span className="vtz-calc-tier__badge">Este pedido</span>}
                  {t.nextThreshold === null && isActive && <Star size={13} className="vtz-calc-tier__star" />}
                </div>

                <div className="vtz-calc-tier__range">{t.range}</div>

                <div className="vtz-calc-tier__cost" style={{ marginTop: 8 }}>
                  <span style={{
                    fontSize: ".82rem",
                    fontWeight: 600,
                    color: isActive ? "var(--brand, #6366f1)" : isReached ? "var(--success, #16a34a)" : "var(--text-secondary)",
                  }}>
                    {t.desc}
                  </span>
                </div>

                {isActive && t.nextThreshold && data.totalVenta > 0 && (
                  <p style={{ margin: "8px 0 0", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    Superá <strong>{money(t.nextThreshold)}</strong> para el siguiente tramo
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
