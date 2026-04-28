// src/pages/Calculator.jsx
// Calculadora simple e intuitiva de Ventaz
// cambio hecho por Yolo

import { useMemo, useState } from "react";
import "../styles/Calculator.css";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  HelpCircle,
  Package,
  Percent,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

const COMISIONES = [
  { min: 0, max: 100000, pct: 40 },
  { min: 100000, max: 500000, pct: 45 },
  { min: 500000, max: 1000000, pct: 50 },
  { min: 1000000, max: Infinity, pct: 60 },
];

const QUICK_MARKUPS = [
  { label: "Mínimo", pct: 0 },
  { label: "+25%", pct: 25 },
  { label: "+50%", pct: 50 },
  { label: "+100%", pct: 100 },
];

function calcPct(total) {
  return COMISIONES.find((c) => total >= c.min && total < c.max)?.pct || 40;
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
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
  const [costo, setCosto] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [showDetail, setShowDetail] = useState(false);

  const data = useMemo(() => {
    const costoUnidad = Math.max(0, numberValue(costo));
    const precioVenta = Math.max(0, numberValue(precio));
    const unidades = Math.max(1, parseInt(cantidad, 10) || 1);

    const precioMinimo = costoUnidad * 1.2;
    const totalVenta = precioVenta * unidades;
    const margenUnidad = precioVenta - costoUnidad;
    const margenTotal = margenUnidad * unidades;
    const pctComision = calcPct(totalVenta);
    const ganancia = Math.max(0, margenTotal * (pctComision / 100));
    const gananciaUnidad = ganancia / unidades;
    const precioValido = costoUnidad > 0 && precioVenta >= precioMinimo;
    const faltaPrecio = costoUnidad > 0 && precioVenta <= 0;
    const porDebajo = costoUnidad > 0 && precioVenta > 0 && precioVenta < precioMinimo;

    return {
      costoUnidad,
      precioVenta,
      unidades,
      precioMinimo,
      totalVenta,
      margenUnidad,
      margenTotal,
      pctComision,
      ganancia,
      gananciaUnidad,
      precioValido,
      faltaPrecio,
      porDebajo,
    };
  }, [costo, precio, cantidad]);

  function setQuickPrice(pct) {
    if (!data.costoUnidad) return;
    const min = data.precioMinimo;
    const next = Math.round(min * (1 + pct / 100));
    setPrecio(String(next));
  }

  function fillExample() {
    setCosto("5000");
    setCantidad(3);
    setPrecio("12000");
  }

  const ready = data.costoUnidad > 0 && data.precioVenta > 0;
  const message = !data.costoUnidad
    ? "Primero cargá el costo del producto."
    : data.faltaPrecio
      ? "Ahora cargá el precio al que querés vender."
      : data.porDebajo
        ? `Ese precio está por debajo del mínimo sugerido: ${money(data.precioMinimo)}.`
        : "Precio válido para simular tu ganancia.";

  return (
    <main className="vtz-calc-simple">
      <section className="vtz-calc-top">
        <div>
          <span className="vtz-calc-kicker">
            <Sparkles size={16} />
            Calculadora de ganancias
          </span>
          <h1>Calculá rápido cuánto ganarías.</h1>
          <p>
            Poné el costo, elegí tu precio de venta y mirá la ganancia estimada.
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
              <span>Paso único</span>
              <h2>Datos básicos</h2>
            </div>
          </div>

          <label className="vtz-calc-field">
            <span>
              <Package size={17} />
              Costo del producto
            </span>
            <div className="vtz-calc-input">
              <b>$</b>
              <input
                type="number"
                min="0"
                placeholder="Ej: 5000"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
            </div>
          </label>

          <label className="vtz-calc-field">
            <span>
              <CircleDollarSign size={17} />
              Precio al que querés vender
            </span>
            <div className="vtz-calc-input">
              <b>$</b>
              <input
                type="number"
                min="0"
                placeholder={data.costoUnidad ? `Mínimo: ${fmt(data.precioMinimo)}` : "Ej: 12000"}
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

          <span>Ganancia estimada</span>
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

          <button type="button" className="vtz-calc-detail-btn" onClick={() => setShowDetail((v) => !v)}>
            <HelpCircle size={17} />
            {showDetail ? "Ocultar detalle" : "Ver detalle simple"}
          </button>

          {showDetail && (
            <div className="vtz-calc-detail">
              <div>
                <span>Total venta</span>
                <strong>{money(data.totalVenta)}</strong>
              </div>
              <div>
                <span>Margen total</span>
                <strong>{money(data.margenTotal)}</strong>
              </div>
              <div>
                <span>Escala aplicada</span>
                <strong>{ready ? `${data.pctComision}%` : "—"}</strong>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="vtz-calc-guide">
        <div>
          <TrendingUp size={20} />
          <strong>Cómo usarla</strong>
          <span>Probá distintos precios hasta encontrar uno que te cierre.</span>
        </div>

        <div>
          <Percent size={20} />
          <strong>Qué mirar</strong>
          <span>La ganancia estimada y el precio mínimo son lo más importante.</span>
        </div>

        <div>
          <ArrowRight size={20} />
          <strong>Después</strong>
          <span>Cuando estés conforme, usá ese precio al publicar tu producto.</span>
        </div>
      </section>
    </main>
  );
}
