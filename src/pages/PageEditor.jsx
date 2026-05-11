import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import {
  AlertTriangle, Building2, ChevronDown, ChevronLeft,
  ExternalLink, FileText, Image as ImageIcon, LayoutGrid, Layers,
  Loader2, Monitor, MousePointerClick, Palette, PanelBottom, Percent, Plus,
  RefreshCw, Save, Share2, Smartphone, Star, Tag, TrendingDown, Trash2, Truck, Upload, Zap,
} from "lucide-react";
import PageProducts from "./PageProducts";

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
function slugify(str) {
  return String(str || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
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

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-switch" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );
}

// ── Config sections sidebar nav ───────────────────────────────

const CONFIG_SECTIONS = [
  { id: "identidad",  label: "Identidad",      Icon: Building2         },
  { id: "info",       label: "Info pública",   Icon: FileText          },
  { id: "inicio",     label: "Inicio / Hero",  Icon: ImageIcon         },
  { id: "catalogo",   label: "Catálogo",       Icon: LayoutGrid        },
  { id: "botones",    label: "Botones & CTA",  Icon: MousePointerClick },
  { id: "promo",      label: "Barra de promo", Icon: Zap               },
  { id: "colores",    label: "Colores",        Icon: Palette           },
  { id: "apariencia", label: "Apariencia",     Icon: Layers            },
  { id: "footer",     label: "Pie de página",  Icon: PanelBottom       },
  { id: "redes",      label: "Redes sociales", Icon: Share2            },
  { id: "categorias", label: "Categorías",     Icon: Tag               },
];

// ── ConfigTab ─────────────────────────────────────────────────

function ConfigTab({ pageId }) {
  const iframeRef  = useRef(null);
  const logoRef    = useRef(null);
  const heroRef    = useRef(null);
  const [previewMode,    setPreviewMode]    = useState("desktop");
  const [iframeSrc,      setIframeSrc]      = useState("");
  const [iframeKey,      setIframeKey]      = useState(0);
  const [uploadingLogo,  setUploadingLogo]  = useState(false);
  const [uploadingHero,  setUploadingHero]  = useState(false);

  const DEFAULT_THEME = {
    hero_bg_type: "color", hero_overlay_opacity: 50,
    hero_btn_text: "Ver productos", hero_btn_radius: 99,
    products_cols: 3, products_section_title: "",
    card_style: "default", btn_radius: 8,
    show_trust_badges: true, show_search_bar: true,
    footer_bg: "", footer_text_color: "", footer_tagline: "",
  };

  const [form, setForm] = useState({
    slug: "",
    page_name: "", store_name: "", store_description: "", banner_color: "#5b52f0",
    tagline: "", whatsapp: "", instagram: "", facebook: "",
    logo_url: "", font_family: "", color_secondary: "", color_bg: "", color_text: "",
    featured_categories: [],
    card_border_radius: 12, card_show_shadow: true,
    hero_headline: "", hero_image_url: "",
    promo_text: "", show_promo_bar: true,
    costo_envio: 0,
    theme_config: { ...DEFAULT_THEME },
  });
  const [categories, setCategories] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [section,  setSection]  = useState("tienda");

  function formFromData(d) {
    setForm({
      slug:                d.slug                || "",
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
      costo_envio:         d.costo_envio          != null ? Number(d.costo_envio) : 0,
      theme_config:        { ...DEFAULT_THEME, ...(d.theme_config || {}) },
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
      if (pageRes.data.slug) setIframeSrc(storeUrl(pageRes.data.slug));
    }).finally(() => setLoading(false));
  }, [pageId]);

  // Sync CSS variables to the preview iframe in real time
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframeSrc) return;
    iframe.contentWindow.postMessage({ type: "ventaz_preview", payload: form }, "*");
  }, [form, iframeSrc]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }
  function setTheme(key, val) { setForm(p => ({ ...p, theme_config: { ...(p.theme_config || {}), [key]: val } })); }

  function toggleCategory(id) {
    setForm(p => {
      const cats = Array.isArray(p.featured_categories) ? p.featured_categories : [];
      return { ...p, featured_categories: cats.includes(id) ? cats.filter(c => c !== id) : [...cats, id] };
    });
  }

  function handleAssetUpload(endpoint, formField, setUploading, ref) {
    return async function (e) {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await client.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });
        set(formField, res.data.url);
      } catch (err) {
        setError(err.response?.data?.message || "Error al subir la imagen");
      } finally {
        setUploading(false);
        if (ref.current) ref.current.value = "";
      }
    };
  }

  const handleLogoUpload = handleAssetUpload("/seller/images/logo",         "logo_url",       setUploadingLogo, logoRef);
  const handleHeroUpload = handleAssetUpload("/seller/images/asset/hero",   "hero_image_url", setUploadingHero, heroRef);

  async function handleSave() {
    setError(""); setSaving(true); setSaved(false);
    try {
      const res = await client.put(`/seller/store/pages/${pageId}`, form);
      formFromData(res.data);
      if (res.data.slug) setIframeSrc(storeUrl(res.data.slug));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setTimeout(() => setIframeKey(k => k + 1), 400);
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
  const tc = form.theme_config || {};

  const SECTIONS = [
    { id: "tienda",   label: "Tienda"   },
    { id: "hero",     label: "Hero"     },
    { id: "catalogo", label: "Catálogo" },
    { id: "colores",  label: "Colores"  },
    { id: "contacto", label: "Contacto" },
  ];

  return (
    <div className="pe-editor">

      {/* ── Left panel ──────────────────────────────────────────── */}
      <div className="pe-editor__left">

        {/* Section tabs */}
        <div className="pe-editor__tabs">
          {SECTIONS.map(s => (
            <button key={s.id} type="button"
              className={`pe-editor__tab ${section === s.id ? "is-active" : ""}`}
              onClick={() => setSection(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Scrollable fields */}
        <div className="pe-editor__fields">

          {/* ── Tienda ─────────────────────────────────── */}
          {section === "tienda" && <>
            <Field label="Nombre de la tienda" hint="Aparece en el banner y en todos lados">
              <input className="form-input" value={form.store_name}
                onChange={e => setForm(p => ({ ...p, store_name: e.target.value, page_name: e.target.value }))}
                placeholder="Ej: Belissia Shop" />
            </Field>
            <Field label="Link de la tienda (subdominio)" hint="Cambia la URL pública">
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span style={{
                  padding: "0 10px", height: 38, display: "flex", alignItems: "center",
                  background: "var(--surface-2,#f3f4f6)", border: "1px solid var(--border)",
                  borderRight: "none", borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
                  fontSize: ".82rem", color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0,
                }}>ventaz.com.ar/</span>
                <input className="form-input" value={form.slug}
                  onChange={e => set("slug", slugify(e.target.value))}
                  placeholder="mi-tienda"
                  style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0" }} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                Solo minúsculas, números y guiones. Cambiar esto modifica el link de tu tienda.
              </p>
            </Field>
            <Field label="Descripción" hint="Visible en el footer y SEO">
              <textarea className="form-textarea" value={form.store_description}
                onChange={e => set("store_description", e.target.value)}
                placeholder="Los mejores productos..." rows={2} />
            </Field>
            <Field label="Tagline" hint="Subtítulo debajo del título en el hero">
              <input className="form-input" value={form.tagline}
                onChange={e => set("tagline", e.target.value)}
                placeholder="Todo lo que necesitás" maxLength={160} />
            </Field>
            <Field label="Logo de la tienda" hint="PNG, JPG, SVG o WEBP · máx. 2 MB">
              {form.logo_url && (
                <img src={form.logo_url} alt="logo"
                  style={{ marginBottom: 8, height: 52, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)", background: "#fff", padding: 4 }}
                  onError={e => { e.target.style.display = "none"; }} />
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <button type="button" className="btn btn--ghost btn--sm"
                  onClick={() => logoRef.current?.click()}
                  disabled={uploadingLogo}
                  style={{ flexShrink: 0 }}
                >
                  {uploadingLogo ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                  {uploadingLogo ? "Subiendo..." : "Subir archivo"}
                </button>
                {form.logo_url && (
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => set("logo_url", "")}
                    style={{ flexShrink: 0 }}
                  >
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </div>
              <input className="form-input" value={form.logo_url}
                onChange={e => set("logo_url", e.target.value)}
                placeholder="O pegá una URL: https://..." />
              <input ref={logoRef} type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                onChange={handleLogoUpload} />
            </Field>
            <Field label="Tipografía">
              <select className="form-input" value={form.font_family}
                onChange={e => set("font_family", e.target.value)}>
                <option value="">Predeterminada (Inter)</option>
                {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {form.font_family && (
                <p style={{ fontFamily: form.font_family, fontSize: ".875rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  The quick brown fox jumps
                </p>
              )}
            </Field>
            <Field label="Costo de envío" hint="Lo paga el cliente salvo que el producto/combo tenga envío gratis">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: ".85rem", color: "var(--text-tertiary)", pointerEvents: "none" }}>$</span>
                <input type="number" min={0} step={100} className="form-input"
                  value={form.costo_envio}
                  onChange={e => set("costo_envio", Number(e.target.value))}
                  style={{ paddingLeft: 22 }} />
              </div>
            </Field>
          </>}

          {/* ── Hero ───────────────────────────────────── */}
          {section === "hero" && <>
            <Field label="Fondo del hero">
              <div style={{ display: "flex", gap: 6 }}>
                {[{ val: "color", label: "Color sólido" }, { val: "image", label: "Imagen" }].map(({ val, label }) => (
                  <button key={val} type="button"
                    onClick={() => setTheme("hero_bg_type", val)}
                    style={{
                      flex: 1, padding: "9px 0", fontSize: ".82rem", fontWeight: 600,
                      borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${(tc.hero_bg_type || "color") === val ? "var(--brand)" : "var(--border)"}`,
                      background: (tc.hero_bg_type || "color") === val ? "var(--brand)" : "transparent",
                      color: (tc.hero_bg_type || "color") === val ? "#fff" : "var(--text-secondary)",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            {tc.hero_bg_type === "image" ? (<>
              <Field label="Imagen de fondo" hint="PNG, JPG o WEBP · máx. 2 MB">
                {form.hero_image_url && (
                  <img src={form.hero_image_url} alt="hero preview"
                    style={{ marginBottom: 8, width: "100%", maxHeight: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => heroRef.current?.click()}
                    disabled={uploadingHero}
                    style={{ flexShrink: 0 }}
                  >
                    {uploadingHero ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                    {uploadingHero ? "Subiendo..." : "Subir archivo"}
                  </button>
                  {form.hero_image_url && (
                    <button type="button" className="btn btn--ghost btn--sm"
                      onClick={() => set("hero_image_url", "")}
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={13} /> Quitar
                    </button>
                  )}
                </div>
                <input className="form-input" value={form.hero_image_url}
                  onChange={e => set("hero_image_url", e.target.value)}
                  placeholder="O pegá una URL: https://..." />
                <input ref={heroRef} type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: "none" }}
                  onChange={handleHeroUpload} />
              </Field>
              <Field label="Oscuridad del overlay" hint={`${tc.hero_overlay_opacity ?? 50}%`}>
                <input type="range" min={0} max={90} step={5}
                  value={tc.hero_overlay_opacity ?? 50}
                  onChange={e => setTheme("hero_overlay_opacity", Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--brand)" }} />
              </Field>
            </>) : (
              <Field label="Color principal / hero">
                <ColorRow value={form.banner_color} onChange={v => set("banner_color", v)} />
              </Field>
            )}

            {/* Mini hero preview */}
            <div style={{
              borderRadius: 10, overflow: "hidden", position: "relative", minHeight: 120,
              ...(tc.hero_bg_type === "image" && form.hero_image_url
                ? { backgroundImage: `url(${form.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: form.banner_color || "#5b52f0" }),
            }}>
              {tc.hero_bg_type === "image" && form.hero_image_url && (
                <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${(tc.hero_overlay_opacity ?? 50) / 100})` }} />
              )}
              <div style={{ position: "relative", zIndex: 1, padding: "18px 16px" }}>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: 3 }}>
                  {form.hero_headline || form.store_name || "Mi tienda"}
                </div>
                <div style={{ fontSize: ".74rem", color: "rgba(255,255,255,.75)", marginBottom: 10 }}>
                  {form.tagline || "Tu subtítulo aquí"}
                </div>
                <span style={{
                  display: "inline-block", padding: "5px 14px",
                  borderRadius: `${tc.hero_btn_radius ?? 99}px`,
                  background: "rgba(255,255,255,.2)", color: "#fff",
                  fontSize: ".72rem", fontWeight: 600,
                  border: "1px solid rgba(255,255,255,.35)",
                }}>
                  {tc.hero_btn_text || "Ver productos"}
                </span>
              </div>
            </div>

            <Field label="Título principal">
              <input className="form-input" value={form.hero_headline}
                onChange={e => set("hero_headline", e.target.value)}
                placeholder="Ej: Todo lo que necesitás" />
            </Field>
            <Field label="Texto del botón">
              <input className="form-input" value={tc.hero_btn_text || ""}
                onChange={e => setTheme("hero_btn_text", e.target.value)}
                placeholder="Ver productos" />
            </Field>
            <Field label="Redondeo del botón" hint={`${tc.hero_btn_radius ?? 99}px`}>
              <input type="range" min={0} max={99} step={4}
                value={tc.hero_btn_radius ?? 99}
                onChange={e => setTheme("hero_btn_radius", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--brand)" }} />
            </Field>
            <Field label="Badges de confianza">
              <Toggle checked={tc.show_trust_badges !== false}
                onChange={v => setTheme("show_trust_badges", v)}
                label={tc.show_trust_badges !== false ? "Visibles" : "Ocultos"} />
            </Field>
            <Field label="Barra de promoción">
              <Toggle checked={form.show_promo_bar}
                onChange={v => set("show_promo_bar", v)}
                label={form.show_promo_bar ? "Visible" : "Oculta"} />
            </Field>
            {form.show_promo_bar && (
              <Field label="Texto de la barra" hint="Separá mensajes con ·">
                <textarea className="form-textarea" value={form.promo_text}
                  onChange={e => set("promo_text", e.target.value)}
                  placeholder="🚀 Envíos a todo el país · 💳 Pago seguro"
                  rows={2} />
              </Field>
            )}
          </>}

          {/* ── Catálogo ────────────────────────────────── */}
          {section === "catalogo" && <>
            <Field label="Columnas de productos">
              <div style={{ display: "flex", gap: 6 }}>
                {[2, 3, 4].map(n => (
                  <button key={n} type="button"
                    onClick={() => setTheme("products_cols", n)}
                    style={{
                      flex: 1, padding: "9px 0", fontSize: ".82rem", fontWeight: 600,
                      borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${(tc.products_cols ?? 3) === n ? "var(--brand)" : "var(--border)"}`,
                      background: (tc.products_cols ?? 3) === n ? "var(--brand)" : "transparent",
                      color: (tc.products_cols ?? 3) === n ? "#fff" : "var(--text-secondary)",
                    }}>
                    {n} col.
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: `repeat(${tc.products_cols ?? 3}, 1fr)`, gap: 4 }}>
                {Array.from({ length: tc.products_cols ?? 3 }, (_, i) => (
                  <div key={i} style={{ height: 40, borderRadius: 5, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "55%", background: "var(--border-subtle)" }} />
                  </div>
                ))}
              </div>
            </Field>

            <Field label="Estilo de tarjetas">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { value: "default",  label: "Clásico",    desc: "Sombra suave"  },
                  { value: "minimal",  label: "Mínimo",     desc: "Sin bordes"    },
                  { value: "bordered", label: "Con borde",  desc: "Borde visible" },
                  { value: "floating", label: "Flotante",   desc: "Sombra fuerte" },
                ].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    onClick={() => setTheme("card_style", value)}
                    style={{
                      padding: "10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      border: `1.5px solid ${(tc.card_style || "default") === value ? "var(--brand)" : "var(--border)"}`,
                      background: (tc.card_style || "default") === value ? "rgba(var(--brand-rgb),.08)" : "transparent",
                    }}>
                    <div style={{ fontWeight: 600, fontSize: ".8rem", color: "var(--text-primary)" }}>{label}</div>
                    <div style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginTop: 1 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Redondeo de tarjetas" hint={`${form.card_border_radius}px`}>
              <input type="range" min={0} max={32} step={2}
                value={form.card_border_radius}
                onChange={e => set("card_border_radius", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--brand)" }} />
              <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                {[0, 8, 16, 24, 32].map(r => (
                  <div key={r} style={{
                    flex: 1, height: 28, borderRadius: r,
                    background: form.card_border_radius === r ? "var(--brand)" : "var(--border)",
                    transition: "all .15s",
                  }} />
                ))}
              </div>
            </Field>

            <Field label="Sombra en tarjetas">
              <Toggle checked={form.card_show_shadow}
                onChange={v => set("card_show_shadow", v)}
                label={form.card_show_shadow ? "Con sombra" : "Sin sombra"} />
            </Field>
            <Field label="Barra de búsqueda">
              <Toggle checked={tc.show_search_bar !== false}
                onChange={v => setTheme("show_search_bar", v)}
                label={tc.show_search_bar !== false ? "Visible" : "Oculta"} />
            </Field>
            <Field label="Título de la sección">
              <input className="form-input" value={tc.products_section_title || ""}
                onChange={e => setTheme("products_section_title", e.target.value)}
                placeholder="Todos los productos" />
            </Field>

            {categories.length > 0 && (
              <Field label="Categorías visibles" hint="Vacío = todas">
                <div className="pe-cat-grid">
                  {categories.map(cat => (
                    <button key={cat.id} type="button"
                      className={`pe-cat-pill ${activeCats.includes(cat.id) ? "is-active" : ""}`}
                      onClick={() => toggleCategory(cat.id)}>
                      {cat.name}
                    </button>
                  ))}
                </div>
                {activeCats.length > 0 && (
                  <button type="button" className="pe-cat-clear"
                    onClick={() => set("featured_categories", [])}>
                    Mostrar todas
                  </button>
                )}
              </Field>
            )}
          </>}

          {/* ── Colores ─────────────────────────────────── */}
          {section === "colores" && <>
            <Field label="Color principal" hint="Hero, botones, links, acentos">
              <ColorRow value={form.banner_color} onChange={v => set("banner_color", v)} />
            </Field>
            <Field label="Color secundario">
              <ColorRow value={form.color_secondary || "#000000"}
                onChange={v => set("color_secondary", v)}
                onClear={() => set("color_secondary", "")} />
            </Field>
            <Field label="Fondo de la tienda">
              <ColorRow value={form.color_bg || "#fafafa"}
                onChange={v => set("color_bg", v)}
                onClear={() => set("color_bg", "")} />
            </Field>
            <Field label="Texto principal">
              <ColorRow value={form.color_text || "#111111"}
                onChange={v => set("color_text", v)}
                onClear={() => set("color_text", "")} />
            </Field>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <p style={{ fontSize: ".74rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Footer</p>
              <Field label="Fondo del footer">
                <ColorRow value={tc.footer_bg || "#0a0f09"}
                  onChange={v => setTheme("footer_bg", v)}
                  onClear={() => setTheme("footer_bg", "")} />
              </Field>
              <Field label="Texto del footer" hint="Aplica también a íconos de redes">
                <ColorRow value={tc.footer_text_color || "#ffffff"}
                  onChange={v => setTheme("footer_text_color", v)}
                  onClear={() => setTheme("footer_text_color", "")} />
              </Field>
              <Field label="Tagline del footer">
                <input className="form-input" value={tc.footer_tagline || ""}
                  onChange={e => setTheme("footer_tagline", e.target.value)}
                  placeholder="Envíos a todo el país · Atención personalizada" />
              </Field>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <p style={{ fontSize: ".74rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Botones del catálogo</p>
              <Field label="Redondeo" hint={`${tc.btn_radius ?? 8}px`}>
                <input type="range" min={0} max={24} step={2}
                  value={tc.btn_radius ?? 8}
                  onChange={e => setTheme("btn_radius", Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--brand)" }} />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button type="button" style={{
                    padding: "7px 14px", background: form.banner_color || "#5b52f0", color: "#fff",
                    borderRadius: `${tc.btn_radius ?? 8}px`, fontWeight: 600, fontSize: ".78rem", border: "none", cursor: "default",
                  }}>Agregar</button>
                  <button type="button" style={{
                    padding: "7px 14px", background: "transparent",
                    color: form.banner_color || "#5b52f0",
                    borderRadius: `${tc.btn_radius ?? 8}px`, fontWeight: 600, fontSize: ".78rem",
                    border: `1.5px solid ${form.banner_color || "#5b52f0"}`, cursor: "default",
                  }}>Ver más</button>
                </div>
              </Field>
            </div>
          </>}

          {/* ── Contacto ────────────────────────────────── */}
          {section === "contacto" && <>
            <Field label="WhatsApp" hint="Con código de país, sin +">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: ".85rem", color: "var(--text-tertiary)" }}>+</span>
                <input className="form-input" value={form.whatsapp}
                  onChange={e => set("whatsapp", e.target.value)}
                  placeholder="5491112345678" maxLength={30}
                  style={{ paddingLeft: 24 }} />
              </div>
            </Field>
            <Field label="Instagram" hint="Solo el usuario, sin @">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: ".85rem", color: "var(--text-tertiary)" }}>@</span>
                <input className="form-input" value={form.instagram}
                  onChange={e => set("instagram", e.target.value)}
                  placeholder="mitienda" maxLength={60}
                  style={{ paddingLeft: 24 }} />
              </div>
            </Field>
            <Field label="Facebook" hint="URL completa">
              <input className="form-input" value={form.facebook}
                onChange={e => set("facebook", e.target.value)}
                placeholder="https://facebook.com/mitienda" maxLength={120} />
            </Field>
          </>}

        </div>{/* end .pe-editor__fields */}

        {/* Save bar */}
        <div className="pe-editor__save">
          <span className="pe-editor__save-status">
            {error && <span style={{ color: "var(--danger)" }}>⚠ {error}</span>}
            {saved && <span style={{ color: "var(--brand)" }}>✓ Guardado</span>}
          </span>
          <button type="button" disabled={saving} className="pe-save-bar__btn" onClick={handleSave}>
            <Save size={14} />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>

      </div>{/* end .pe-editor__left */}

      {/* ── Right panel (live preview) ───────────────────────────── */}
      <div className="pe-editor__right">
        <div className="pe-editor__preview-bar">
          <button type="button"
            className={`pe-editor__device-btn ${previewMode === "desktop" ? "is-active" : ""}`}
            onClick={() => setPreviewMode("desktop")} title="Vista escritorio">
            <Monitor size={14} />
          </button>
          <button type="button"
            className={`pe-editor__device-btn ${previewMode === "mobile" ? "is-active" : ""}`}
            onClick={() => setPreviewMode("mobile")} title="Vista móvil">
            <Smartphone size={14} />
          </button>
          <div className="pe-editor__preview-url">{iframeSrc || "Cargando..."}</div>
          <button type="button" className="pe-editor__device-btn"
            onClick={() => setIframeKey(k => k + 1)} title="Recargar">
            <RefreshCw size={13} />
          </button>
          {iframeSrc && (
            <a href={iframeSrc} target="_blank" rel="noreferrer"
              className="pe-editor__device-btn" title="Abrir en nueva pestaña">
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        <div className={`pe-editor__iframe-wrap ${previewMode === "mobile" ? "is-mobile" : ""}`}>
          {iframeSrc ? (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={iframeSrc}
              title="Vista previa"
              onLoad={() => {
                if (iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.postMessage({ type: "ventaz_preview", payload: form }, "*");
                }
              }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-tertiary)", fontSize: ".875rem" }}>
              Cargando vista previa...
            </div>
          )}
        </div>
      </div>

    </div>
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
              Con un descuento del {maxDiscountPct.toFixed(1)}%, estos productos quedarían por debajo de su costo. Subí sus precios antes de guardar.
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

// ── IntegrationsTab ───────────────────────────────────────────

function StarRating({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} fill={i <= rating ? "var(--brand, #6366f1)" : "none"}
          stroke={i <= rating ? "var(--brand, #6366f1)" : "var(--border, #ccc)"} />
      ))}
    </span>
  );
}

function ReviewCard({ review, onToggle, onDelete }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: ".875rem" }}>{review.author_name}</span>
          <span style={{ marginLeft: 10 }}><StarRating rating={review.rating} /></span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{
            fontSize: ".72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
            background: review.published ? "var(--success-light, #d1fae5)" : "var(--surface-2, #f3f4f6)",
            color: review.published ? "var(--success, #059669)" : "var(--text-secondary)",
          }}>
            {review.published ? "Publicada" : "Oculta"}
          </span>
          <button
            type="button" disabled={busy}
            className="btn btn--sm btn--ghost"
            style={{ padding: "4px 10px", fontSize: ".78rem" }}
            onClick={async () => { setBusy(true); await onToggle(review); setBusy(false); }}
          >
            {busy ? <Loader2 size={12} className="spin" /> : (review.published ? "Ocultar" : "Publicar")}
          </button>
          <button
            type="button" disabled={busy}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger, #ef4444)", display: "flex", padding: 4 }}
            onClick={async () => { setBusy(true); await onDelete(review.id); }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {review.comment}
      </p>
    </div>
  );
}

function StarAISection({ pageId, products }) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [reviews,         setReviews]         = useState([]);
  const [generating,      setGenerating]      = useState(false);
  const [loadingReviews,  setLoadingReviews]  = useState(false);
  const [msg,             setMsg]             = useState("");

  async function loadReviews(productId) {
    if (!productId) { setReviews([]); return; }
    setLoadingReviews(true);
    try {
      const res = await client.get(`/seller/store/pages/${pageId}/products/${productId}/reviews`);
      setReviews(res.data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }

  async function handleGenerate() {
    if (!selectedProduct) { setMsg("Seleccioná un producto primero"); return; }
    setGenerating(true); setMsg("");
    try {
      const res = await client.post(`/seller/store/pages/${pageId}/products/${selectedProduct}/generate-reviews`);
      setReviews(res.data || []);
      setMsg("✓ 5 reseñas generadas. Publicá las que quieras mostrar.");
    } catch (e) {
      setMsg(e.response?.data?.message || "Error al generar reseñas");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggle(review) {
    try {
      const res = await client.patch(`/seller/store/pages/${pageId}/reviews/${review.id}`, { published: !review.published });
      setReviews(prev => prev.map(r => r.id === review.id ? res.data : r));
    } catch { /* silencio */ }
  }

  async function handleDelete(reviewId) {
    try {
      await client.delete(`/seller/store/pages/${pageId}/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch { /* silencio */ }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
            Producto
          </label>
          <select
            className="form-input"
            value={selectedProduct}
            onChange={e => { setSelectedProduct(e.target.value); loadReviews(e.target.value); setMsg(""); }}
          >
            <option value="">Seleccioná un producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.custom_name || p.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleGenerate}
          disabled={generating || !selectedProduct}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {generating ? <><Loader2 size={14} className="spin" /> Generando...</> : <><Star size={14} /> Generar reseñas</>}
        </button>
      </div>

      {msg && (
        <p style={{ fontSize: ".875rem", color: msg.startsWith("✓") ? "var(--success, #059669)" : "var(--danger, #ef4444)", marginBottom: 12 }}>
          {msg}
        </p>
      )}

      {loadingReviews && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".875rem", color: "var(--text-secondary)" }}>
          <Loader2 size={15} className="spin" /> Cargando reseñas...
        </div>
      )}

      {!loadingReviews && reviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map(r => (
            <ReviewCard key={r.id} review={r} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!loadingReviews && selectedProduct && reviews.length === 0 && !generating && (
        <p style={{ fontSize: ".875rem", color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
          No hay reseñas para este producto. Generá las primeras con el botón de arriba.
        </p>
      )}
    </div>
  );
}

function IntegrationsTab({ pageId }) {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState({});

  useEffect(() => {
    setLoading(true);
    client.get(`/seller/store/pages/${pageId}/integrations`)
      .then(res => setIntegrations(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageId]);

  async function handleToggle(integration) {
    const newActive = !integration.activated;
    setToggling(p => ({ ...p, [integration.key]: true }));
    try {
      await client.post(`/seller/store/pages/${pageId}/integrations/${integration.key}/toggle`, { active: newActive });
      setIntegrations(prev => prev.map(i => i.key === integration.key ? { ...i, activated: newActive } : i));
    } catch { /* silencio */ } finally {
      setToggling(p => ({ ...p, [integration.key]: false }));
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {integrations.map(integration => (
        <div key={integration.key} className="card" style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{integration.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: ".9375rem" }}>{integration.name}</span>
                <span style={{
                  fontSize: ".7rem", fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                  background: integration.activated ? "var(--success-light,#d1fae5)" : "var(--surface-2,#f3f4f6)",
                  color: integration.activated ? "var(--success,#059669)" : "var(--text-secondary)",
                }}>
                  {integration.activated ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: ".8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {integration.description}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className={`btn ${integration.activated ? "btn--ghost" : "btn--primary"} btn--sm`}
                disabled={!!toggling[integration.key]}
                onClick={() => handleToggle(integration)}
              >
                {toggling[integration.key]
                  ? <Loader2 size={13} className="spin" />
                  : integration.activated ? "Desactivar" : "Activar"}
              </button>
              {integration.activated && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => navigate(`/integrations?pageId=${pageId}`)}
                >
                  Configurar →
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {integrations.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
          No hay integraciones disponibles por el momento.
        </p>
      )}
    </div>
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
        <button type="button" className={`page-tab ${tab === "config"       ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}`)}>
          Configuración
        </button>
        <button type="button" className={`page-tab ${tab === "products"     ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/products`)}>
          Productos
        </button>
        <button type="button" className={`page-tab ${tab === "discounts"    ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/discounts`)}>
          Descuentos
        </button>
        <button type="button" className={`page-tab ${tab === "integrations" ? "page-tab--active" : ""}`} onClick={() => navigate(`/pages/${pageId}/integrations`)}>
          Integraciones
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        {tab === "config"       && <ConfigTab          pageId={pageId} />}
        {tab === "products"     && <PageProducts       pageId={pageId} />}
        {tab === "discounts"    && <DiscountsTab        pageId={pageId} />}
        {tab === "integrations" && <IntegrationsTab    pageId={pageId} />}
      </div>
    </div>
  );
}
