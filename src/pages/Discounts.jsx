import { useEffect, useState } from "react";
import client from "../api/client";
import { Plus, Trash2, Percent, Tag, TrendingDown, AlertTriangle, CheckCircle2, ShoppingCart, DollarSign } from "lucide-react";

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function maxDiscount(pctMarkup) {
  if (!pctMarkup || pctMarkup <= 0) return 0;
  return (pctMarkup * 100) / (100 + pctMarkup);
}

function TierCard({ tier, idx, isQty, maxPct, onUpdate, onRemove }) {
  const over = maxPct > 0 && Number(tier.discount_pct) > maxPct;
  return (
    <div className={`disc-tier${over ? " disc-tier--over" : ""}`}>
      <div className="disc-tier__body">
        <div className="disc-tier__field">
          <label className="disc-tier__label">
            {isQty ? <><ShoppingCart size={12} /> Desde (unidades)</> : <><DollarSign size={12} /> Desde ($ del carrito)</>}
          </label>
          <input
            type="number"
            min={0}
            step={isQty ? 1 : 100}
            className="form-input form-input--sm"
            placeholder={isQty ? "ej: 3" : "ej: 50000"}
            value={tier.threshold}
            onChange={e => onUpdate(idx, "threshold", e.target.value)}
          />
        </div>
        <div className="disc-tier__arrow">→</div>
        <div className="disc-tier__field disc-tier__field--pct">
          <label className="disc-tier__label"><Percent size={12} /> Descuento</label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              className="form-input form-input--sm"
              placeholder="ej: 10"
              value={tier.discount_pct}
              onChange={e => onUpdate(idx, "discount_pct", e.target.value)}
              style={{ paddingRight: 28 }}
            />
            <Percent size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
          </div>
        </div>
        <button
          type="button"
          className="disc-tier__remove"
          onClick={() => onRemove(idx)}
          title="Eliminar nivel"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {over && (
        <div className="disc-tier__warn">
          <AlertTriangle size={12} />
          El descuento supera el máximo permitido ({maxPct.toFixed(1)}%)
        </div>
      )}
    </div>
  );
}

function DiscountBlock({ color, icon: Icon, title, description, enabled, onToggle, tiers, isQty, pctMarkup, onChange }) {
  const maxPct = maxDiscount(pctMarkup);

  function addTier() {
    onChange([...tiers, { threshold: "", discount_pct: "" }]);
  }
  function removeTier(idx) {
    onChange(tiers.filter((_, i) => i !== idx));
  }
  function updateTier(idx, field, value) {
    onChange(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  const preview = tiers
    .filter(t => t.threshold && t.discount_pct)
    .sort((a, b) => Number(a.threshold) - Number(b.threshold));

  return (
    <div className={`disc-block disc-block--${color}`}>
      <div className="disc-block__header">
        <div className="disc-block__icon-wrap">
          <Icon size={20} />
        </div>
        <div className="disc-block__header-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <label className="toggle-switch disc-block__toggle" title={enabled ? "Desactivar" : "Activar"}>
          <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} />
          <span className="toggle-track"><span className="toggle-thumb" /></span>
        </label>
      </div>

      <div className={`disc-block__body${!enabled ? " disc-block__body--disabled" : ""}`}>
        {tiers.length === 0 ? (
          <div className="disc-empty">
            <p>Todavía no configuraste niveles de descuento.</p>
          </div>
        ) : (
          <div className="disc-tiers-list">
            {tiers.map((tier, idx) => (
              <TierCard
                key={idx}
                tier={tier}
                idx={idx}
                isQty={isQty}
                maxPct={maxPct}
                onUpdate={updateTier}
                onRemove={removeTier}
              />
            ))}
          </div>
        )}

        <button type="button" className="disc-add-btn" onClick={addTier} disabled={!enabled}>
          <Plus size={14} />
          Agregar nivel
        </button>

        {preview.length > 0 && (
          <div className="disc-preview">
            <span className="disc-preview__label">Vista previa del cliente:</span>
            <div className="disc-preview__pills">
              {preview.map((t, i) => (
                <span key={i} className={`disc-preview__pill disc-preview__pill--${color}`}>
                  {isQty
                    ? `${t.threshold}+ uds → ${t.discount_pct}% OFF`
                    : `+$${fmt(t.threshold)} → ${t.discount_pct}% OFF`}
                </span>
              ))}
            </div>
          </div>
        )}

        {maxPct > 0 && (
          <p className="disc-max-note">
            <AlertTriangle size={12} />
            Descuento máximo permitido según tu recargo ({pctMarkup}%): <strong>{maxPct.toFixed(1)}%</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default function Discounts() {
  const [config,    setConfig]    = useState({ enabled_quantity: false, enabled_price: false, quantity_tiers: [], price_tiers: [] });
  const [pctMarkup, setPctMarkup] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    Promise.all([
      client.get("/seller/store/discounts"),
      client.get("/seller/store/config"),
    ])
      .then(([dRes, cRes]) => {
        setConfig({ enabled_quantity: false, enabled_price: false, quantity_tiers: [], price_tiers: [], ...dRes.data });
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
      setConfig({ enabled_quantity: false, enabled_price: false, quantity_tiers: [], price_tiers: [], ...res.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos</h1>
        <p>Configurá promociones automáticas para que tus clientes compren más.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="disc-grid">
          <DiscountBlock
            color="amber"
            icon={Tag}
            title="Por cantidad"
            description="Descuento automático según cuántas unidades compra el cliente."
            enabled={config.enabled_quantity}
            onToggle={v => setConfig(c => ({ ...c, enabled_quantity: v }))}
            tiers={config.quantity_tiers}
            isQty={true}
            pctMarkup={pctMarkup}
            onChange={tiers => setConfig(c => ({ ...c, quantity_tiers: tiers }))}
          />
          <DiscountBlock
            color="blue"
            icon={TrendingDown}
            title="Por monto del carrito"
            description="Descuento automático cuando el total del carrito supera cierto monto."
            enabled={config.enabled_price}
            onToggle={v => setConfig(c => ({ ...c, enabled_price: v }))}
            tiers={config.price_tiers}
            isQty={false}
            pctMarkup={pctMarkup}
            onChange={tiers => setConfig(c => ({ ...c, price_tiers: tiers }))}
          />
        </div>

        <div className="disc-footer">
          {error  && <span className="disc-footer__msg disc-footer__msg--error"><AlertTriangle size={14} />{error}</span>}
          {saved  && <span className="disc-footer__msg disc-footer__msg--ok"><CheckCircle2 size={14} />Descuentos guardados</span>}
          <button type="submit" disabled={saving || hasInvalidTiers()} className="btn btn--primary btn--lg">
            {saving ? "Guardando..." : "Guardar descuentos"}
          </button>
        </div>
      </form>
    </div>
  );
}
