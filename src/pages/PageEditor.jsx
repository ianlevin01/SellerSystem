import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import {
  AlertTriangle, Building2, ChevronDown, ChevronLeft,
  ExternalLink, FileText, Image as ImageIcon, LayoutGrid, Layers,
  Loader2, Monitor, MousePointerClick, Palette, PanelBottom, Percent, Plus,
  RefreshCw, Save, Share2, Smartphone, Star, Tag, TrendingDown, Trash2, Truck, Upload, X, Zap,
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

function assetPreviewSrc(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const apiBase = client.defaults.baseURL || (import.meta.env.DEV ? "http://localhost:3000" : "");
  if (raw.startsWith("/")) return apiBase ? `${apiBase}${raw}` : raw;

  return `${apiBase}/seller/store/media?key=${encodeURIComponent(raw)}`;
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
  const current = value || "#ffffff";

  function update(next) {
    onChange(next);
  }

  return (
    <div className="pe-color-row pe-color-row--live">
      <input
        type="color"
        value={current}
        onInput={e => update(e.currentTarget.value)}
        onChange={e => update(e.currentTarget.value)}
        aria-label="Elegir color"
      />
      <span className="pe-color-row__swatch" style={{ background: current }} />
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
  const iframeRef = useRef(null);
  const logoInputRef = useRef(null);
  const heroInputRef = useRef(null);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [iframeSrc,   setIframeSrc]   = useState("");
  const [iframeKey,   setIframeKey]   = useState(0);

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
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
    iframe.contentWindow.postMessage({ type: "ventaz_preview", payload: { ...form, __preview_section: section } }, "*");
  }, [form, iframeSrc]);

  function inferPreviewTarget(key, scope = "field") {
    if (scope === "theme") {
      if (String(key).startsWith("footer_")) return "footer";
      if (String(key).startsWith("hero_") || key === "show_trust_badges") return "hero";
      if (["card_style", "card_density", "products_cols", "show_search_bar", "button_style", "btn_radius"].includes(key)) return "products";
      return section === "colores" ? "products" : section;
    }

    if (["hero_headline", "hero_image_url", "tagline", "banner_color"].includes(key)) return "hero";
    if (["color_bg", "color_text", "card_border_radius", "card_show_shadow"].includes(key)) return "products";
    if (["store_name", "logo_url"].includes(key)) return "header";
    return section === "colores" ? "products" : section;
  }

  function sendPreview(nextForm, target) {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage({
      type: "ventaz_preview",
      payload: {
        ...nextForm,
        __preview_section: section,
        ...(target ? { __preview_target: target } : {}),
      },
    }, "*");
  }

  function set(key, val) {
    setForm(p => {
      const next = { ...p, [key]: val };
      const target = inferPreviewTarget(key, "field");
      requestAnimationFrame(() => sendPreview(next, target));
      return next;
    });
  }

  function setTheme(key, val) {
    setForm(p => {
      const next = { ...p, theme_config: { ...(p.theme_config || {}), [key]: val } };
      const target = inferPreviewTarget(key, "theme");
      requestAnimationFrame(() => sendPreview(next, target));
      return next;
    });
  }

  const STYLE_PRESETS = [
    {
      id: "ventaz",
      name: "Ventaz",
      desc: "Verde, moderno y confiable.",
      banner_color: "#4db81a",
      color_bg: "#f6f9f5",
      color_text: "#18181b",
      theme_config: {
        card_style: "floating",
        card_density: "normal",
        btn_radius: 14,
        hero_btn_radius: 99,
        hero_layout: "center",
        products_cols: 3,
        footer_bg: "#0f1a0d",
        footer_text_color: "#ffffff",
      },
    },
    {
      id: "minimal",
      name: "Minimal",
      desc: "Limpio, simple y elegante.",
      banner_color: "#111827",
      color_bg: "#fafafa",
      color_text: "#111111",
      theme_config: {
        card_style: "minimal",
        card_density: "compact",
        btn_radius: 8,
        hero_btn_radius: 12,
        hero_layout: "left",
        products_cols: 3,
        footer_bg: "#111827",
        footer_text_color: "#ffffff",
      },
    },
    {
      id: "premium",
      name: "Premium",
      desc: "Oscuro, fuerte y más marca.",
      banner_color: "#2f6bff",
      color_bg: "#f3f6ff",
      color_text: "#111827",
      theme_config: {
        card_style: "floating",
        card_density: "wide",
        btn_radius: 16,
        hero_btn_radius: 18,
        hero_layout: "left",
        products_cols: 3,
        footer_bg: "#08111f",
        footer_text_color: "#ffffff",
      },
    },
    {
      id: "calido",
      name: "Cálido",
      desc: "Cercano, suave y comercial.",
      banner_color: "#f97316",
      color_bg: "#fff7ed",
      color_text: "#1f1308",
      theme_config: {
        card_style: "bordered",
        card_density: "normal",
        btn_radius: 18,
        hero_btn_radius: 99,
        hero_layout: "center",
        products_cols: 3,
        footer_bg: "#1f1308",
        footer_text_color: "#fff7ed",
      },
    },
  ];

  function applyStylePreset(preset) {
    setForm(prev => {
      const next = {
        ...prev,
        banner_color: preset.banner_color,
        color_bg: preset.color_bg,
        color_text: preset.color_text,
        theme_config: {
          ...(prev.theme_config || {}),
          ...preset.theme_config,
        },
      };
      requestAnimationFrame(() => sendPreview(next));
      return next;
    });
  }

  function setDensity(value) {
    const densityMap = {
      compact: { card_border_radius: 10, card_show_shadow: false },
      normal:  { card_border_radius: 16, card_show_shadow: true },
      wide:    { card_border_radius: 24, card_show_shadow: true },
    };

    setForm(prev => {
      const next = {
        ...prev,
        ...(densityMap[value] || densityMap.normal),
        theme_config: {
          ...(prev.theme_config || {}),
          card_density: value,
        },
      };
      requestAnimationFrame(() => sendPreview(next));
      return next;
    });
  }

  function setButtonStyle(value) {
    const radiusMap = {
      square: 6,
      soft: 14,
      round: 99,
    };

    const radius = radiusMap[value] ?? 14;

    setForm(prev => {
      const next = {
        ...prev,
        theme_config: {
          ...(prev.theme_config || {}),
          button_style: value,
          btn_radius: radius,
          hero_btn_radius: radius,
        },
      };
      requestAnimationFrame(() => sendPreview(next));
      return next;
    });
  }

  function setCardRadius(val) {
    const next = Number(val);
    setForm(p => ({
      ...p,
      card_border_radius: next,
      theme_config: { ...(p.theme_config || {}), card_radius: next },
    }));
  }
  function setButtonRadius(val) {
    const next = Number(val);
    setForm(p => ({
      ...p,
      theme_config: { ...(p.theme_config || {}), btn_radius: next, button_radius: next },
    }));
  }
  function optionClass(active) {
    return `pe-option-card ${active ? "is-active" : ""}`;
  }

  function toggleCategory(id) {
    setForm(p => {
      const cats = Array.isArray(p.featured_categories) ? p.featured_categories : [];
      return { ...p, featured_categories: cats.includes(id) ? cats.filter(c => c !== id) : [...cats, id] };
    });
  }

  async function uploadStoreAssetFile({ file, assetType, fieldName, setUploading, inputRef, fallbackLogo = false }) {
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const data = new FormData();
      data.append("image", file);

      const res = await tryUploadStoreAsset(data, assetType, fallbackLogo);
      const url = res.data?.url;
      const key = res.data?.key;

      if (!url && !key) throw new Error("La API no devolvió imagen");

      // Guardamos la key estable. La vista previa y SellerPage la resuelven vía /seller/store/media.
      set(fieldName, key || url);
      setIframeKey(k => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleLogoUpload(e) {
    await uploadStoreAssetFile({
      file: e.target.files?.[0],
      assetType: "logo",
      fieldName: "logo_url",
      setUploading: setUploadingLogo,
      inputRef: logoInputRef,
      fallbackLogo: true,
    });
  }

  async function handleHeroUpload(e) {
    await uploadStoreAssetFile({
      file: e.target.files?.[0],
      assetType: "hero",
      fieldName: "hero_image_url",
      setUploading: setUploadingHero,
      inputRef: heroInputRef,
    });
  }

  async function tryUploadStoreAsset(data, assetType = "logo", fallbackLogo = false) {
    try {
      return await client.post(`/seller/images/asset/${assetType}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (firstError) {
      if (!fallbackLogo) throw firstError;

      try {
        return await client.post("/seller/images/logo", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch {
        throw firstError;
      }
    }
  }

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
    { id: "hero",     label: "Portada"  },
    { id: "catalogo", label: "Productos" },
    { id: "colores",  label: "Estilo"   },
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
            <Field label="Logo de la tienda" hint="Subilo desde tu PC. No hace falta pegar enlaces.">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                style={{ display: "none" }}
              />

              {form.logo_url ? (
                <div className="pe-upload-card pe-upload-card--logo">
                  <div className="pe-logo-preview pe-logo-preview--clean">
                    <img src={assetPreviewSrc(form.logo_url)} alt="Logo de la tienda"
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  </div>
                  <div className="pe-upload-card__body">
                    <strong>Logo cargado</strong>
                    <span>Va a aparecer en tu tienda y en la vista previa.</span>
                    <div className="pe-upload-card__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                        {uploadingLogo ? "Subiendo..." : "Cambiar logo"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => set("logo_url", "")}
                      >
                        <X size={14} />
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pe-upload-empty">
                  <ImageIcon size={20} />
                  <strong>Subí el logo de tu tienda</strong>
                  <span>PNG, JPG, SVG o WEBP. Recomendado: fondo transparente.</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                    {uploadingLogo ? "Subiendo..." : "Subir desde la PC"}
                  </button>
                </div>
              )}
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
            <Field label="Tipo de portada" hint="Elegí si la primera pantalla usa color o una imagen.">
              <div className="pe-option-grid pe-option-grid--2">
                {[
                  { val: "color", label: "Color sólido", desc: "Usa el color principal de la pestaña Estilo." },
                  { val: "image", label: "Imagen", desc: "Subís una foto de fondo para la portada." },
                ].map(({ val, label, desc }) => (
                  <button
                    key={val}
                    type="button"
                    className={optionClass((tc.hero_bg_type || "color") === val)}
                    onClick={() => setTheme("hero_bg_type", val)}
                  >
                    <strong>{label}</strong>
                    <span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            {tc.hero_bg_type === "image" ? (<>
              <Field label="Imagen del hero">
                <div className="pe-upload-row pe-upload-row--hero">
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleHeroUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingHero}
                  >
                    {uploadingHero ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                    {uploadingHero ? "Subiendo..." : form.hero_image_url ? "Cambiar imagen" : "Subir desde la PC"}
                  </button>
                  {form.hero_image_url && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => set("hero_image_url", "")}
                    >
                      <X size={14} />
                      Quitar
                    </button>
                  )}
                </div>

                {form.hero_image_url ? (
                  <div className="pe-hero-upload-preview">
                    <img src={assetPreviewSrc(form.hero_image_url)} alt="Fondo del hero" />
                  </div>
                ) : (
                  <div className="pe-hero-upload-empty">
                    Subí una imagen horizontal para usar como fondo principal de tu tienda.
                  </div>
                )}
              </Field>
              <Field label="Oscuridad del overlay" hint={`${tc.hero_overlay_opacity ?? 50}%`}>
                <input type="range" min={0} max={90} step={5}
                  value={tc.hero_overlay_opacity ?? 50}
                  onChange={e => setTheme("hero_overlay_opacity", Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--brand)" }} />
              </Field>
            </>) : (
              <div className="pe-info-box">
                <strong>La portada usa el color principal.</strong>
                <span>Para cambiarlo, entrá en la pestaña Estilo. Así evitamos editar el mismo color en dos lugares distintos.</span>
              </div>
            )}

            {/* Mini hero preview */}
            <div style={{
              borderRadius: 10, overflow: "hidden", position: "relative", minHeight: 120,
              ...(tc.hero_bg_type === "image" && form.hero_image_url
                ? { backgroundImage: `url(${assetPreviewSrc(form.hero_image_url)})`, backgroundSize: "cover", backgroundPosition: "center" }
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
            <div className="pe-section-note">
              <strong>Cómo se ven los productos</strong>
              <span>Estos controles cambian la grilla, las tarjetas y los botones del catálogo.</span>
            </div>

            <Field label="Columnas de productos" hint="En celular siempre se acomoda automáticamente.">
              <div className="pe-option-grid pe-option-grid--3">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={optionClass((tc.products_cols ?? 3) === n)}
                    onClick={() => setTheme("products_cols", n)}
                  >
                    <strong>{n} columnas</strong>
                    <span>{n === 2 ? "Más grande" : n === 3 ? "Equilibrado" : "Más productos visibles"}</span>
                  </button>
                ))}
              </div>
              <div className="pe-grid-preview" style={{ gridTemplateColumns: `repeat(${tc.products_cols ?? 3}, 1fr)` }}>
                {Array.from({ length: tc.products_cols ?? 3 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            </Field>

            <Field label="Estilo de tarjetas">
              <div className="pe-option-grid pe-option-grid--2">
                {[
                  { value: "default",  label: "Clásico",    desc: "Tarjeta limpia con sombra suave." },
                  { value: "minimal",  label: "Mínimo",     desc: "Más simple y liviano." },
                  { value: "bordered", label: "Con borde",  desc: "Separa mejor cada producto." },
                  { value: "floating", label: "Flotante",   desc: "Más profundidad visual." },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    className={optionClass((tc.card_style || "default") === value)}
                    onClick={() => setTheme("card_style", value)}
                  >
                    <strong>{label}</strong>
                    <span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Redondeo de tarjetas" hint={`${form.card_border_radius ?? 12}px`}>
              <div className="pe-range-row">
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  value={form.card_border_radius ?? 12}
                  onChange={e => setCardRadius(e.target.value)}
                />
                <span>{form.card_border_radius ?? 12}px</span>
              </div>
              <div className="pe-radius-presets">
                {[0, 8, 12, 18, 24, 32].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={Number(form.card_border_radius ?? 12) === r ? "is-active" : ""}
                    onClick={() => setCardRadius(r)}
                  >
                    {r}px
                  </button>
                ))}
              </div>
              <div className="pe-card-preview" style={{ borderRadius: `${form.card_border_radius ?? 12}px` }}>
                <span />
                <strong>Vista de tarjeta</strong>
                <small>Producto · precio · botón</small>
              </div>
            </Field>

            <Field label="Sombra en tarjetas">
              <Toggle checked={form.card_show_shadow}
                onChange={v => set("card_show_shadow", v)}
                label={form.card_show_shadow ? "Con sombra" : "Sin sombra"} />
            </Field>

            <Field label="Búsqueda del catálogo">
              <Toggle checked={tc.show_search_bar !== false}
                onChange={v => setTheme("show_search_bar", v)}
                label={tc.show_search_bar !== false ? "Mostrar buscador" : "Ocultar buscador"} />
            </Field>

            <Field label="Título de la sección de productos">
              <input className="form-input" value={tc.products_section_title || ""}
                onChange={e => setTheme("products_section_title", e.target.value)}
                placeholder="Todos los productos" />
            </Field>

            <Field label="Redondeo de botones" hint={`${tc.btn_radius ?? 8}px`}>
              <div className="pe-range-row">
                <input
                  type="range"
                  min={0}
                  max={28}
                  step={1}
                  value={tc.btn_radius ?? 8}
                  onChange={e => setButtonRadius(e.target.value)}
                />
                <span>{tc.btn_radius ?? 8}px</span>
              </div>
              <div className="pe-button-preview">
                <button type="button" style={{ borderRadius: `${tc.btn_radius ?? 8}px` }}>Agregar</button>
                <button type="button" style={{ borderRadius: `${tc.btn_radius ?? 8}px` }}>Ver más</button>
              </div>
            </Field>

            {categories.length > 0 && (
              <Field label="Categorías visibles" hint="Si no elegís ninguna, se muestran todas.">
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
            <div className="pe-section-note">
              <strong>Diseño de la tienda</strong>
              <span>Elegí un estilo base y ajustá lo importante. Todo impacta en la vista previa al instante.</span>
            </div>

            <div className="pe-divider-title">Estilo rápido</div>

            <div className="pe-style-presets">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="pe-style-preset"
                  onClick={() => applyStylePreset(preset)}
                  title={`Aplicar estilo ${preset.name}`}
                >
                  <span className="pe-style-preset__colors">
                    <i style={{ background: preset.banner_color }} />
                    <i style={{ background: preset.color_bg }} />
                    <i style={{ background: preset.theme_config.footer_bg }} />
                  </span>
                  <strong>{preset.name}</strong>
                  <small>{preset.desc}</small>
                </button>
              ))}
            </div>

            <div className="pe-live-style-preview" aria-label="Vista previa de diseño">
              <div
                className={`pe-live-style-preview__hero is-${tc.hero_layout || "center"}`}
                style={{
                  background: form.banner_color || "#5b52f0",
                  color: "#ffffff",
                }}
              >
                <span className="pe-preview-label">Portada + botones</span>
                <strong>{form.hero_headline || form.store_name || "Tu tienda"}</strong>
                <p>{form.tagline || "Tu subtítulo aparece acá"}</p>
                <button
                  type="button"
                  style={{
                    background: form.banner_color || "#5b52f0",
                    borderRadius: `${tc.hero_btn_radius ?? 99}px`,
                  }}
                >
                  {tc.hero_btn_text || "Ver productos"}
                </button>
              </div>

              <div
                className={`pe-live-style-preview__body is-${tc.card_style || "default"} is-${tc.card_density || "normal"}`}
                style={{
                  background: form.color_bg || "#fafafa",
                  color: form.color_text || "#111111",
                }}
              >
                <span className="pe-preview-label">Productos</span>
                <div
                  className="pe-preview-product-card"
                  style={{
                    borderRadius: `${form.card_border_radius ?? 16}px`,
                    boxShadow: form.card_show_shadow ? "0 14px 32px rgba(15,23,42,.12)" : "none",
                  }}
                >
                  <div className="pe-preview-product-card__image" />
                  <strong>Producto de ejemplo</strong>
                  <p>Así se ve una tarjeta en tu tienda.</p>
                  <small style={{ color: form.banner_color || "#5b52f0" }}>$24.900</small>
                  <button
                    type="button"
                    style={{
                      background: form.banner_color || "#5b52f0",
                      borderRadius: `${tc.btn_radius ?? 14}px`,
                    }}
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div
                className="pe-live-style-preview__footer"
                style={{
                  background: tc.footer_bg || "#0a0f09",
                  color: tc.footer_text_color || "#ffffff",
                }}
              >
                <span className="pe-preview-label">Footer</span>
                <strong>{tc.footer_tagline || "Envíos a todo el país · Atención personalizada"}</strong>
              </div>
            </div>

            <div className="pe-divider-title">Colores</div>

            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Color de marca</strong>
                <span>Cambia portada, botones, links, precios destacados y acentos.</span>
              </div>
              <ColorRow value={form.banner_color || "#5b52f0"} onChange={v => set("banner_color", v)} />
            </div>

            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Fondo general</strong>
                <span>Cambia el fondo de la tienda, detrás de productos y secciones.</span>
              </div>
              <ColorRow value={form.color_bg || "#fafafa"}
                onChange={v => set("color_bg", v)}
                onClear={() => set("color_bg", "")} />
            </div>

            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Texto principal</strong>
                <span>Cambia títulos, descripciones y textos principales.</span>
              </div>
              <ColorRow value={form.color_text || "#111111"}
                onChange={v => set("color_text", v)}
                onClear={() => set("color_text", "")} />
            </div>

            <div className="pe-divider-title">Forma y estructura</div>

            <Field label="Estilo de portada" hint="Define cómo se acomoda el texto principal.">
              <div className="pe-choice-grid pe-choice-grid--2">
                {[
                  { value: "center", label: "Centrada", desc: "Más simple y directa" },
                  { value: "left", label: "Izquierda", desc: "Más tipo marca premium" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`pe-choice-card ${(tc.hero_layout || "center") === item.value ? "is-active" : ""}`}
                    onClick={() => setTheme("hero_layout", item.value)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Estilo de botones" hint="Cambia botones de portada y catálogo.">
              <div className="pe-choice-grid pe-choice-grid--3">
                {[
                  { value: "square", label: "Rectos" },
                  { value: "soft", label: "Suaves" },
                  { value: "round", label: "Redondos" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`pe-choice-card ${(tc.button_style || "soft") === item.value ? "is-active" : ""}`}
                    onClick={() => setButtonStyle(item.value)}
                  >
                    <strong>{item.label}</strong>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Tarjetas de producto" hint="Cambia la estética de las cards del catálogo.">
              <div className="pe-choice-grid pe-choice-grid--2">
                {[
                  { value: "default", label: "Clásicas", desc: "Equilibradas" },
                  { value: "minimal", label: "Minimal", desc: "Más limpias" },
                  { value: "bordered", label: "Con borde", desc: "Más ordenadas" },
                  { value: "floating", label: "Flotantes", desc: "Más premium" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`pe-choice-card ${(tc.card_style || "default") === item.value ? "is-active" : ""}`}
                    onClick={() => setTheme("card_style", item.value)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Espaciado" hint="Define si la tienda se siente compacta o más aireada.">
              <div className="pe-choice-grid pe-choice-grid--3">
                {[
                  { value: "compact", label: "Compacto" },
                  { value: "normal", label: "Normal" },
                  { value: "wide", label: "Amplio" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`pe-choice-card ${(tc.card_density || "normal") === item.value ? "is-active" : ""}`}
                    onClick={() => setDensity(item.value)}
                  >
                    <strong>{item.label}</strong>
                  </button>
                ))}
              </div>
            </Field>

            <div className="pe-divider-title">Footer</div>

            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Fondo del footer</strong>
                <span>Cambia el bloque final de la tienda.</span>
              </div>
              <ColorRow value={tc.footer_bg || "#0a0f09"}
                onChange={v => setTheme("footer_bg", v)}
                onClear={() => setTheme("footer_bg", "")} />
            </div>

            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Texto del footer</strong>
                <span>Cambia la frase y los textos del pie de página.</span>
              </div>
              <ColorRow value={tc.footer_text_color || "#ffffff"}
                onChange={v => setTheme("footer_text_color", v)}
                onClear={() => setTheme("footer_text_color", "")} />
            </div>

            <Field label="Frase del footer">
              <input className="form-input" value={tc.footer_tagline || ""}
                onChange={e => setTheme("footer_tagline", e.target.value)}
                placeholder="Envíos a todo el país · Atención personalizada" />
            </Field>

            <div className="pe-divider-title">Ayudas visuales</div>

            <Field label="Badges de confianza">
              <Toggle checked={tc.show_trust_badges !== false}
                onChange={v => setTheme("show_trust_badges", v)}
                label={tc.show_trust_badges !== false ? "Visibles" : "Ocultos"} />
            </Field>

            <Field label="Barra de búsqueda">
              <Toggle checked={tc.show_search_bar !== false}
                onChange={v => setTheme("show_search_bar", v)}
                label={tc.show_search_bar !== false ? "Visible" : "Oculta"} />
            </Field>

            <div className="pe-reset-design">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => applyStylePreset(STYLE_PRESETS[0])}
              >
                Volver al estilo recomendado
              </button>
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
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
