import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import {
  AlertTriangle, Building2, ChevronDown, ChevronLeft,
  ExternalLink, FileText, Image as ImageIcon, Layers,
  Palette, Percent, Plus, Save, Share2, Tag,
  TrendingDown, Trash2, Zap,
} from "lucide-react";
import PageProducts from "./PageProducts";

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
function storeUrl(slug) {
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}?shop=${slug}`;
  }
  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}`;
}

// ── Shared helpers ────────────────────────────────────────────

const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Raleway", "Nunito", "Playfair Display", "Merriweather", "Source Sans 3",
  "Ubuntu", "PT Sans", "Josefin Sans", "Quicksand",
];

function Field({ label, hint, children }) {
  return (
    <div className="pe-field">
      <label className="pe-field__label">
        {label}
        {hint && <span className="pe-field__hint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ColorRow({ value, onChange, onClear }) {
  return (
    <div className="pe-color-row">
      <input type="color" value={value || "#ffffff"} onChange={e => onChange(e.target.value)} />
      <span className="pe-color-row__hex">{value || "—"}</span>
      {onClear && value && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
          Quitar
        </button>
      )}
    </div>
  );
}

// ── Config sections sidebar nav ───────────────────────────────

const CONFIG_SECTIONS = [
  { id: "identidad",  label: "Identidad",      Icon: Building2  },
  { id: "info",       label: "Info pública",    Icon: FileText   },
  { id: "hero",       label: "Hero & Banner",   Icon: ImageIcon  },
  { id: "promo",      label: "Barra de promo",  Icon: Zap        },
  { id: "colores",    label: "Colores",         Icon: Palette    },
  { id: "apariencia", label: "Apariencia",      Icon: Layers     },
  { id: "redes",      label: "Redes sociales",  Icon: Share2     },
  { id: "categorias", label: "Categorías",      Icon: Tag        },
];

// ── ConfigTab ─────────────────────────────────────────────────

function ConfigTab({ pageId }) {
  const [form, setForm] = useState({
    page_name: "", store_name: "", store_description: "", banner_color: "#5b52f0",
    tagline: "", whatsapp: "", instagram: "", facebook: "",
    logo_url: "", font_family: "", color_secondary: "", color_bg: "", color_text: "",
    featured_categories: [],
    card_border_radius: 12, card_show_shadow: true,
    hero_headline: "", hero_image_url: "",
    promo_text: "", show_promo_bar: true,
  });
  const [categories, setCategories] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [section,  setSection]  = useState("identidad");

  function formFromData(d) {
    setForm({
      page_name:           d.page_name           || "",
      store_name:          d.store_name          || "",
      store_description:   d.store_description   || "",
      banner_color:        d.banner_color         || "#5b52f0",
      tagline:             d.tagline              || "",
      whatsapp:            d.whatsapp             || "",
      instagram:           d.instagram            || "",
      facebook:            d.facebook             || "",
      logo_url:            d.logo_url             || "",
      font_family:         d.font_family          || "",
      color_secondary:     d.color_secondary      || "",
      color_bg:            d.color_bg             || "",
      color_text:          d.color_text           || "",
      featured_categories: Array.isArray(d.featured_categories) ? d.featured_categories : [],
      card_border_radius:  d.card_border_radius  != null ? Number(d.card_border_radius) : 12,
      card_show_shadow:    d.card_show_shadow     != null ? Boolean(d.card_show_shadow)  : true,
      hero_headline:       d.hero_headline        || "",
      hero_image_url:      d.hero_image_url       || "",
      promo_text:          d.promo_text           || "",
      show_promo_bar:      d.show_promo_bar       != null ? Boolean(d.show_promo_bar) : true,
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get(`/seller/store/pages/${pageId}`),
      client.get(`/seller/store/categories`),
    ]).then(([pageRes, catRes]) => {
      formFromData(pageRes.data);
      setCategories(catRes.data || []);
    }).finally(() => setLoading(false));
  }, [pageId]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  function toggleCategory(id) {
    setForm(p => {
      const cats = Array.isArray(p.featured_categories) ? p.featured_categories : [];
      const has  = cats.includes(id);
      return { ...p, featured_categories: has ? cats.filter(c => c !== id) : [...cats, id] };
    });
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    setError(""); setSaving(true); setSaved(false);
    try {
      const res = await client.put(`/seller/store/pages/${pageId}`, form);
      formFromData(res.data);
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
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  const activeCats = Array.isArray(form.featured_categories) ? form.featured_categories : [];

  return (
    <form onSubmit={handleSave}>

      {/* ── Save bar (sticky) ── */}
      <div className="pe-save-bar">
        <div className="pe-save-bar__left">
          {error && <span className="pe-save-bar__error">⚠ {error}</span>}
          {saved && <span className="pe-save-bar__ok">✓ Cambios guardados</span>}
        </div>
        <button type="submit" disabled={saving} className="pe-save-bar__btn">
          <Save size={15} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* ── Panel ── */}
      <div className="pe-panel">

        {/* Sidebar */}
        <aside className="pe-sidebar">
          {CONFIG_SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`pe-sidebar-item ${section === id ? "is-active" : ""}`}
              onClick={() => setSection(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </aside>

        {/* Content area */}
        <div className="pe-content">

          {/* ── Identidad ── */}
          {section === "identidad" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <Building2 size={18} />
                <div>
                  <h3>Identidad</h3>
                  <p>Nombre interno y datos de la tienda que solo vos ves.</p>
                </div>
              </div>
              <Field label="Nombre interno" hint="Solo lo ves vos, para identificar esta tienda">
                <input className="form-input" value={form.page_name}
                  onChange={e => set("page_name", e.target.value)}
                  placeholder="Ej: Tienda principal" />
              </Field>
            </div>
          )}

          {/* ── Info pública ── */}
          {section === "info" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <FileText size={18} />
                <div>
                  <h3>Información pública</h3>
                  <p>Estos datos aparecen en tu tienda y son visibles para los clientes.</p>
                </div>
              </div>
              <Field label="Nombre de la tienda">
                <input className="form-input" value={form.store_name}
                  onChange={e => set("store_name", e.target.value)}
                  placeholder="Ej: Belissia Shop" />
              </Field>
              <Field label="Descripción" hint="Breve descripción de tu tienda">
                <textarea className="form-textarea" value={form.store_description}
                  onChange={e => set("store_description", e.target.value)}
                  placeholder="Los mejores productos al mejor precio..." />
              </Field>
              <Field label="Tagline" hint="Subtítulo corto, máx 160 caracteres">
                <input className="form-input" value={form.tagline}
                  onChange={e => set("tagline", e.target.value)}
                  placeholder="Todo lo que necesitás, al mejor precio"
                  maxLength={160} />
              </Field>

              {/* Preview */}
              <div className="pe-preview-mini">
                <div className="pe-preview-mini__banner" style={{ background: form.banner_color }}>
                  {form.logo_url
                    ? <img src={form.logo_url} alt="logo" style={{ height: 32, objectFit: "contain" }} />
                    : <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>{form.store_name || "Mi tienda"}</span>
                  }
                </div>
                <div className="pe-preview-mini__body">
                  <p style={{ fontWeight: 700, fontSize: ".9rem", margin: 0 }}>{form.store_name || "Nombre de tu tienda"}</p>
                  <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>{form.tagline || form.store_description || "Descripción de tu tienda"}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Hero & Banner ── */}
          {section === "hero" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <ImageIcon size={18} />
                <div>
                  <h3>Hero & Banner</h3>
                  <p>Personalizá la sección principal que ven los clientes al entrar a tu tienda.</p>
                </div>
              </div>
              <Field label="Título principal del hero" hint="El texto grande que aparece en el banner">
                <input className="form-input" value={form.hero_headline}
                  onChange={e => set("hero_headline", e.target.value)}
                  placeholder="Ej: Todo lo que necesitás, en un solo lugar" />
              </Field>
              <Field label="Color del banner / acento principal">
                <ColorRow
                  value={form.banner_color}
                  onChange={v => set("banner_color", v)}
                />
              </Field>
              <Field label="Imagen del hero" hint="URL de una imagen para mostrar en el banner (opcional)">
                <input className="form-input" value={form.hero_image_url}
                  onChange={e => set("hero_image_url", e.target.value)}
                  placeholder="https://mi-imagen.com/banner.jpg" />
                {form.hero_image_url && (
                  <img src={form.hero_image_url} alt="hero preview"
                    style={{ marginTop: 10, width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                )}
              </Field>

              {/* Preview del hero */}
              <div className="pe-hero-preview" style={{ background: form.banner_color }}>
                <div className="pe-hero-preview__content">
                  <span className="pe-hero-preview__label">Tu tienda online</span>
                  <h4>{form.hero_headline || form.store_name || "Nombre de tu tienda"}</h4>
                  <p>{form.tagline || form.store_description || "Subtítulo de tu tienda"}</p>
                  <button type="button" className="pe-hero-preview__cta">Ver productos →</button>
                </div>
                {form.hero_image_url && (
                  <img src={form.hero_image_url} alt=""
                    style={{ height: 100, width: 120, objectFit: "cover", borderRadius: "var(--radius-md)", flexShrink: 0 }}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Barra de promo ── */}
          {section === "promo" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <Zap size={18} />
                <div>
                  <h3>Barra de promoción</h3>
                  <p>Franja animada que aparece arriba del hero con mensajes de tu tienda.</p>
                </div>
              </div>
              <Field
                label="Mostrar barra de promo"
              >
                <label className="toggle-switch" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" checked={form.show_promo_bar}
                    onChange={e => set("show_promo_bar", e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  <span style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>
                    {form.show_promo_bar ? "Visible" : "Oculta"}
                  </span>
                </label>
              </Field>
              <Field
                label="Texto de la barra"
                hint="Separá mensajes con · para que se repitan en el scroll"
              >
                <textarea className="form-textarea" value={form.promo_text}
                  onChange={e => set("promo_text", e.target.value)}
                  placeholder="🚀 Envíos a todo el país · 💳 Pago seguro · ⭐ Los mejores precios"
                  rows={3} />
              </Field>
              {form.show_promo_bar && form.promo_text && (
                <div className="pe-promo-preview">
                  <span className="pe-promo-preview__label">Vista previa:</span>
                  <div className="pe-promo-preview__bar" style={{ background: form.banner_color }}>
                    <span>{form.promo_text} &nbsp;·&nbsp; {form.promo_text}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Colores ── */}
          {section === "colores" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <Palette size={18} />
                <div>
                  <h3>Colores</h3>
                  <p>Personalizá la paleta de colores de tu tienda.</p>
                </div>
              </div>
              <Field label="Color principal / acento" hint="Botones, links y destacados">
                <ColorRow value={form.banner_color} onChange={v => set("banner_color", v)} />
              </Field>
              <Field label="Color secundario" hint="Elementos secundarios">
                <ColorRow
                  value={form.color_secondary || "#000000"}
                  onChange={v => set("color_secondary", v)}
                  onClear={() => set("color_secondary", "")}
                />
              </Field>
              <Field label="Color de fondo">
                <ColorRow
                  value={form.color_bg || "#ffffff"}
                  onChange={v => set("color_bg", v)}
                  onClear={() => set("color_bg", "")}
                />
              </Field>
              <Field label="Color de texto">
                <ColorRow
                  value={form.color_text || "#111111"}
                  onChange={v => set("color_text", v)}
                  onClear={() => set("color_text", "")}
                />
              </Field>

              {/* Swatch preview */}
              <div className="pe-swatch-row">
                <div className="pe-swatch" style={{ background: form.banner_color }}>
                  <span>Principal</span>
                </div>
                {form.color_secondary && (
                  <div className="pe-swatch" style={{ background: form.color_secondary }}>
                    <span>Secundario</span>
                  </div>
                )}
                {form.color_bg && (
                  <div className="pe-swatch" style={{ background: form.color_bg, border: "1px solid var(--border)" }}>
                    <span style={{ color: form.color_text || "#111" }}>Fondo</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Apariencia ── */}
          {section === "apariencia" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <Layers size={18} />
                <div>
                  <h3>Apariencia</h3>
                  <p>Logo, tipografía y estilo de las tarjetas de productos.</p>
                </div>
              </div>
              <Field label="Logo (URL de imagen)">
                <input className="form-input" value={form.logo_url}
                  onChange={e => set("logo_url", e.target.value)}
                  placeholder="https://..." />
                {form.logo_url && (
                  <img src={form.logo_url} alt="logo preview"
                    style={{ marginTop: 8, height: 52, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)", background: "#fff", padding: 4 }}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                )}
              </Field>
              <Field label="Tipografía">
                <select className="form-input" value={form.font_family}
                  onChange={e => set("font_family", e.target.value)}>
                  <option value="">Predeterminada (Inter)</option>
                  {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                {form.font_family && (
                  <p style={{ marginTop: 6, fontFamily: form.font_family, fontSize: ".9rem", color: "var(--text-secondary)" }}>
                    Vista previa: The quick brown fox jumps
                  </p>
                )}
              </Field>
              <Field
                label="Borde de tarjetas de producto"
                hint={`${form.card_border_radius}px`}
              >
                <input type="range" min={0} max={32} step={2}
                  value={form.card_border_radius}
                  onChange={e => set("card_border_radius", Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {[0, 8, 12, 20, 32].map(r => (
                    <button key={r} type="button"
                      onClick={() => set("card_border_radius", r)}
                      style={{
                        padding: "4px 10px", fontSize: ".78rem", cursor: "pointer",
                        borderRadius: 6, border: `1.5px solid ${form.card_border_radius === r ? "var(--brand)" : "var(--border)"}`,
                        background: form.card_border_radius === r ? "var(--brand)" : "transparent",
                        color: form.card_border_radius === r ? "#fff" : "var(--text-secondary)",
                        fontWeight: 500, transition: "all .15s",
                      }}>
                      {r}px
                    </button>
                  ))}
                </div>
                {/* Card preview */}
                <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{
                      flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                      borderRadius: form.card_border_radius,
                      boxShadow: form.card_show_shadow ? "0 4px 12px rgba(0,0,0,.08)" : "none",
                      padding: "10px", fontSize: ".72rem", color: "var(--text-secondary)",
                      transition: "border-radius .2s, box-shadow .2s",
                    }}>
                      <div style={{ height: 36, background: "var(--border)", borderRadius: Math.max(0, form.card_border_radius - 2), marginBottom: 6 }} />
                      Producto {i}
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Sombra en las tarjetas">
                <label className="toggle-switch" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" checked={form.card_show_shadow}
                    onChange={e => set("card_show_shadow", e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  <span style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>
                    {form.card_show_shadow ? "Con sombra" : "Sin sombra"}
                  </span>
                </label>
              </Field>
            </div>
          )}

          {/* ── Redes sociales ── */}
          {section === "redes" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <Share2 size={18} />
                <div>
                  <h3>Redes sociales y contacto</h3>
                  <p>Aparecen como íconos y links en el pie de tu tienda.</p>
                </div>
              </div>
              <Field label="WhatsApp" hint="Número completo con código de país">
                <input className="form-input" value={form.whatsapp}
                  onChange={e => set("whatsapp", e.target.value)}
                  placeholder="5491112345678" maxLength={30} />
              </Field>
              <Field label="Instagram" hint="Solo el usuario, sin @">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: ".9rem" }}>@</span>
                  <input className="form-input" value={form.instagram}
                    onChange={e => set("instagram", e.target.value)}
                    placeholder="mitienda" maxLength={60}
                    style={{ paddingLeft: 28 }} />
                </div>
              </Field>
              <Field label="Facebook" hint="URL completa">
                <input className="form-input" value={form.facebook}
                  onChange={e => set("facebook", e.target.value)}
                  placeholder="https://facebook.com/mitienda" maxLength={120} />
              </Field>
            </div>
          )}

          {/* ── Categorías ── */}
          {section === "categorias" && (
            <div className="pe-section">
              <div className="pe-section__head">
                <Tag size={18} />
                <div>
                  <h3>Categorías destacadas</h3>
                  <p>Filtrá qué categorías aparecen en tu tienda. Si no seleccionás ninguna, se muestran todos los productos.</p>
                </div>
              </div>
              {categories.length === 0 ? (
                <div className="pe-empty">
                  No hay categorías disponibles aún.
                </div>
              ) : (
                <>
                  <div className="pe-cat-grid">
                    {categories.map(cat => {
                      const active = activeCats.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`pe-cat-pill ${active ? "is-active" : ""}`}
                          onClick={() => toggleCategory(cat.id)}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  {activeCats.length > 0 && (
                    <p className="pe-cat-note">
                      Mostrando {activeCats.length} categoría{activeCats.length !== 1 ? "s" : ""} seleccionada{activeCats.length !== 1 ? "s" : ""}.
                      <button type="button" className="pe-cat-clear" onClick={() => set("featured_categories", [])}>
                        Mostrar todas
                      </button>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </form>
  );
}

// ── TiersSection ──────────────────────────────────────────────

function TiersSection({ type, tiers, onChange }) {
  const isQty    = type === "quantity";
  const thLabel  = isQty ? "Cantidad mínima (unidades)" : "Monto mínimo del carrito ($)";
  const thHolder = isQty ? "ej: 3" : "ej: 50000";

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
          {tiers.map((tier, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 12, alignItems: "center", padding: "10px 14px", background: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
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
            </div>
          ))}
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

// ── DiscountAccordion ─────────────────────────────────────────

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

// ── DiscountsTab ──────────────────────────────────────────────

const EMPTY_DISCOUNTS = { enabled_quantity: false, enabled_price: false, quantity_tiers: [], price_tiers: [] };

function DiscountsTab({ pageId }) {
  const [config,   setConfig]   = useState(EMPTY_DISCOUNTS);
  const [products, setProducts] = useState([]);
  const [priceAdj, setPriceAdj] = useState({});
  const [draftAdj, setDraftAdj] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get(`/seller/store/pages/${pageId}/discounts`),
      client.get(`/seller/store/pages/${pageId}/products`, { params: { only_mine: "true", limit: 200 } }),
    ]).then(([dRes, pRes]) => {
      setConfig({ ...EMPTY_DISCOUNTS, ...dRes.data, quantity_tiers: dRes.data.quantity_tiers || [], price_tiers: dRes.data.price_tiers || [] });
      setProducts(pRes.data.products || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [pageId]);

  const maxDiscountPct = Math.max(0,
    ...[...config.quantity_tiers, ...config.price_tiers]
      .map(t => Number(t.discount_pct))
      .filter(v => !isNaN(v) && v > 0)
  );

  const violations = maxDiscountPct > 0
    ? products.map(p => {
        const effectivePrice  = priceAdj[p.id] !== undefined ? Number(priceAdj[p.id]) : (p.custom_price ?? p.precio_1 ?? 0);
        const discountedPrice = effectivePrice * (1 - maxDiscountPct / 100);
        const floor           = p.precio_1 ?? 0;
        const minNeeded       = floor > 0 ? floor / (1 - maxDiscountPct / 100) : 0;
        return { ...p, effectivePrice, discountedPrice, floor, minNeeded, isViolation: floor > 0 && discountedPrice < floor - 0.01 };
      }).filter(p => p.isViolation)
    : [];

  async function handleSave(e) {
    e.preventDefault();
    if (violations.length > 0) { setError("Ajustá los precios de los productos marcados antes de guardar."); return; }
    setError(""); setSaving(true); setSaved(false);
    try {
      for (const id of Object.keys(priceAdj)) {
        await client.patch(`/seller/store/pages/${pageId}/products/${id}/price`, { custom_price: Number(priceAdj[id]) });
      }
      if (Object.keys(priceAdj).length > 0) {
        setProducts(prev => prev.map(p => priceAdj[p.id] !== undefined ? { ...p, custom_price: Number(priceAdj[p.id]) } : p));
        setPriceAdj({});
        setDraftAdj({});
      }
      const cleanTiers = ts => ts.filter(t => t.threshold !== "" && t.discount_pct !== "").map(t => ({ threshold: Number(t.threshold), discount_pct: Number(t.discount_pct) }));
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
          <TiersSection type="quantity" tiers={config.quantity_tiers} onChange={ts => setConfig(c => ({ ...c, quantity_tiers: ts }))} />
        </DiscountAccordion>
        <DiscountAccordion icon={TrendingDown} title="Descuentos por monto del carrito" enabled={config.enabled_price} onToggle={v => setConfig(c => ({ ...c, enabled_price: v }))}>
          <TiersSection type="price" tiers={config.price_tiers} onChange={ts => setConfig(c => ({ ...c, price_tiers: ts }))} />
        </DiscountAccordion>

        {violations.length > 0 && (
          <div className="card" style={{ border: "1.5px solid var(--danger,#ef4444)", background: "var(--danger-light,#fef2f2)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} color="var(--danger,#ef4444)" />
              <strong style={{ color: "var(--danger,#ef4444)", fontSize: ".9375rem" }}>
                {violations.length} producto{violations.length !== 1 ? "s" : ""} quedaría{violations.length !== 1 ? "n" : ""} por debajo del precio mínimo
              </strong>
            </div>
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", margin: "0 0 14px" }}>
              Con un descuento del {maxDiscountPct.toFixed(1)}%, estos productos bajarían de su precio mínimo. Subí sus precios y confirmá cada uno para poder guardar.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.6fr", gap: 10, padding: "0 4px", fontSize: ".75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                <span>Producto</span><span>Tu precio</span><span>Con descuento</span><span>Nuevo precio</span>
              </div>
              {violations.map(v => {
                const draft    = draftAdj[v.id] ?? "";
                const draftNum = Number(draft);
                const canAccept = draft !== "" && !isNaN(draftNum) && draftNum >= Math.ceil(v.minNeeded);
                return (
                  <div key={v.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.6fr", gap: 10, alignItems: "center", padding: "10px 12px", background: "#fff", borderRadius: "var(--radius-md)", border: "1px solid var(--danger,#ef4444)" }}>
                    <div style={{ fontSize: ".8375rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.custom_name || v.name}</div>
                    <div style={{ fontSize: ".8125rem", color: "var(--text-secondary)" }}>{fmt(v.effectivePrice)}</div>
                    <div style={{ fontSize: ".8125rem", color: "var(--danger,#ef4444)", fontWeight: 600 }}>{fmt(v.discountedPrice)}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: ".75rem", color: "var(--text-secondary)", pointerEvents: "none" }}>$</span>
                        <input type="number" min={Math.ceil(v.minNeeded)} step={1}
                          className="form-input form-input--sm" style={{ paddingLeft: 18 }}
                          value={draft}
                          placeholder={Math.ceil(v.minNeeded).toLocaleString("es-AR")}
                          onChange={e => setDraftAdj(p => ({ ...p, [v.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === "Enter" && canAccept) {
                              setPriceAdj(p => ({ ...p, [v.id]: draftNum }));
                              setDraftAdj(p => { const n = { ...p }; delete n[v.id]; return n; });
                            }
                          }}
                        />
                      </div>
                      <button type="button" className="btn btn--sm btn--primary" disabled={!canAccept}
                        onClick={() => {
                          setPriceAdj(p => ({ ...p, [v.id]: draftNum }));
                          setDraftAdj(p => { const n = { ...p }; delete n[v.id]; return n; });
                        }}>
                        Aceptar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
        {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
        {saved && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
        <button type="submit" disabled={saving || violations.length > 0} className="btn btn--primary btn--lg">
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
  const [pageName, setPageName] = useState("");
  const [pageSlug, setPageSlug] = useState("");

  useEffect(() => {
    client.get(`/seller/store/pages/${pageId}`).then(res => {
      setPageName(res.data.page_name || res.data.store_name || "Tienda");
      setPageSlug(res.data.slug || "");
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
        <button className={`page-tab ${tab === "config"    ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}`)}>
          Configuración
        </button>
        <button className={`page-tab ${tab === "products"  ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/products`)}>
          Productos
        </button>
        <button className={`page-tab ${tab === "discounts" ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/discounts`)}>
          Descuentos
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        {tab === "config"    && <ConfigTab    pageId={pageId} />}
        {tab === "products"  && <PageProducts pageId={pageId} />}
        {tab === "discounts" && <DiscountsTab pageId={pageId} />}
      </div>
    </div>
  );
}
