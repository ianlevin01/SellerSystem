// src/pages/Discounts.jsx
import { useEffect, useState } from "react";
import client from "../api/client";
import { Plus, Trash2, Percent, Tag, TrendingDown } from "lucide-react";

const DEFAULT_CONFIG = {
  enabled: false,
  discount_type: "quantity",
  min_profit_pct: 10,
  tiers: [],
};

export default function Discounts() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    client.get("/seller/store/discounts")
      .then(res => setConfig({ ...DEFAULT_CONFIG, ...res.data, tiers: res.data.tiers || [] }))
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  function addTier() {
    setConfig(c => ({
      ...c,
      tiers: [...c.tiers, { threshold: "", discount_pct: "" }],
    }));
  }

  function removeTier(idx) {
    setConfig(c => ({ ...c, tiers: c.tiers.filter((_, i) => i !== idx) }));
  }

  function updateTier(idx, field, value) {
    setConfig(c => ({
      ...c,
      tiers: c.tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSaving(true); setSaved(false);
    const tiers = config.tiers
      .filter(t => t.threshold !== "" && t.discount_pct !== "")
      .map(t => ({ threshold: Number(t.threshold), discount_pct: Number(t.discount_pct) }));
    try {
      const res = await client.put("/seller/store/discounts", {
        enabled:        config.enabled,
        discount_type:  config.discount_type,
        min_profit_pct: Number(config.min_profit_pct),
        tiers,
      });
      setConfig({ ...res.data, tiers: res.data.tiers || [] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const isQty = config.discount_type === "quantity";
  const thresholdLabel = isQty ? "Cantidad mínima (unidades)" : "Monto mínimo del carrito ($)";
  const thresholdPlaceholder = isQty ? "ej: 3" : "ej: 50000";

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos progresivos</h1>
        <p>Configurá descuentos automáticos por cantidad o por monto para incentivar compras mayores.</p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Activar / desactivar */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>Estado</h2>
                <p style={{ margin: 0, fontSize: ".875rem" }}>
                  {config.enabled
                    ? "Los descuentos progresivos están activos en tu tienda."
                    : "Activá para que los clientes vean y aprovechen los descuentos."}
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>
          </div>

          {/* Tipo de descuento */}
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Tipo de descuento</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                {
                  value: "quantity",
                  icon: Tag,
                  title: "Por cantidad",
                  desc: "El descuento se aplica por producto según la cantidad que compra el cliente.",
                },
                {
                  value: "price",
                  icon: TrendingDown,
                  title: "Por monto del carrito",
                  desc: "El descuento se aplica sobre todo el carrito cuando el total supera cierto monto.",
                },
              ].map(({ value, icon: Icon, title, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setConfig(c => ({ ...c, discount_type: value }))}
                  style={{
                    textAlign: "left",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${config.discount_type === value ? "var(--brand)" : "var(--border)"}`,
                    background: config.discount_type === value ? "var(--brand-light)" : "var(--surface)",
                    cursor: "pointer",
                    transition: "all var(--dur-fast) var(--ease)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Icon size={16} color={config.discount_type === value ? "var(--brand)" : "var(--text-secondary)"} />
                    <span style={{ fontWeight: 600, fontSize: ".9375rem", color: config.discount_type === value ? "var(--brand-text)" : "var(--text-primary)" }}>
                      {title}
                    </span>
                  </div>
                  <p style={{ fontSize: ".8125rem", margin: 0, color: config.discount_type === value ? "var(--brand-text)" : "var(--text-secondary)", lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Margen mínimo */}
          <div className="card">
            <h2 style={{ marginBottom: 6 }}>Ganancia mínima garantizada</h2>
            <p style={{ fontSize: ".875rem", marginBottom: 18 }}>
              El sistema nunca aplicará un descuento que baje tu ganancia por debajo de este porcentaje.
              Esto protege tu rentabilidad aun cuando haya descuentos agresivos configurados.
            </p>
            <div className="form-group" style={{ maxWidth: 320, marginBottom: 0 }}>
              <label className="form-label">
                Margen mínimo
                <span style={{ float: "right", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {config.min_profit_pct}%
                </span>
              </label>
              <input
                type="range" min={0} max={50} step={0.5}
                value={config.min_profit_pct}
                onChange={e => setConfig(c => ({ ...c, min_profit_pct: e.target.value }))}
              />
              <p style={{ fontSize: ".78rem", color: "var(--text-tertiary)", marginTop: 6, margin: 0 }}>
                Si un producto cuesta $10.000 y lo vendés a $15.000, el precio mínimo
                con {config.min_profit_pct}% de margen sería ${fmt(10000 * (1 + Number(config.min_profit_pct) / 100))}.
              </p>
            </div>
          </div>

          {/* Niveles */}
          <div className="card">
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>Niveles de descuento</h2>
                <p style={{ fontSize: ".8125rem", margin: 0 }}>
                  {isQty
                    ? "Configurá cuánto descuento aplica según la cantidad de unidades."
                    : "Configurá cuánto descuento aplica según el monto total del carrito."}
                </p>
              </div>
              <button type="button" className="btn btn--secondary btn--sm" onClick={addTier}>
                <Plus size={13} /> Agregar nivel
              </button>
            </div>

            {config.tiers.length === 0 ? (
              <div style={{
                border: "2px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "32px 24px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: ".9rem",
              }}>
                No hay niveles. Hacé clic en "Agregar nivel" para empezar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 40px",
                  gap: 12,
                  padding: "0 4px",
                  fontSize: ".78rem",
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}>
                  <span>{thresholdLabel}</span>
                  <span>% de descuento</span>
                  <span />
                </div>

                {config.tiers.map((tier, idx) => (
                  <div key={idx} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 40px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min={0}
                        step={isQty ? 1 : 100}
                        className="form-input form-input--sm"
                        placeholder={thresholdPlaceholder}
                        value={tier.threshold}
                        onChange={e => updateTier(idx, "threshold", e.target.value)}
                      />
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min={0.1}
                        max={100}
                        step={0.1}
                        className="form-input form-input--sm"
                        placeholder="ej: 15"
                        value={tier.discount_pct}
                        onChange={e => updateTier(idx, "discount_pct", e.target.value)}
                        style={{ paddingRight: 30 }}
                      />
                      <Percent size={12} style={{
                        position: "absolute", right: 10, top: "50%",
                        transform: "translateY(-50%)", color: "var(--text-tertiary)",
                        pointerEvents: "none",
                      }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-tertiary)", padding: 4, borderRadius: "var(--radius-sm)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "color var(--dur-fast) var(--ease)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview example */}
            {config.tiers.length > 0 && (
              <div style={{
                marginTop: 20,
                padding: "14px 16px",
                background: "var(--brand-light)",
                border: "1px solid var(--success-border)",
                borderRadius: "var(--radius-md)",
                fontSize: ".8125rem",
                color: "var(--brand-text)",
              }}>
                <strong>Vista previa para el cliente:</strong>{" "}
                {isQty ? (
                  config.tiers
                    .filter(t => t.threshold && t.discount_pct)
                    .sort((a, b) => Number(a.threshold) - Number(b.threshold))
                    .map((t, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        <strong>{t.discount_pct}% off</strong> comprando {t.threshold}+ unidades
                      </span>
                    ))
                ) : (
                  config.tiers
                    .filter(t => t.threshold && t.discount_pct)
                    .sort((a, b) => Number(a.threshold) - Number(b.threshold))
                    .map((t, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        <strong>{t.discount_pct}% off</strong> en pedidos desde ${fmt(t.threshold)}
                      </span>
                    ))
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
          {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
          {saved && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
          <button type="submit" disabled={saving} className="btn btn--primary btn--lg">
            {saving ? "Guardando..." : "Guardar descuentos"}
          </button>
        </div>
      </form>
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
