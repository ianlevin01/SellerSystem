import { Loader2, Ban, AlertTriangle, TrendingUp } from "lucide-react";
import { IconBadge } from "./mlShared";
import { FREE_SHIPPING_MANDATORY_THRESHOLD_MLA } from "./mlUtils";

// Paso de precio/envío/cuotas — compartido por el wizard de publicación propia y el de
// publicación de catálogo (ver PublishCatalogModal.jsx). Puramente presentacional: recibe todo
// ya calculado por props, cada modal mantiene su propio estado/effect de fetch de fees (mismo
// criterio que el resto de esta sección: mejor un poco de código duplicado entre los dos
// wizards que arriesgar que la matemática de margen diverja silenciosamente si se comparte
// estado entre dos componentes con ciclos de vida distintos).
export default function PriceStep({
  price, setPrice, priceValid, priceFloor,
  showShippingToggle, shippingFree, setShippingFree, shippingFreeMandatory,
  feesLoading, fees, shippingCostKnown, shippingCost,
  installmentOptions, selectedInstallment, setSelectedInstallment, installmentsCost,
  hasCategory, netFinal, ganancia, gananciaPct, margenTier,
}) {
  const selectedOption = installmentOptions.find(o => o.id === selectedInstallment) || null;

  return (
    <div>
      <label style={{ fontSize: ".82rem", fontWeight: 700, display: "block", marginBottom: 8 }}>Precio en Mercado Libre</label>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 4, padding: "14px 18px", borderRadius: 14, marginBottom: 6,
        background: "var(--surface-2,#f9fafb)", border: price && !priceValid ? "1px solid var(--danger,#ef4444)" : "1px solid transparent",
      }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-secondary)" }}>$</span>
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
          style={{ border: "none", background: "none", outline: "none", fontSize: "1.7rem", fontWeight: 800, color: "var(--text)", width: "100%" }} />
      </div>
      {priceFloor != null && (
        <small style={{ display: "block", marginBottom: 14, color: "var(--text-secondary)" }}>
          Costo total: ${Math.round(priceFloor).toLocaleString("es-AR")}
        </small>
      )}

      {showShippingToggle && (
        <button type="button"
          className={`ml-cuota-card ml-toggle-card${shippingFree ? " is-active" : ""}${shippingFreeMandatory ? " is-locked" : ""}`}
          style={{ marginBottom: 16 }}
          disabled={shippingFreeMandatory}
          onClick={() => setShippingFree(v => !v)}>
          <span className="ml-toggle-card__box" />
          <span className="ml-cuota-card__body">
            <span className="ml-cuota-card__label">Ofrecer envío gratis</span>
            <span className="ml-cuota-card__desc">
              {shippingFreeMandatory
                ? `Obligatorio: Mercado Libre lo exige a partir de $${FREE_SHIPPING_MANDATORY_THRESHOLD_MLA.toLocaleString("es-AR")} y este producto lo supera.`
                : "A veces Mercado Libre lo exige a partir de cierto precio o categoría — si publicás sin tildarlo y ML lo requiere igual, lo activamos automáticamente y te avisamos."}
            </span>
          </span>
          <span className="ml-cuota-card__price">
            {feesLoading ? "…" : shippingCostKnown
              ? `$${Math.round(fees.shippingCost).toLocaleString("es-AR")}`
              : (fees ? "No calculado" : "—")}
          </span>
        </button>
      )}

      {installmentOptions.length > 0 && (
        <div style={{ marginTop: showShippingToggle ? 6 : 0, marginBottom: 6 }}>
          <p style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: 8 }}>Agregá cuotas y vendé más</p>
          <div className="ml-cuota-list">
            <button type="button"
              className={`ml-cuota-card${selectedInstallment === "none" ? " is-active" : ""}`}
              onClick={() => setSelectedInstallment("none")}>
              <span className="ml-cuota-card__radio" />
              <span className="ml-cuota-card__body">
                <span className="ml-cuota-card__label">No quiero agregar cuotas</span>
                <span className="ml-cuota-card__desc">Tus compradores igual tienen cuotas con el interés que cobran los bancos.</span>
              </span>
              <span className="ml-cuota-card__price">Sin costo</span>
            </button>
            {installmentOptions.map(opt => (
              <button key={opt.id} type="button"
                className={`ml-cuota-card${selectedInstallment === opt.id ? " is-active" : ""}`}
                onClick={() => setSelectedInstallment(opt.id)}>
                <span className="ml-cuota-card__radio" />
                <span className="ml-cuota-card__body">
                  {opt.badge && <span className="ml-cuota-card__badge">{opt.badge}</span>}
                  <span className="ml-cuota-card__label">
                    {opt.label}{opt.percentageFee != null && ` (${opt.percentageFee.toFixed(1).replace(".0", "")}%)`}
                  </span>
                  {opt.desc && <span className="ml-cuota-card__desc">{opt.desc}</span>}
                </span>
                <span className="ml-cuota-card__price">${Math.round(opt.extraCost).toLocaleString("es-AR")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {priceValid && hasCategory && (
        feesLoading ? (
          <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <Loader2 size={12} className="spin" /> Calculando comisión...
          </p>
        ) : fees ? (
          <div style={{ marginBottom: 16, padding: "6px 18px", border: "1px solid var(--border)", borderRadius: 14 }}>
            {[
              ["Precio de venta", `$${Math.round(Number(price)).toLocaleString("es-AR")}`],
              ["Cargo por vender", `-$${Math.round(fees.saleFeeAmount).toLocaleString("es-AR")}`],
              ...(selectedOption ? [["Costo por ofrecer cuotas", `-$${Math.round(installmentsCost).toLocaleString("es-AR")}`]] : []),
              ...(shippingFree ? [["Costo por envío", shippingCostKnown ? `-$${Math.round(shippingCost).toLocaleString("es-AR")}` : "No calculado"]] : []),
              ["Impuestos estimados", "$0"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: ".84rem", color: "var(--text-secondary)" }}>{label}</span>
                <strong style={{ fontSize: ".88rem" }}>{value}</strong>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: priceFloor != null ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: ".9rem", fontWeight: 700 }}>Recibís</span>
              <strong style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success,#059669)" }}>${Math.round(netFinal).toLocaleString("es-AR")}</strong>
            </div>
            {priceFloor != null && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: ".84rem", color: "var(--text-secondary)" }}>Costo del producto</span>
                  <strong style={{ fontSize: ".88rem" }}>-${Math.round(priceFloor).toLocaleString("es-AR")}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
                  <span style={{ fontSize: ".9rem", fontWeight: 700 }}>Tu ganancia</span>
                  <strong style={{
                    fontSize: "1.25rem", fontWeight: 800,
                    color: margenTier === "loss" ? "var(--danger,#ef4444)" : margenTier === "thin" ? "#d97706" : "var(--success,#059669)",
                  }}>
                    {ganancia < 0 ? "-" : ""}${Math.round(Math.abs(ganancia)).toLocaleString("es-AR")}
                  </strong>
                </div>
              </>
            )}
          </div>
        ) : (
          <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", marginBottom: 16 }}>No se pudo calcular la comisión</p>
        )
      )}

      {margenTier && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, padding: "14px 16px", borderRadius: 14,
          background: margenTier === "loss" ? "rgba(239,68,68,.1)" : margenTier === "thin" ? "rgba(217,119,6,.12)" : "rgba(5,150,105,.12)",
          border: `1px solid ${margenTier === "loss" ? "var(--danger,#ef4444)" : margenTier === "thin" ? "#d97706" : "var(--success,#059669)"}`,
        }}>
          <IconBadge
            icon={margenTier === "loss" ? Ban : margenTier === "thin" ? AlertTriangle : TrendingUp}
            color={margenTier === "loss" ? "var(--danger,#ef4444)" : margenTier === "thin" ? "#d97706" : "var(--success,#059669)"}
            bg={margenTier === "loss" ? "rgba(239,68,68,.16)" : margenTier === "thin" ? "rgba(217,119,6,.16)" : "rgba(5,150,105,.16)"}
            size={38} iconSize={18}
          />
          <div>
            <strong style={{ fontSize: ".88rem", display: "block", marginBottom: 3 }}>
              {margenTier === "loss" ? "Vas a perder dinero" : margenTier === "thin" ? "Margen ajustado" : "Precio competitivo"}
            </strong>
            <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              {margenTier === "loss"
                ? `Lo que recibís ($${Math.round(netFinal).toLocaleString("es-AR")}) es menor al costo del producto ($${Math.round(priceFloor).toLocaleString("es-AR")}) — perdés $${Math.round(Math.abs(ganancia)).toLocaleString("es-AR")} por unidad vendida.`
                : margenTier === "thin"
                  ? `Buen precio para empezar a vender o hacer ventas masivas, pero con poca ganancia por unidad: $${Math.round(ganancia).toLocaleString("es-AR")} (${gananciaPct.toFixed(1)}% del precio de venta).`
                  : `Tenés un margen de ganancia saludable: $${Math.round(ganancia).toLocaleString("es-AR")} (${gananciaPct.toFixed(1)}% del precio de venta) por unidad vendida.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
