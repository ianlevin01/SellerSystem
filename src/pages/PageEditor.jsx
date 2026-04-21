import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import { ChevronLeft, Plus, Trash2, Percent, Tag, TrendingDown, ChevronDown, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import PageProducts from "./PageProducts";

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
function maxDiscount(pctMarkup) {
  if (!pctMarkup || pctMarkup <= 0) return 0;
  return (pctMarkup * 100) / (100 + pctMarkup);
}
function storeUrl(slug) {
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}?shop=${slug}`;
  }
  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}`;
}

// ── Config tab ────────────────────────────────────────────────

const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Raleway", "Nunito", "Playfair Display", "Merriweather", "Source Sans 3",
  "Ubuntu", "PT Sans", "Josefin Sans", "Quicksand",
];

function ConfigTab({ pageId }) {
  const [form, setForm] = useState({
    page_name: "", store_name: "", store_description: "", banner_color: "#5b52f0",
    pct_markup: 0, tagline: "", whatsapp: "", instagram: "", facebook: "",
    logo_url: "", font_family: "", color_secondary: "", color_bg: "", color_text: "",
    featured_categories: [],
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get(`/seller/store/pages/${pageId}`),
      client.get(`/seller/store/categories`),
    ]).then(([pageRes, catRes]) => {
      const d = pageRes.data;
      setForm({
        page_name:           d.page_name           || "",
        store_name:          d.store_name          || "",
        store_description:   d.store_description   || "",
        banner_color:        d.banner_color         || "#5b52f0",
        pct_markup:          d.pct_markup           || 0,
        tagline:             d.tagline              || "",
        whatsapp:            d.whatsapp             || "",
        instagram:           d.instagram            || "",
        facebook:            d.facebook             || "",
        logo_url:            d.logo_url             || "",
        font_family:         d.font_family          || "",
        color_secondary:     d.color_secondary      || "",
        color_bg:            d.color_bg             || "",
        color_text:          d.color_text           || "",
        featured_categories: d.featured_categories  || [],
      });
      setCategories(catRes.data || []);
    }).finally(() => setLoading(false));
  }, [pageId]);

  function toggleCategory(id) {
    setForm(p => {
      const has = p.featured_categories.includes(id);
      return { ...p, featured_categories: has ? p.featured_categories.filter(c => c !== id) : [...p.featured_categories, id] };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSaving(true); setSaved(false);
    try {
      await client.put(`/seller/store/pages/${pageId}`, { ...form, pct_markup: Number(form.pct_markup) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const ejemploPrecio = 10000;
  const precioFinal   = ejemploPrecio * (1 + Number(form.pct_markup) / 100);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <form onSubmit={handleSave}>
      <div className="config-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <div className="card">
            <h2 style={{ marginBottom: 18 }}>Identificación</h2>
            <div className="form-group">
              <label className="form-label">Nombre interno (solo vos lo ves)</label>
              <input className="form-input" value={form.page_name}
                onChange={e => setForm(p => ({ ...p, page_name: e.target.value }))}
                placeholder="Ej: Tienda Verano" />
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 18 }}>Información pública</h2>
            <div className="form-group">
              <label className="form-label">Nombre de la tienda</label>
              <input className="form-input" value={form.store_name}
                onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))}
                placeholder="Mi tienda" />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={form.store_description}
                onChange={e => setForm(p => ({ ...p, store_description: e.target.value }))}
                placeholder="Breve descripción que aparece en tu tienda..." />
            </div>
            <div className="form-group">
              <label className="form-label">Tagline <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(subtítulo corto)</span></label>
              <input className="form-input" value={form.tagline}
                onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
                placeholder="La mejor selección al mejor precio" maxLength={160} />
            </div>
            <div className="form-group">
              <label className="form-label">Color principal</label>
              <div className="color-picker-row">
                <input type="color" value={form.banner_color}
                  onChange={e => setForm(p => ({ ...p, banner_color: e.target.value }))} />
                <span className="color-picker-hex">{form.banner_color}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color secundario <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(acento / botones secundarios)</span></label>
              <div className="color-picker-row">
                <input type="color" value={form.color_secondary || "#000000"}
                  onChange={e => setForm(p => ({ ...p, color_secondary: e.target.value }))} />
                <span className="color-picker-hex">{form.color_secondary || "—"}</span>
                {form.color_secondary && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm(p => ({ ...p, color_secondary: "" }))}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color de fondo</label>
              <div className="color-picker-row">
                <input type="color" value={form.color_bg || "#ffffff"}
                  onChange={e => setForm(p => ({ ...p, color_bg: e.target.value }))} />
                <span className="color-picker-hex">{form.color_bg || "—"}</span>
                {form.color_bg && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm(p => ({ ...p, color_bg: "" }))}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color de texto</label>
              <div className="color-picker-row">
                <input type="color" value={form.color_text || "#111111"}
                  onChange={e => setForm(p => ({ ...p, color_text: e.target.value }))} />
                <span className="color-picker-hex">{form.color_text || "—"}</span>
                {form.color_text && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm(p => ({ ...p, color_text: "" }))}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 18 }}>Apariencia</h2>
            <div className="form-group">
              <label className="form-label">Logo (URL de imagen)</label>
              <input className="form-input" value={form.logo_url}
                onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
                placeholder="https://..." />
              {form.logo_url && (
                <div style={{ marginTop: 8 }}>
                  <img src={form.logo_url} alt="logo preview" style={{ height: 48, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)", background: "#fff", padding: 4 }} />
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Tipografía</label>
              <select className="form-input" value={form.font_family} onChange={e => setForm(p => ({ ...p, font_family: e.target.value }))}>
                <option value="">Predeterminada</option>
                {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
            </div>
            {categories.length > 0 && (
              <div className="form-group">
                <label className="form-label">Categorías destacadas <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(solo mostrar estos productos)</span></label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {categories.map(cat => {
                    const active = form.featured_categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 20,
                          border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`,
                          background: active ? "var(--brand)" : "transparent",
                          color: active ? "#fff" : "var(--text-secondary)",
                          fontSize: ".8125rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all .15s",
                        }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                {form.featured_categories.length > 0 && (
                  <p style={{ fontSize: ".78rem", color: "var(--text-tertiary)", marginTop: 6 }}>
                    Solo se mostrarán productos de las categorías seleccionadas. Deseleccioná todas para mostrar todos los productos.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 18 }}>Contacto y redes sociales</h2>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.whatsapp}
                onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                placeholder="5491112345678" maxLength={30} />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(usuario sin @)</span></label>
              <input className="form-input" value={form.instagram}
                onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                placeholder="mitienda" maxLength={60} />
            </div>
            <div className="form-group">
              <label className="form-label">Facebook</label>
              <input className="form-input" value={form.facebook}
                onChange={e => setForm(p => ({ ...p, facebook: e.target.value }))}
                placeholder="https://facebook.com/mitienda" maxLength={120} />
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 6 }}>Configuración de precios</h2>
            <p style={{ fontSize: ".875rem", marginBottom: 18 }}>
              El precio base (precio_1) ya incluye los márgenes del sistema. Tu porcentaje se suma por encima.
            </p>
            <div className="form-group">
              <label className="form-label">
                % de aumento sobre precio_1
                <span style={{ float: "right", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {form.pct_markup}%
                </span>
              </label>
              <input type="range" min={0} max={200} step={0.5}
                value={form.pct_markup}
                onChange={e => setForm(p => ({ ...p, pct_markup: e.target.value }))}
                style={{ marginBottom: 8 }}
              />
            </div>
            <div className="card" style={{ background: "var(--bg)", boxShadow: "none", padding: "14px 16px" }}>
              <div style={{ fontSize: ".825rem", color: "var(--text-secondary)", marginBottom: 8 }}>Ejemplo con precio base = $10.000</div>
              <div className="calc-breakdown">
                <div className="calc-breakdown__row">
                  <span className="calc-breakdown__label">Precio base</span>
                  <span className="calc-breakdown__value">${fmt(ejemploPrecio)}</span>
                </div>
                <div className="calc-breakdown__row">
                  <span className="calc-breakdown__label">Tu precio de venta</span>
                  <span className="calc-breakdown__value" style={{ color: "var(--brand)" }}>${fmt(precioFinal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="preview-card">
            <div className="preview-card__banner" style={{ background: form.banner_color }}>
              <h2 style={{ color: "#fff", marginBottom: 4, fontSize: "1.125rem" }}>{form.store_name || "Mi tienda"}</h2>
              <p style={{ color: "rgba(255,255,255,.8)", fontSize: ".875rem", margin: 0 }}>
                {form.store_description || "Descripción de tu tienda"}
              </p>
            </div>
            <div className="preview-card__body">
              <div style={{ fontSize: ".75rem", color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>
                Vista previa
              </div>
              <div className="preview-product">
                <div className="preview-product__img">📦</div>
                <div className="preview-product__info">
                  <div className="preview-product__name">Nombre del producto</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: form.banner_color, letterSpacing: "-.02em" }}>
                    ${fmt(precioFinal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
        {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
        {saved && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
        <button type="submit" disabled={saving} className="btn btn--primary btn--lg">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ── Discounts tab ─────────────────────────────────────────────

const EMPTY_DISCOUNTS = { enabled_quantity: false, enabled_price: false, quantity_tiers: [], price_tiers: [] };

function TiersSection({ type, tiers, onChange, pctMarkup }) {
  const isQty    = type === "quantity";
  const thLabel  = isQty ? "Cantidad mínima (unidades)" : "Monto mínimo del carrito ($)";
  const thHolder = isQty ? "ej: 3" : "ej: 50000";
  const maxPct   = maxDiscount(pctMarkup);

  function add()              { onChange([...tiers, { threshold: "", discount_pct: "" }]); }
  function remove(idx)        { onChange(tiers.filter((_, i) => i !== idx)); }
  function update(idx, f, v)  { onChange(tiers.map((t, i) => i === idx ? { ...t, [f]: v } : t)); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: ".8125rem", margin: 0, color: "var(--text-secondary)", maxWidth: 480 }}>
          {isQty
            ? "Aplicá un descuento según la cantidad de unidades."
            : "Aplicá un descuento sobre el total del carrito cuando supere cierto monto."}
          {pctMarkup > 0 && <> Descuento máximo: <strong>{maxPct.toFixed(1)}%</strong>.</>}
        </p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={add} style={{ flexShrink: 0, marginLeft: 12 }}>
          <Plus size={13} /> Agregar nivel
        </button>
      </div>

      {tiers.length === 0 ? (
        <div style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", padding: "28px 24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: ".9rem" }}>
          No hay niveles. Hacé clic en "Agregar nivel" para empezar.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 12, padding: "0 4px", fontSize: ".78rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
            <span>{thLabel}</span><span>% de descuento</span><span />
          </div>
          {tiers.map((tier, idx) => {
            const over = maxPct > 0 && Number(tier.discount_pct) > maxPct;
            return (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 12, alignItems: "center", padding: "10px 14px", background: over ? "var(--danger-light,#fef2f2)" : "var(--bg)", borderRadius: "var(--radius-md)", border: `1px solid ${over ? "var(--danger,#ef4444)" : "var(--border)"}` }}>
                <input type="number" min={0} step={isQty ? 1 : 100}
                  className="form-input form-input--sm" placeholder={thHolder}
                  value={tier.threshold} onChange={e => update(idx, "threshold", e.target.value)} />
                <div style={{ position: "relative" }}>
                  <input type="number" min={0.1} max={100} step={0.1}
                    className="form-input form-input--sm" placeholder="ej: 15"
                    value={tier.discount_pct} onChange={e => update(idx, "discount_pct", e.target.value)}
                    style={{ paddingRight: 28 }} />
                  <Percent size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
                </div>
                <button type="button" onClick={() => remove(idx)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4, borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
                >
                  <Trash2 size={14} />
                </button>
                {over && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 5, fontSize: ".78rem", color: "var(--danger,#ef4444)" }}>
                    <AlertTriangle size={12} /> Este descuento bajaría el precio por debajo del costo ({maxPct.toFixed(1)}% máximo).
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tiers.length > 0 && (
        <div style={{ padding: "12px 16px", background: "var(--brand-light)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-md)", fontSize: ".8125rem", color: "var(--brand-text)" }}>
          <strong>Vista previa:</strong>{" "}
          {tiers.filter(t => t.threshold && t.discount_pct).sort((a,b) => Number(a.threshold)-Number(b.threshold)).map((t, i) => (
            <span key={i}>{i > 0 && " · "}<strong>{t.discount_pct}% off</strong> {isQty ? `comprando ${t.threshold}+ unidades` : `en pedidos desde $${fmt(t.threshold)}`}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscountAccordion({ icon: Icon, title, enabled, onToggle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer", userSelect: "none" }} onClick={() => setOpen(o => !o)}>
        <Icon size={16} color="var(--text-secondary)" />
        <span style={{ fontWeight: 600, fontSize: ".9375rem", flex: 1, color: "var(--text-primary)" }}>{title}</span>
        <label className="toggle-switch" onClick={e => e.stopPropagation()} style={{ marginRight: 8 }}>
          <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} />
          <span className="toggle-track"><span className="toggle-thumb" /></span>
        </label>
        <ChevronDown size={16} style={{ color: "var(--text-secondary)", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
      </div>
      {open && <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}><div style={{ height: 16 }} />{children}</div>}
    </div>
  );
}

function DiscountsTab({ pageId }) {
  const [config,    setConfig]    = useState(EMPTY_DISCOUNTS);
  const [pctMarkup, setPctMarkup] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get(`/seller/store/pages/${pageId}/discounts`),
      client.get(`/seller/store/pages/${pageId}`),
    ]).then(([dRes, pRes]) => {
      setConfig({ ...EMPTY_DISCOUNTS, ...dRes.data, quantity_tiers: dRes.data.quantity_tiers || [], price_tiers: dRes.data.price_tiers || [] });
      setPctMarkup(Number(pRes.data.pct_markup) || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [pageId]);

  function hasInvalid() {
    const max = maxDiscount(pctMarkup);
    if (max <= 0) return false;
    return [...config.quantity_tiers, ...config.price_tiers].some(t => t.discount_pct !== "" && Number(t.discount_pct) > max);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (hasInvalid()) { setError("Hay niveles con descuentos que superan el máximo permitido."); return; }
    setError(""); setSaving(true); setSaved(false);
    const cleanTiers = ts => ts.filter(t => t.threshold !== "" && t.discount_pct !== "").map(t => ({ threshold: Number(t.threshold), discount_pct: Number(t.discount_pct) }));
    try {
      const res = await client.put(`/seller/store/pages/${pageId}/discounts`, {
        enabled_quantity: config.enabled_quantity,
        enabled_price:    config.enabled_price,
        quantity_tiers:   cleanTiers(config.quantity_tiers),
        price_tiers:      cleanTiers(config.price_tiers),
      });
      setConfig({ ...EMPTY_DISCOUNTS, ...res.data, quantity_tiers: res.data.quantity_tiers || [], price_tiers: res.data.price_tiers || [] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <form onSubmit={handleSave}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DiscountAccordion icon={Tag} title="Descuentos por cantidad" enabled={config.enabled_quantity} onToggle={v => setConfig(c => ({ ...c, enabled_quantity: v }))}>
          <TiersSection type="quantity" tiers={config.quantity_tiers} onChange={ts => setConfig(c => ({ ...c, quantity_tiers: ts }))} pctMarkup={pctMarkup} />
        </DiscountAccordion>
        <DiscountAccordion icon={TrendingDown} title="Descuentos por monto del carrito" enabled={config.enabled_price} onToggle={v => setConfig(c => ({ ...c, enabled_price: v }))}>
          <TiersSection type="price" tiers={config.price_tiers} onChange={ts => setConfig(c => ({ ...c, price_tiers: ts }))} pctMarkup={pctMarkup} />
        </DiscountAccordion>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
        {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
        {saved && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
        <button type="submit" disabled={saving || hasInvalid()} className="btn btn--primary btn--lg">
          {saving ? "Guardando..." : "Guardar descuentos"}
        </button>
      </div>
    </form>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function PageEditor({ tab = "config" }) {
  const { pageId } = useParams();
  const navigate   = useNavigate();
  const [pageName,  setPageName]  = useState("");
  const [pageSlug,  setPageSlug]  = useState("");
  const [pctMarkup, setPctMarkup] = useState(0);

  useEffect(() => {
    client.get(`/seller/store/pages/${pageId}`).then(res => {
      setPageName(res.data.page_name || res.data.store_name || "Tienda");
      setPageSlug(res.data.slug || "");
      setPctMarkup(Number(res.data.pct_markup) || 0);
    }).catch(() => {});
  }, [pageId]);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: ".875rem", color: "var(--text-muted)" }}>
        <Link to="/pages" style={{ color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={14} /> Mis tiendas
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{pageName}</span>
        {pageSlug && (
          <a href={storeUrl(pageSlug)} target="_blank" rel="noreferrer"
            style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="page-tabs">
        <button className={`page-tab ${tab === "config"    ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}`)}>Configuración</button>
        <button className={`page-tab ${tab === "products"  ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/products`)}>Productos</button>
        <button className={`page-tab ${tab === "discounts" ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/discounts`)}>Descuentos</button>
      </div>

      <div style={{ marginTop: 24 }}>
        {tab === "config"    && <ConfigTab    pageId={pageId} />}
        {tab === "products"  && <PageProducts pageId={pageId} pctMarkup={pctMarkup} />}
        {tab === "discounts" && <DiscountsTab pageId={pageId} />}
      </div>
    </div>
  );
}
