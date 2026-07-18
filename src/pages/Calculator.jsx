import { useMemo, useRef, useState, useEffect } from "react";
import "../styles/Calculator.css";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
  Search,
  Loader2,
} from "lucide-react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";

const PLATFORM_PCTS = [30, 27.5, 22, 20];

const TIERS = [
  { threshold: 0,       nextThreshold: 100_000, label: "Pedido estándar",   range: "Hasta $100k",     desc: "Costo base",       color: "#64748b" },
  { threshold: 100_000, nextThreshold: 250_000, label: "Pedido grande",     range: "$100k – $250k",   desc: "El costo baja ~2%", color: "#2563eb" },
  { threshold: 250_000, nextThreshold: 500_000, label: "Pedido muy grande", range: "$250k – $500k",   desc: "El costo baja ~6%", color: "#16a34a" },
  { threshold: 500_000, nextThreshold: null,    label: "Pedido mayorista",  range: "Más de $500k",    desc: "El costo baja ~8%", color: "#7c3aed" },
];

const QUICK_MARKUPS = [
  { label: "Mínimo", pct: 0 },
  { label: "+25%",   pct: 25 },
  { label: "+50%",   pct: 50 },
  { label: "+100%",  pct: 100 },
];

const MAX_PRICE = 9_999_999;

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

