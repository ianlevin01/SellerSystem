import { useEffect, useState } from "react";
import client from "../api/client";
import { Plus, Trash2, Percent, Tag, TrendingDown, ChevronDown, AlertTriangle } from "lucide-react";

const EMPTY = { enabled_quantity: false, enabled_price: false, quantity_tiers: [], price_tiers: [] };

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function maxDiscount(pctMarkup) {
  if (!pctMarkup || pctMarkup <= 0) return 0;
  return (pctMarkup * 100) / (100 + pctMarkup);
}

function TiersSection({ type, tiers, onChange, pctMarkup }) {
  const isQty    = type === "quantity";
  const thLabel  = isQty ? "Cantidad mínima (unidades)" : "Monto mínimo del carrito ($)";
  const thHolder = isQty ? "ej: 3" : "ej: 50000";
  const maxPct   = maxDiscount(pctMarkup);

  function add() {
    onChange([...tiers, { threshold: "", discount_pct: "" }]);
  }
  function remove(idx) {
    onChange(tiers.filter((_, i) => i !== idx));
  }
  function update(idx, field, value) {
    onChange(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: ".8125rem", margin: 0, color: "var(--text-secondary)" }}>
          {isQty
            ? "Aplicá un descuento según la cantidad de unidades de cada producto."
            : "Aplicá un descuento sobre el total del carrito cuando supere cierto monto."}
          {pctMarkup > 0 && (
            <> El descuento máximo permitido es <strong>{maxPct.toFixed(1)}%</strong> (tu recargo es {pctMarkup}%).</>
          )}
        </p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={add} style={{ flexShrink: 0, marginLeft: 12 }}>
          <Plus size={13} /> Agregar nivel
        </button>
      </div>

      {tiers.length === 0 ? (
        <div style={{
          border: "2px dashed var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "28px 24px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: ".9rem",
        }}>
          No hay niveles. Hacé clic en "Agregar nivel" para empezar.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 40px",
            gap: 12, padding: "0 4px",
            fontSize: ".78rem", fontWeight: 600, color: "var(--text-tertiary)",
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            <span>{thLabel}</span>
            <span>% de descuento</span>
            <span />
          </div>
          {tiers.map((tier, idx) => {
            const over = maxPct > 0 && Number(tier.discount_pct) > maxPct;
            return (
              <div key={idx} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 40px",
                gap: 12, alignItems: "center",
                padding: "10px 14px",
                background: over ? "var(--danger-light, #fef2f2)" : "var(--bg)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${over ? "var(--danger, #ef4444)" : "var(--border)"}`,
              }}>
                <input
                  type="number" min={0} step={isQty ? 1 : 100}
                  className="form-input form-input--sm"
                  placeholder={thHolder}
                  value={tier.threshold}
                  onChange={e => update(idx, "threshold", e.target.value)}
                />
                <div style={{ position: "relative" }}>
                  <input
                    type="number" min={0.1} max={100} step={0.1}
                    className="form-input form-input--sm"
                    placeholder="ej: 15"
                    value={tier.discount_pct}
                    onChange={e => update(idx, "discount_pct", e.target.value)}
                    style={{ paddingRight: 28 }}
                  />
                  <Percent size={12} style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none",
                  }} />
                </div>
                <button
                  type="button" onClick={() => remove(idx)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-tertiary)", padding: 4, borderRadius: "var(--radius-sm)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
                >
                  <Trash2 size={14} />
                </button>
                {over && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 5, fontSize: ".78rem", color: "var(--danger, #ef4444)" }}>
                    <AlertTriangle size={12} />
                    Este descuento bajaría el precio por debajo del costo ({maxPct.toFixed(1)}% máximo).
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tiers.length > 0 && (
        <div style={{
          padding: "12px 16px",
          background: "var(--brand-light)",
          border: "1px solid var(--success-border)",
          borderRadius: "var(--radius-md)",
          fontSize: ".8125rem",
          color: "var(--brand-text)",
        }}>
          <strong>Vista previa:</strong>{" "}
          {tiers
            .filter(t => t.threshold && t.discount_pct)
            .sort((a, b) => Number(a.threshold) - Number(b.threshold))
            .map((t, i) => (
              <span key={i}>
                {i > 0 && " · "}
                <strong>{t.discount_pct}% off</strong>{" "}
                {isQty ? `comprando ${t.threshold}+ unidades` : `en pedidos desde $${fmt(t.threshold)}`}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function Accordion({ icon: Icon, title, enabled, onToggleEnabled, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <Icon size={16} color="var(--text-secondary)" />
        <span style={{ fontWeight: 600, fontSize: ".9375rem", flex: 1, color: "var(--text-primary)" }}>{title}</span>
        <label
          className="toggle-switch"
          onClick={e => e.stopPropagation()}
          style={{ marginRight: 8 }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => onToggleEnabled(e.target.checked)}
          />
          <span className="toggle-track"><span className="toggle-thumb" /></span>
        </label>
        <ChevronDown
          size={16}
          style={{ color: "var(--text-secondary)", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </div>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ height: 16 }} />
          {children}
        </div>
      )}
    </div>
  );
}

export default function Discounts() {
  const [config,   setConfig]   = useState(EMPTY);
  const [pctMarkup, setPctMarkup] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    Promise.all([
      client.get("/seller/store/discounts"),
      client.get("/seller/store/config"),
    ])
      .then(([dRes, cRes]) => {
        setConfig({ ...EMPTY, ...dRes.data, quantity_tiers: dRes.data.quantity_tiers || [], price_tiers: dRes.data.price_tiers || [] });
        setPctMarkup(Number(cRes.data.pct_markup) || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function hasInvalidTiers() {
    const max = maxDiscount(pctMarkup);
    if (max <= 0) return false;
    return [...config.quantity_tiers, ...config.price_tiers]
      .some(t => t.discount_pct !== "" && Number(t.discount_pct) > max);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (hasInvalidTiers()) {
      setError("Hay niveles con descuentos que superan el máximo permitido.");
      return;
    }
    setError(""); setSaving(true); setSaved(false);

    const cleanTiers = tiers => tiers
      .filter(t => t.threshold !== "" && t.discount_pct !== "")
      .map(t => ({ threshold: Number(t.threshold), discount_pct: Number(t.discount_pct) }));

    try {
      const res = await client.put("/seller/store/discounts", {
        enabled_quantity: config.enabled_quantity,
        enabled_price:    config.enabled_price,
        quantity_tiers:   cleanTiers(config.quantity_tiers),
        price_tiers:      cleanTiers(config.price_tiers),
      });
      setConfig({ ...EMPTY, ...res.data, quantity_tiers: res.data.quantity_tiers || [], price_tiers: res.data.price_tiers || [] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos progresivos</h1>
        <p>Configurá descuentos automáticos por cantidad o por monto para incentivar compras mayores.</p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Accordion
            icon={Tag}
            title="Descuentos por cantidad"
            enabled={config.enabled_quantity}
            onToggleEnabled={v => setConfig(c => ({ ...c, enabled_quantity: v }))}
          >
            <TiersSection
              type="quantity"
              tiers={config.quantity_tiers}
              onChange={tiers => setConfig(c => ({ ...c, quantity_tiers: tiers }))}
              pctMarkup={pctMarkup}
            />
          </Accordion>

          <Accordion
            icon={TrendingDown}
            title="Descuentos por monto del carrito"
            enabled={config.enabled_price}
            onToggleEnabled={v => setConfig(c => ({ ...c, enabled_price: v }))}
          >
            <TiersSection
              type="price"
              tiers={config.price_tiers}
              onChange={tiers => setConfig(c => ({ ...c, price_tiers: tiers }))}
              pctMarkup={pctMarkup}
            />
          </Accordion>

        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
          {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
          {saved && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
          <button type="submit" disabled={saving || hasInvalidTiers()} className="btn btn--primary btn--lg">
            {saving ? "Guardando..." : "Guardar descuentos"}
          </button>
        </div>
      </form>
    </div>
  );
}
