import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import { ChevronLeft, Plus, Trash2, Percent, Tag, TrendingDown, ChevronDown, AlertTriangle, Loader2, ExternalLink, Store, Palette, Type, LayoutGrid, Phone, DollarSign, X, Check } from "lucide-react";
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
  "Ubuntu", "PT Sans", "Josefin Sans", "Quicksand", "DM Sans", "Outfit",
];

const CARD_PRESETS = [
  { id: "classic",  label: "Clásico",  radius: 12, shadow: true  },
  { id: "modern",   label: "Moderno",  radius: 20, shadow: true  },
  { id: "minimal",  label: "Minimal",  radius: 8,  shadow: false },
  { id: "sharp",    label: "Sharp",    radius: 4,  shadow: true  },
];

const SECTIONS = [
  { id: "general",    icon: Store,      label: "General"    },
  { id: "colores",    icon: Palette,    label: "Colores"    },
  { id: "tipografia", icon: Type,       label: "Tipografía" },
  { id: "cards",      icon: LayoutGrid, label: "Productos"  },
  { id: "contacto",   icon: Phone,      label: "Contacto"   },
  { id: "precios",    icon: DollarSign, label: "Precios"    },
];

function SettingRow({ label, desc, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: ".875rem", color: "var(--text-primary)" }}>{label}</div>
        {desc && <div style={{ fontSize: ".78rem", color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ColorPill({ value, onChange, onClear }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {onClear && value && (
        <button type="button" onClick={onClear}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", padding: 2, borderRadius: 4 }}>
          <X size={12} />
        </button>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px 5px 5px", cursor: "pointer" }}>
        <span style={{ display: "block", width: 24, height: 24, borderRadius: 6, background: value || "#e4e4e7", border: "2px solid rgba(0,0,0,.08)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
          <input type="color" value={value || "#ffffff"} onChange={onChange}
            style={{ position: "absolute", inset: "-4px", width: "calc(100% + 8px)", height: "calc(100% + 8px)", border: "none", padding: 0, cursor: "pointer", opacity: 0 }} />
        </span>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".8rem", color: "var(--text-primary)", letterSpacing: ".03em" }}>
          {value || "—"}
        </span>
      </label>
    </div>
  );
}

function SectionHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{title}</h3>
      {desc && <p style={{ fontSize: ".8125rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>{desc}</p>}
    </div>
  );
}

function ConfigTab({ pageId }) {
  const [activeSection, setActiveSection] = useState("general");
  const [form, setForm] = useState({
    page_name: "", store_name: "", store_description: "", banner_color: "#5b52f0",
    pct_markup: 0, tagline: "", whatsapp: "", instagram: "", facebook: "",
    logo_url: "", font_family: "", color_secondary: "", color_bg: "", color_text: "",
    featured_categories: [], card_border_radius: 12, card_show_shadow: true,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  function f(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function formFromData(d) {
    setForm({
      page_name:           d.page_name           || "",
      store_name:          d.store_name          || "",
      store_description:   d.store_description   || "",
      banner_color:        d.banner_color         || "#5b52f0",
      pct_markup:          Number(d.pct_markup)   || 0,
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
      card_border_radius:  d.card_border_radius   ?? 12,
      card_show_shadow:    d.card_show_shadow      !== false,
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

  function toggleCategory(id) {
    setForm(p => {
      const cats = Array.isArray(p.featured_categories) ? p.featured_categories : [];
      return { ...p, featured_categories: cats.includes(id) ? cats.filter(c => c !== id) : [...cats, id] };
    });
  }

  async function handleSave() {
    setError(""); setSaving(true); setSaved(false);
    try {
      const res = await client.put(`/seller/store/pages/${pageId}`, { ...form, pct_markup: Number(form.pct_markup) });
      formFromData(res.data);
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
  const activeCats    = Array.isArray(form.featured_categories) ? form.featured_categories : [];

  if (loading) return (
    <div style={{ display: "flex", gap: 0, background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", minHeight: 480 }}>
      <div style={{ width: 200, background: "var(--bg)", borderRight: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: "var(--radius-md)" }} />)}
      </div>
      <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-md)" }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", minHeight: 560 }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={{ width: 196, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--bg)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {SECTIONS.map(s => {
            const active = activeSection === s.id;
            return (
              <button key={s.id} type="button" onClick={() => setActiveSection(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 12px",
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--brand)" : "var(--text-secondary)",
                  border: "none", borderRadius: "var(--radius-md)",
                  cursor: "pointer", fontSize: ".875rem", fontWeight: active ? 600 : 400,
                  textAlign: "left", transition: "all .12s",
                  boxShadow: active ? "var(--shadow-xs)" : "none",
                }}>
                <s.icon size={15} strokeWidth={active ? 2.5 : 2} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>

          {/* ── General ── */}
          {activeSection === "general" && (
            <div>
              <SectionHeader title="Información general" desc="Nombre, descripción y logo que se muestran en tu tienda pública." />
              <SettingRow label="Nombre interno" desc="Solo lo ves vos, para identificar la tienda en el panel.">
                <input className="form-input" style={{ width: 220 }} value={form.page_name}
                  onChange={e => f("page_name", e.target.value)} placeholder="Ej: Tienda Verano" />
              </SettingRow>
              <SettingRow label="Nombre de la tienda" desc="Aparece en el encabezado y la pestaña del browser.">
                <input className="form-input" style={{ width: 220 }} value={form.store_name}
                  onChange={e => f("store_name", e.target.value)} placeholder="Mi Tienda" />
              </SettingRow>
              <SettingRow label="Tagline" desc="Subtítulo corto debajo del nombre (máx. 160 caracteres).">
                <input className="form-input" style={{ width: 220 }} value={form.tagline}
                  onChange={e => f("tagline", e.target.value)} placeholder="La mejor selección al mejor precio" maxLength={160} />
              </SettingRow>
              <SettingRow label="Descripción" desc="Texto que aparece en el hero de tu tienda.">
                <textarea className="form-textarea" style={{ width: 220, minHeight: 80, resize: "vertical" }}
                  value={form.store_description} onChange={e => f("store_description", e.target.value)}
                  placeholder="Contá de qué se trata tu tienda..." />
              </SettingRow>
              <SettingRow label="Logo" desc="URL de imagen (PNG/SVG con fondo transparente recomendado).">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <input className="form-input" style={{ width: 220 }} value={form.logo_url}
                    onChange={e => f("logo_url", e.target.value)} placeholder="https://..." />
                  {form.logo_url && (
                    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 6, width: 80, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={form.logo_url} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
                    </div>
                  )}
                </div>
              </SettingRow>
            </div>
          )}

          {/* ── Colores ── */}
          {activeSection === "colores" && (
            <div>
              <SectionHeader title="Colores" desc="Definí la identidad visual de tu tienda. El color principal se usa en el hero, botones y precios." />

              {/* Palette preview */}
              <div style={{ display: "flex", gap: 8, marginBottom: 28, padding: 16, background: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                {[
                  { label: "Principal", color: form.banner_color || "#5b52f0" },
                  { label: "Secundario", color: form.color_secondary || "#e4e4e7" },
                  { label: "Fondo", color: form.color_bg || "#fafafa" },
                  { label: "Texto", color: form.color_text || "#09090b" },
                ].map(({ label, color }) => (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ height: 40, borderRadius: 8, background: color, border: "1px solid rgba(0,0,0,.08)" }} />
                    <span style={{ fontSize: ".7rem", color: "var(--text-tertiary)", textAlign: "center", fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>

              <SettingRow label="Color principal" desc="Hero, botones, precios y acentos.">
                <ColorPill value={form.banner_color} onChange={e => f("banner_color", e.target.value)} />
              </SettingRow>
              <SettingRow label="Color secundario" desc="Botones secundarios y elementos de acento opcionales.">
                <ColorPill value={form.color_secondary} onChange={e => f("color_secondary", e.target.value)} onClear={() => f("color_secondary", "")} />
              </SettingRow>
              <SettingRow label="Fondo de la página" desc="Color de fondo general de la tienda.">
                <ColorPill value={form.color_bg} onChange={e => f("color_bg", e.target.value)} onClear={() => f("color_bg", "")} />
              </SettingRow>
              <SettingRow label="Color del texto" desc="Color principal del texto en la tienda.">
                <ColorPill value={form.color_text} onChange={e => f("color_text", e.target.value)} onClear={() => f("color_text", "")} />
              </SettingRow>
            </div>
          )}

          {/* ── Tipografía ── */}
          {activeSection === "tipografia" && (
            <div>
              <SectionHeader title="Tipografía y categorías" desc="Elegí la fuente que mejor representa tu marca y filtrá qué productos mostrar." />
              <SettingRow label="Fuente de la tienda" desc="Se carga desde Google Fonts automáticamente.">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <select className="form-input" style={{ width: 200 }} value={form.font_family}
                    onChange={e => f("font_family", e.target.value)}>
                    <option value="">Predeterminada (Inter)</option>
                    {GOOGLE_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                  </select>
                  {form.font_family && (
                    <div style={{ fontSize: "1.125rem", color: "var(--text-primary)", fontFamily: `'${form.font_family}', sans-serif`, padding: "8px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", width: 200, textAlign: "center" }}>
                      {form.font_family}
                    </div>
                  )}
                </div>
              </SettingRow>

              {categories.length > 0 && (
                <div style={{ paddingTop: 20 }}>
                  <div style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--text-primary)", marginBottom: 6 }}>Categorías destacadas</div>
                  <p style={{ fontSize: ".8rem", color: "var(--text-tertiary)", marginBottom: 14, lineHeight: 1.5 }}>
                    Seleccioná qué categorías mostrar. Sin selección se muestran todos los productos.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {categories.map(cat => {
                      const active = activeCats.includes(cat.id);
                      return (
                        <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                          style={{
                            padding: "6px 14px", borderRadius: 20,
                            border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`,
                            background: active ? "var(--brand)" : "var(--surface)",
                            color: active ? "#fff" : "var(--text-secondary)",
                            fontSize: ".8125rem", fontWeight: 500, cursor: "pointer", transition: "all .15s",
                            display: "flex", alignItems: "center", gap: 5,
                          }}>
                          {active && <Check size={11} />}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  {activeCats.length > 0 && (
                    <button type="button" onClick={() => f("featured_categories", [])}
                      style={{ marginTop: 10, fontSize: ".78rem", color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                      Mostrar todos los productos
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Cards ── */}
          {activeSection === "cards" && (
            <div>
              <SectionHeader title="Estilo de las cards" desc="Personalizá la forma y sombra de las tarjetas de producto." />

              {/* Card live preview */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 32 }}>
                <div style={{
                  background: "#fff",
                  borderRadius: `${form.card_border_radius}px`,
                  border: "1px solid #e4e4e7",
                  boxShadow: form.card_show_shadow ? "0 2px 12px rgba(0,0,0,.10)" : "none",
                  width: 160, overflow: "hidden", transition: "all .2s", flexShrink: 0,
                }}>
                  <div style={{ height: 100, background: `linear-gradient(135deg, ${form.banner_color}22, ${form.banner_color}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📦</div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, fontSize: ".875rem", color: form.color_text || "#09090b", marginBottom: 4 }}>Producto ejemplo</div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: form.banner_color }}>$12.500</div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".8rem", color: "var(--text-tertiary)", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Vista previa</div>
                  <p style={{ fontSize: ".8125rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>La card se actualiza en tiempo real según los ajustes que hagás abajo.</p>
                </div>
              </div>

              {/* Presets */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)", marginBottom: 12 }}>Presets rápidos</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {CARD_PRESETS.map(p => {
                    const isActive = form.card_border_radius === p.radius && form.card_show_shadow === p.shadow;
                    return (
                      <button key={p.id} type="button"
                        onClick={() => setForm(prev => ({ ...prev, card_border_radius: p.radius, card_show_shadow: p.shadow }))}
                        style={{
                          flex: 1, padding: "10px 6px", borderRadius: "var(--radius-md)",
                          border: `2px solid ${isActive ? "var(--brand)" : "var(--border)"}`,
                          background: isActive ? "var(--brand-light,#edfbe5)" : "var(--surface)",
                          color: isActive ? "var(--brand)" : "var(--text-secondary)",
                          cursor: "pointer", fontSize: ".8rem", fontWeight: isActive ? 600 : 400,
                          transition: "all .15s",
                        }}>
                        <div style={{ width: 32, height: 24, background: isActive ? "var(--brand)" : "var(--border)", borderRadius: `${p.radius / 2}px`, margin: "0 auto 6px", opacity: .7 }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <SettingRow label="Radio del borde" desc={`Esquinas más redondeadas o más rectas. Valor actual: ${form.card_border_radius}px`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="range" min={0} max={24} step={1} value={form.card_border_radius}
                    onChange={e => f("card_border_radius", Number(e.target.value))}
                    style={{ width: 140 }} />
                  <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".8rem", color: "var(--text-primary)", minWidth: 36 }}>{form.card_border_radius}px</span>
                </div>
              </SettingRow>
              <SettingRow label="Sombra en las cards" desc="Agrega profundidad visual a las tarjetas de producto.">
                <label className="toggle-switch">
                  <input type="checkbox" checked={form.card_show_shadow}
                    onChange={e => f("card_show_shadow", e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                </label>
              </SettingRow>
            </div>
          )}

          {/* ── Contacto ── */}
          {activeSection === "contacto" && (
            <div>
              <SectionHeader title="Contacto y redes sociales" desc="Estos datos aparecen en el footer de tu tienda para que los clientes te contacten." />
              <SettingRow label="WhatsApp" desc="Número con código de país (ej: 5491112345678).">
                <input className="form-input" style={{ width: 220 }} value={form.whatsapp}
                  onChange={e => f("whatsapp", e.target.value)} placeholder="5491112345678" maxLength={30} />
              </SettingRow>
              <SettingRow label="Instagram" desc="Solo el nombre de usuario, sin @.">
                <input className="form-input" style={{ width: 220 }} value={form.instagram}
                  onChange={e => f("instagram", e.target.value)} placeholder="mitienda" maxLength={60} />
              </SettingRow>
              <SettingRow label="Facebook" desc="URL completa de tu página.">
                <input className="form-input" style={{ width: 220 }} value={form.facebook}
                  onChange={e => f("facebook", e.target.value)} placeholder="https://facebook.com/mitienda" maxLength={120} />
              </SettingRow>
            </div>
          )}

          {/* ── Precios ── */}
          {activeSection === "precios" && (
            <div>
              <SectionHeader title="Configuración de precios" desc="El precio base ya incluye los márgenes del sistema. Tu porcentaje se suma por encima." />
              <SettingRow label="% de markup" desc="Cuánto sumás vos sobre el precio base del sistema.">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="range" min={0} max={200} step={0.5} value={form.pct_markup}
                      onChange={e => f("pct_markup", e.target.value)}
                      style={{ width: 160 }} />
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".875rem", fontWeight: 700, color: "var(--text-primary)", minWidth: 48 }}>{form.pct_markup}%</span>
                  </div>
                </div>
              </SettingRow>
              <div style={{ marginTop: 24, padding: 20, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: ".8125rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>Ejemplo de cálculo</div>
                <div className="calc-breakdown">
                  <div className="calc-breakdown__row">
                    <span className="calc-breakdown__label">Precio base del sistema</span>
                    <span className="calc-breakdown__value">${fmt(ejemploPrecio)}</span>
                  </div>
                  <div className="calc-breakdown__row" style={{ paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <span className="calc-breakdown__label" style={{ fontWeight: 600 }}>Tu precio de venta</span>
                    <span className="calc-breakdown__value" style={{ color: "var(--brand)", fontWeight: 700, fontSize: "1.1rem" }}>${fmt(precioFinal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Save bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
        {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>
            <Check size={14} /> Guardado
          </span>
        )}
        <button type="button" disabled={saving} className="btn btn--primary btn--lg" onClick={handleSave}>
          {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Guardando...</> : "Guardar cambios"}
        </button>
      </div>
    </div>
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