// ── Calculadora para Mercado Libre ──────────────────────────────────────────
// El sistema de tramos de arriba es específico del modelo de tienda propia — ML tiene su
// propia comisión por categoría, así que en vez de tramos usamos los mismos endpoints que ya
// usa el modal de publicar en /mercado-libre: buscador de categoría + GET listing-fees.
function MlCalculator() {
  const [connected, setConnected]   = useState(null); // null = todavía no se sabe
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [categoryId,  setCategoryId]  = useState("");
  const [price,       setPrice]       = useState("");
  const [weight,      setWeight]      = useState("");
  const [freeShipping, setFreeShipping] = useState(true);
  const [withInstallments, setWithInstallments] = useState(false);
  const [fees,         setFees]        = useState(null);
  const [feesLoading,  setFeesLoading] = useState(false);

  // Selector de producto real del catálogo — autocompleta peso y costo en vez de cargarlos a mano.
  const [productQuery,       setProductQuery]       = useState("");
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [selectedProduct,    setSelectedProduct]     = useState(null);

  useEffect(() => {
    client.get("/seller/ml/status")
      .then(r => setConnected(!!r.data?.connected))
      .catch(() => setConnected(false));
  }, []);

  function searchCategories(q = query) {
    if (!q.trim()) return;
    client.get("/seller/ml/categories/suggest", { params: { q } })
      .then(r => setSuggestions(r.data || []))
      .catch(() => setSuggestions([]));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (productQuery.trim().length < 2) { setProductSuggestions([]); return; }
      client.get("/seller/ml/products/search", { params: { q: productQuery } })
        .then(r => setProductSuggestions(r.data || []))
        .catch(() => setProductSuggestions([]));
    }, 350);
    return () => clearTimeout(t);
  }, [productQuery]);

  function pickProduct(p) {
    setSelectedProduct(p);
    setProductQuery(p.name);
    setProductSuggestions([]);
    setWeight(p.weightGrams > 0 ? String(p.weightGrams) : "");
    // Autocompletar categoría también — busca por el nombre del producto y, si encuentra algo,
    // deja la primera sugerencia ya seleccionada para que solo falte precio/envío/cuotas.
    setQuery(p.name);
    client.get("/seller/ml/categories/suggest", { params: { q: p.name } })
      .then(r => {
        const found = r.data || [];
        setSuggestions(found);
        if (found[0]) setCategoryId(found[0].categoryId);
      })
      .catch(() => {});
  }

  useEffect(() => {
    const p = Number(price);
    const t = setTimeout(() => {
      if (!categoryId || !p || p <= 0) { setFees(null); return; }
      setFeesLoading(true);
      // Volumen aproximado a partir del peso para poder pedir el costo de envío cuando no hay
      // un producto real seleccionado — mismo criterio de cubo que usa mlListingService en el
      // backend. Si hay un producto elegido, se usa su volumen real en vez de aproximarlo.
      const weightGrams = Number(weight) || 0;
      const volumeCm3 = selectedProduct?.volumeCm3 > 0
        ? selectedProduct.volumeCm3
        : (weightGrams > 0 ? weightGrams * 4 : 0); // aprox. densidad típica de paquetería
      client.get("/seller/ml/listing-fees", {
        params: {
          price: p, categoryId,
          ...(weightGrams > 0 ? { weightGrams, volumeCm3, freeShipping: String(freeShipping) } : {}),
        },
      })
        .then(r => setFees(r.data))
        .catch(() => setFees(null))
        .finally(() => setFeesLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [categoryId, price, weight, freeShipping, selectedProduct]);

  const shippingCost = freeShipping ? Number(fees?.shippingCost || 0) : 0;
  const installmentsCost = withInstallments ? Number(fees?.installments?.extraCost || 0) : 0;
  const netAfterShipping = fees ? Number(fees.netAmount) - shippingCost - installmentsCost : null;
  const productCost = selectedProduct ? Number(selectedProduct.priceFloor) : null;
  const profit = netAfterShipping !== null && productCost !== null ? netAfterShipping - productCost : null;

  if (connected === null) {
    return (
      <main className="vtz-calc-simple">
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 size={20} className="spin" />
        </div>
      </main>
    );
  }

  if (!connected) {
    return (
      <main className="vtz-calc-simple">
        <section className="vtz-calc-top">
          <div>
            <span className="vtz-calc-kicker"><Sparkles size={16} /> Calculadora</span>
            <h1>Conectá tu cuenta de Mercado Libre</h1>
            <p>Necesitás tener Mercado Libre conectado para ver la comisión y lo que recibís por categoría.</p>
          </div>
        </section>
        <Link to="/mercado-libre" className="btn btn--primary" style={{ display: "inline-flex", width: "fit-content" }}>
          Ir a Mercado Libre
        </Link>
      </main>
    );
  }

  return (
    <main className="vtz-calc-simple">
      <section className="vtz-calc-top">
        <div>
          <span className="vtz-calc-kicker"><Sparkles size={16} /> Calculadora</span>
          <h1>Calculá tu comisión en Mercado Libre.</h1>
          <p>Buscá la categoría del producto y cargá el precio para ver cuánto te cobra Mercado Libre y cuánto recibís.</p>
        </div>
      </section>

      <section className="vtz-calc-layout">
        <article className="vtz-calc-box vtz-calc-form">
          <div className="vtz-calc-box__title"><div><h2>Producto</h2></div></div>

          <label className="vtz-calc-field" style={{ position: "relative" }}>
            <span>Buscar producto del catálogo — opcional</span>
            <input className="form-input" value={productQuery}
              onChange={e => { setProductQuery(e.target.value); setSelectedProduct(null); }}
              placeholder="Ej: mesa de luz" />
            {productSuggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 5,
                background: "var(--bg-elevated, #fff)", border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: "auto",
              }}>
                {productSuggestions.map(p => (
                  <div key={p.id} onClick={() => pickProduct(p)}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: ".9rem" }}>
                    {p.name}
                  </div>
                ))}
              </div>
            )}
            <small style={{ color: "var(--text-tertiary, #9ca3af)", fontSize: ".78rem" }}>
              Elegí un producto real y completamos peso, costo y categoría solos.
            </small>
          </label>

          <div className="vtz-calc-box__title" style={{ marginTop: 8 }}><div><h2>Categoría y precio</h2></div></div>

          <label className="vtz-calc-field">
            <span>Categoría de Mercado Libre</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchCategories()}
                placeholder="Palabras clave, ej: mesa de luz" />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => searchCategories()}><Search size={13} /></button>
            </div>
          </label>

          <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ marginBottom: 16 }}>
            <option value="">{suggestions.length ? "Seleccioná..." : "Buscá una categoría primero"}</option>
            {suggestions.map(s => <option key={s.categoryId} value={s.categoryId}>{s.categoryName}</option>)}
          </select>

          <label className="vtz-calc-field">
            <span>Precio de venta</span>
            <div className="vtz-calc-input">
              <b>$</b>
              <input type="number" min="0" placeholder="Ej: 23000" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </label>

          <label className="vtz-calc-field">
            <span>Peso del producto (gramos) {selectedProduct?.weightGrams > 0 ? "" : "— opcional"}</span>
            <input className="form-input" type="number" min="0" placeholder="Ej: 500"
              value={weight} onChange={e => setWeight(e.target.value)}
              readOnly={!!selectedProduct?.weightGrams} />
            <small style={{ color: "var(--text-tertiary, #9ca3af)", fontSize: ".78rem" }}>
              {selectedProduct && !selectedProduct.weightGrams
                ? "Este producto no tiene peso cargado en el catálogo — completalo a mano para estimar el envío."
                : "Con el peso cargado, también estimamos el costo de envío."}
            </small>
          </label>

          {weight && (
            <label className="vtz-calc-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={freeShipping} onChange={e => setFreeShipping(e.target.checked)} />
              <span>Ofrecer envío gratis al comprador</span>
            </label>
          )}

          {fees?.installments && (
            <label className="vtz-calc-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={withInstallments} onChange={e => setWithInstallments(e.target.checked)} />
              <span>Ofrecer cuotas sin interés (publicación Premium)</span>
            </label>
          )}
        </article>

        <article className="vtz-calc-result-card">
          <div className="vtz-calc-result-card__icon"><Zap size={30} /></div>
          <span>{selectedProduct ? "Tu ganancia" : "Recibís"}</span>
          <h2>{feesLoading ? "—" : fees ? money(selectedProduct ? profit : netAfterShipping) : "—"}</h2>
          <p>
            {!categoryId
              ? "Elegí una categoría para calcular la comisión."
              : !price
                ? "Cargá un precio para ver el resultado."
                : feesLoading
                  ? "Calculando..."
                  : "Comisión de Mercado Libre para esta categoría y precio."}
          </p>

          {fees && !feesLoading && (
            <div className="vtz-calc-breakdown">
              <div className="vtz-calc-breakdown__row">
                <span>Precio de venta</span>
                <strong>{money(Number(price))}</strong>
              </div>
              {selectedProduct && (
                <div className="vtz-calc-breakdown__row">
                  <span>Costo del producto</span>
                  <strong>-{money(productCost)}</strong>
                </div>
              )}
              <div className="vtz-calc-breakdown__row">
                <span>Cargo por vender</span>
                <strong>-{money(fees.saleFeeAmount)}</strong>
              </div>
              <div className="vtz-calc-breakdown__row">
                <span>Costo por ofrecer cuotas</span>
                <strong>{installmentsCost > 0 ? `-${money(installmentsCost)}` : "$0"}</strong>
              </div>
              {weight && (
                <div className="vtz-calc-breakdown__row">
                  <span>Costo por envío</span>
                  <strong>{shippingCost > 0 ? `-${money(shippingCost)}` : "$0"}</strong>
                </div>
              )}
              <div className="vtz-calc-breakdown__row">
                <span>Impuestos estimados</span>
                <strong>$0</strong>
              </div>
              <div className="vtz-calc-breakdown__row vtz-calc-breakdown__row--total">
                <span>{selectedProduct ? "Tu ganancia" : "Recibís"}</span>
                <strong>{money(selectedProduct ? profit : netAfterShipping)}</strong>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function EcommerceCalculator() {
  const [costo,    setCosto]    = useState("");
  const [precio,   setPrecio]   = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [tierToast, setTierToast] = useState(null); // índice del tier nuevo
  const prevTierRef = useRef(0);

  const data = useMemo(() => {
    const costoUnidad  = Math.max(0, Math.min(MAX_PRICE, numberValue(costo)));
    const precioVenta  = Math.max(0, Math.min(MAX_PRICE, numberValue(precio)));
    const unidades     = Math.max(1, Math.min(9999, parseInt(cantidad, 10) || 1));

    const precioMinimo = costoUnidad;
    const totalVenta   = precioVenta * unidades;

    const activeTierIdx = totalVenta >= 500_000 ? 3
      : totalVenta >= 250_000 ? 2
      : totalVenta >= 100_000 ? 1 : 0;

    const platformPct   = PLATFORM_PCTS[activeTierIdx];
    const adjustedCost  = costoUnidad > 0 ? costoUnidad * (1 + platformPct / 100) / 1.30 : 0;
    const gananciaUnidad = Math.max(0, precioVenta - adjustedCost);
    const ganancia       = gananciaUnidad * unidades;
    const margenPct      = adjustedCost > 0 && precioVenta > adjustedCost
      ? ((precioVenta - adjustedCost) / adjustedCost * 100)
      : 0;

    const precioValido = costoUnidad > 0 && precioVenta >= precioMinimo;
    const faltaPrecio  = costoUnidad > 0 && precioVenta <= 0;
    const porDebajo    = costoUnidad > 0 && precioVenta > 0 && precioVenta < precioMinimo;

    // Progreso hacia el próximo tier (0–100)
    const tier = TIERS[activeTierIdx];
    const tierProgress = tier.nextThreshold && totalVenta > 0
      ? Math.min(100, ((totalVenta - tier.threshold) / (tier.nextThreshold - tier.threshold)) * 100)
      : activeTierIdx === 3 ? 100 : 0;

    const faltaParaSiguiente = tier.nextThreshold && totalVenta < tier.nextThreshold
      ? tier.nextThreshold - totalVenta
      : null;

    return {
      costoUnidad, precioVenta, unidades, adjustedCost,
      precioMinimo, totalVenta, gananciaUnidad, ganancia, margenPct,
      precioValido, faltaPrecio, porDebajo, activeTierIdx,
      tierProgress, faltaParaSiguiente,
    };
  }, [costo, precio, cantidad]);

  // Toast cuando se sube de tier
  useEffect(() => {
    if (data.totalVenta <= 0) { prevTierRef.current = 0; return; }
    if (data.activeTierIdx > prevTierRef.current) {
      setTierToast(data.activeTierIdx);
      const t = setTimeout(() => setTierToast(null), 4500);
      prevTierRef.current = data.activeTierIdx;
      return () => clearTimeout(t);
    }
    // Si bajan los valores, actualizar referencia
    if (data.activeTierIdx < prevTierRef.current) {
      prevTierRef.current = data.activeTierIdx;
    }
  }, [data.activeTierIdx, data.totalVenta]);

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

  const activeTier = TIERS[data.activeTierIdx];

  return (
    <main className="vtz-calc-simple">

      {/* ── Toast de tier nuevo ── */}
      {tierToast !== null && (
        <div className="vtz-calc-toast">
          <Trophy size={18} />
          <div>
            <strong>¡Tramo desbloqueado!</strong>
            <span>{TIERS[tierToast].label} — {TIERS[tierToast].desc}</span>
          </div>
        </div>
      )}

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
                max={MAX_PRICE}
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
                max={MAX_PRICE}
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
                max="9999"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1)))}
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

          {/* ── Indicador de tramo activo ── */}
          <div className={`vtz-calc-tier-panel ${data.totalVenta > 0 ? "is-active" : ""}`}
               style={{ "--tier-color": activeTier.color }}>
            <div className="vtz-calc-tier-panel__row">
              <div className="vtz-calc-tier-panel__badge">
                {data.activeTierIdx === 3 ? <Star size={11} /> : <Zap size={11} />}
                {activeTier.label}
              </div>
              <span className="vtz-calc-tier-panel__desc">{activeTier.desc}</span>
            </div>

            {/* Barra de progreso hacia el siguiente tramo */}
            {data.totalVenta > 0 && activeTier.nextThreshold && (
              <>
                <div className="vtz-calc-tier-panel__bar">
                  <div className="vtz-calc-tier-panel__bar-fill" style={{ width: `${data.tierProgress}%` }} />
                </div>
                <div className="vtz-calc-tier-panel__hint">
                  Te faltan <strong>{money(data.faltaParaSiguiente)}</strong> para "{TIERS[data.activeTierIdx + 1].label}"
                </div>
              </>
            )}
            {data.totalVenta > 0 && data.activeTierIdx === 3 && (
              <div className="vtz-calc-tier-panel__max">
                ¡Estás en el tramo máximo! 🎉
              </div>
            )}
          </div>

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

      {/* ── Tramos de descuento — ARRIBA del guide ── */}
      <section className="vtz-calc-tiers">
        <div className="vtz-calc-tiers__head">
          <TrendingUp size={18} />
          <strong>Tramos por monto de pedido</strong>
        </div>
        <p className="vtz-calc-tiers__sub">
          Si el total del pedido supera cierto monto, el costo de todos sus productos baja automáticamente. A más grande el pedido, más ganás.
        </p>

        <div className="vtz-calc-tiers__grid">
          {TIERS.map((t, i) => {
            const isActive  = data.totalVenta > 0 && data.activeTierIdx === i;
            const isReached = data.totalVenta > 0 && data.activeTierIdx > i;

            // Progreso de este tier (solo si es el activo y tiene siguiente)
            const thisPct = isActive && t.nextThreshold && data.totalVenta > 0
              ? Math.min(100, ((data.totalVenta - t.threshold) / (t.nextThreshold - t.threshold)) * 100)
              : isReached ? 100 : 0;

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
                  <span className="vtz-calc-tier__num">{i + 1}</span>
                  <span className="vtz-calc-tier__label">{t.label}</span>
                  {isActive && <span className="vtz-calc-tier__badge">Activo</span>}
                  {isReached && !isActive && <CheckCircle2 size={13} className="vtz-calc-tier__check" />}
                </div>

                <div className="vtz-calc-tier__range">{t.range}</div>

                <div className="vtz-calc-tier__cost">
                  <span style={{
                    fontSize: ".85rem",
                    fontWeight: 700,
                    color: isActive ? t.color : isReached ? "#16a34a" : "#94a3b8",
                  }}>
                    {t.desc}
                  </span>
                </div>

                {/* Barra de progreso solo en el tier activo */}
                {isActive && t.nextThreshold && (
                  <div className="vtz-calc-tier__progress-wrap">
                    <div className="vtz-calc-tier__progress">
                      <div className="vtz-calc-tier__progress-bar" style={{ width: `${thisPct}%`, background: t.color }} />
                    </div>
                    <small>{fmt(data.totalVenta)} / {fmt(t.nextThreshold)}</small>
                  </div>
                )}

                {isActive && t.nextThreshold === null && (
                  <p className="vtz-calc-tier__max-msg">¡Tramo máximo!</p>
                )}
              </div>
            );
          })}
        </div>
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

    </main>
  );
}

export default function Calculator() {
  const { seller } = useAuth();
  return seller?.onboarding_track === "mercadolibre" ? <MlCalculator /> : <EcommerceCalculator />;
}
