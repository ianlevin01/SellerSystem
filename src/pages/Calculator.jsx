import { useEffect, useMemo, useState } from "react";
import "../styles/Calculator.css";
import client from "../api/client";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

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
  const [tier,     setTier]     = useState(null);

  useEffect(() => {
    client.get("/seller/store/my-tier").then(r => setTier(r.data)).catch(() => {});
  }, []);

  const data = useMemo(() => {
    const costoUnidad  = Math.max(0, numberValue(costo));
    const precioVenta  = Math.max(0, numberValue(precio));
    const unidades     = Math.max(1, parseInt(cantidad, 10) || 1);

    // El precio mínimo es el costo mostrado — no se puede vender por debajo
    const precioMinimo    = costoUnidad;
    const totalVenta      = precioVenta * unidades;
    const gananciaUnidad  = Math.max(0, precioVenta - costoUnidad);
    const ganancia        = gananciaUnidad * unidades;
    const margenPct       = costoUnidad > 0 && precioVenta > costoUnidad
      ? ((precioVenta - costoUnidad) / costoUnidad * 100)
      : 0;

    const precioValido = costoUnidad > 0 && precioVenta >= precioMinimo;
    const faltaPrecio  = costoUnidad > 0 && precioVenta <= 0;
    const porDebajo    = costoUnidad > 0 && precioVenta > 0 && precioVenta < precioMinimo;

    return {
      costoUnidad, precioVenta, unidades,
      precioMinimo, totalVenta, gananciaUnidad, ganancia, margenPct,
      precioValido, faltaPrecio, porDebajo,
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

      {tier && !tier.isMaxTier && (
        <section className="vtz-calc-tier-card">
          <div className="vtz-calc-tier-card__head">
            <TrendingUp size={18} />
            <strong>Bajá tu costo vendiendo más</strong>
          </div>
          <p>
            Llevas <strong>{money(tier.totalSales)}</strong> en ventas.
            {" "}Te faltan <strong>{money(tier.remaining)}</strong> para alcanzar el siguiente nivel y pagar menos por cada producto.
          </p>
          {data.costoUnidad > 0 && tier.currentFactor && tier.nextFactor && (() => {
            const costoSiguiente = Math.round(data.costoUnidad * (tier.nextFactor / tier.currentFactor));
            const ahorroPorUnidad = data.costoUnidad - costoSiguiente;
            return ahorroPorUnidad > 0 ? (
              <p style={{ marginTop: 8 }}>
                Con ese nivel, este producto te costaría <strong>{money(costoSiguiente)}</strong>{" "}
                — <strong style={{ color: "var(--success, #16a34a)" }}>ahorrás {money(ahorroPorUnidad)} por unidad</strong>.
              </p>
            ) : null;
          })()}
          <div className="vtz-calc-tier-progress">
            <div
              className="vtz-calc-tier-progress__bar"
              style={{ width: `${Math.min(100, (tier.totalSales / tier.threshold) * 100).toFixed(1)}%` }}
            />
          </div>
          <small>{money(tier.totalSales)} / {money(tier.threshold)}</small>
        </section>
      )}

      {tier?.isMaxTier && (
        <section className="vtz-calc-tier-card vtz-calc-tier-card--max">
          <TrendingUp size={18} />
          <strong>Estás en el nivel máximo — tenés el costo más bajo posible.</strong>
        </section>
      )}
    </main>
  );
}
