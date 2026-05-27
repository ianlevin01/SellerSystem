import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import { trackEvent } from "../utils/pixel";
import {
  AlertTriangle, Building2, ChevronLeft,
  ExternalLink, FileText, Globe, Image as ImageIcon, LayoutGrid, Layers,
  Loader2, Monitor, MousePointerClick, Package, Palette, PanelBottom, Pencil, Percent, Plus,
  RefreshCw, Save, Share2, Smartphone, Star, Tag, TrendingDown, Trash2, Truck, Upload, X, Zap,
} from "lucide-react";
import PageProducts from "./PageProducts";

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
function slugify(str) {
  return String(str || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function storeUrl(slug, edit = false) {
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    const url = `${base}?shop=${slug}`;
    return edit ? `${url}&__edit=1` : url;
  }
  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  const url = `https://${slug}.${domain}`;
  return edit ? `${url}?__edit=1` : url;
}

function productUrl(slug, productId, type = "product") {
  const path = type === "combo" ? `/combo/${productId}` : `/product/${productId}`;
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}${path}?shop=${slug}&__edit=1`;
  }
  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}${path}?__edit=1`;
}

function assetPreviewSrc(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Mostrar solo URLs reales. Si quedó un valor viejo como "177.jpg",
  // no lo renderizamos porque el navegador lo busca local y tira 404.
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  return "";
}

function cleanAssetForSave(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // URLs firmadas o externas: se mandan a la API, que las normaliza a key.
  if (/^https?:\/\//i.test(raw)) return raw;

  // Si ya fuese una key estable de S3 tipo sellers/... la conservamos.
  if (raw.includes("/")) return raw;

  // Valores viejos/rotos tipo 1778527996737.jpg se limpian sin tocar BD manualmente.
  return "";
}

// ── Shared helpers ────────────────────────────────────────────

const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Raleway", "Nunito", "Playfair Display", "Merriweather", "Source Sans 3",
  "Ubuntu", "PT Sans", "Josefin Sans", "Quicksand",
];

function Field({ label, hint, fieldId, highlighted, children }) {
  return (
    <div className={`pe-field${highlighted ? " pe-field--highlighted" : ""}`} id={fieldId}>
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
  { id: "identidad", label: "Identidad", Icon: Building2  },
  { id: "tema",      label: "Tema",      Icon: Palette    },
  { id: "cabecera",  label: "Cabecera",  Icon: Layers     },
  { id: "portada",   label: "Portada",   Icon: ImageIcon  },
  { id: "catalogo",  label: "Catálogo",  Icon: LayoutGrid },
  { id: "producto",  label: "Producto",  Icon: Package    },
  { id: "pie",       label: "Pie",       Icon: PanelBottom},
  { id: "seo",       label: "SEO",       Icon: Globe      },
];

// ── ConfigTab ─────────────────────────────────────────────────

function ConfigTab({ pageId }) {
  const iframeRef     = useRef(null);
  const logoRef       = useRef(null);
  const heroRef       = useRef(null);
  const faviconRef    = useRef(null);
  const ogImageRef    = useRef(null);
  const slugRef       = useRef("");
  const [previewMode,      setPreviewMode]      = useState("desktop");
  const [iframeSrc,        setIframeSrc]        = useState("");
  const [iframeKey,        setIframeKey]        = useState(0);
  const [uploadingLogo,    setUploadingLogo]    = useState(false);
  const [uploadingHero,    setUploadingHero]    = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [highlightedField, setHighlightedField] = useState(null);

  const DEFAULT_THEME = {
    hero_bg_type: "color", hero_overlay_opacity: 50,
    hero_wave_shape: "wave", hero_bg_pattern: "circles",
    hero_btn_text: "Ver productos", hero_layout: "center", hero_btn_radius: 99,
    products_cols: 3, products_section_title: "",
    card_style: "default", card_gap: "normal",
    card_density: "normal", btn_radius: 14, button_style: "soft",
    show_trust_badges: true, show_search_bar: true, show_discount_on_cards: true,
    footer_bg: "", footer_text_color: "", footer_tagline: "",
    navbar_style: "default", navbar_sticky: true,
    navbar_show_categories: false,
    category_display: "pills",
    product_detail_style: "standard",
    product_btn_text: "",
    product_show_reviews: true,
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
    favicon_url: "", og_image_url: "", meta_title: "", meta_description: "",
    tiktok: "", youtube: "",
  });
  const [categories, setCategories] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [section,  setSection]  = useState("identidad");

  function goToSection(id) {
    setSection(id);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "ventaz_scroll_to", section: id }, "*"
    );
  }

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
      favicon_url:         d.favicon_url          || "",
      og_image_url:        d.og_image_url         || "",
      meta_title:          d.meta_title           || "",
      meta_description:    d.meta_description     || "",
      tiktok:              d.tiktok               || "",
      youtube:             d.youtube              || "",
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
      if (pageRes.data.slug) setIframeSrc(storeUrl(pageRes.data.slug, true));
    }).finally(() => setLoading(false));
  }, [pageId]);

  // Sync CSS variables to the preview iframe in real time
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframeSrc) return;
    iframe.contentWindow.postMessage({ type: "ventaz_preview", payload: { ...form, __preview_section: section } }, "*");
  }, [form, iframeSrc]);

  // Keep slugRef current so the message handler can build product URLs without stale closures
  useEffect(() => { slugRef.current = form.slug; }, [form.slug]);

  // Bidirectional bridge: store → editor (click on element navigates to its section)
  const FIELD_TO_SECTION = {
    navbar:         "cabecera",
    logo:           "identidad",
    hero:           "portada",
    promo_bar:      "cabecera",
    products:       "catalogo",
    categories:     "catalogo",
    footer:         "pie",
    product_detail: "producto",
  };

  useEffect(() => {
    function handler(e) {
      if (e.data?.type === "ventaz_field_click") {
        const target = FIELD_TO_SECTION[e.data.field];
        if (target) {
          setSection(target);
          setHighlightedField(e.data.field);
          setTimeout(() => setHighlightedField(null), 2000);
        }
      } else if (e.data?.type === "ventaz_product_enter") {
        const { productId, productType } = e.data;
        setSection("producto");
        setIframeSrc(productUrl(slugRef.current, productId, productType));
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function inferPreviewTarget(key, scope = "field") {
    if (scope === "theme") {
      if (String(key).startsWith("footer_")) return "footer";
      if (String(key).startsWith("hero_") || key === "show_trust_badges") return "hero";
      if (["navbar_style", "navbar_sticky"].includes(key)) return "header";
      if (["card_style", "card_density", "card_gap", "products_cols", "show_search_bar",
           "button_style", "btn_radius", "category_display", "show_discount_on_cards"].includes(key)) return "products";
      return section === "diseno" ? "products" : section;
    }

    if (["hero_headline", "hero_image_url", "tagline", "banner_color"].includes(key)) return "hero";
    if (["color_bg", "color_text", "card_border_radius", "card_show_shadow"].includes(key)) return "products";
    if (["store_name", "logo_url"].includes(key)) return "header";
    return section === "diseno" ? "products" : section;
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
        card_gap: "normal",
        btn_radius: 18,
        hero_btn_radius: 99,
        hero_layout: "center",
        products_cols: 3,
        footer_bg: "#1f1308",
        footer_text_color: "#fff7ed",
        button_style: "round",
        navbar_style: "default",
      },
    },
    {
      id: "editorial",
      name: "Editorial",
      desc: "Minimalista y fuerte, tipo Zara.",
      banner_color: "#111111",
      color_bg: "#ffffff",
      color_text: "#111111",
      theme_config: {
        card_style: "minimal",
        card_density: "normal",
        card_gap: "none",
        btn_radius: 0,
        hero_btn_radius: 0,
        hero_layout: "left",
        products_cols: 3,
        footer_bg: "#111111",
        footer_text_color: "#ffffff",
        footer_tagline: "",
        button_style: "square",
        navbar_style: "default",
        navbar_sticky: true,
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

  const handleLogoUpload    = handleAssetUpload("/seller/images/logo",           "logo_url",       setUploadingLogo,    logoRef);
  const handleHeroUpload    = handleAssetUpload("/seller/images/asset/hero",     "hero_image_url", setUploadingHero,    heroRef);
  const handleFaviconUpload = handleAssetUpload("/seller/images/asset/favicon",  "favicon_url",    setUploadingFavicon, faviconRef);
  const handleOgImageUpload = handleAssetUpload("/seller/images/asset/og_image", "og_image_url",   setUploadingOgImage, ogImageRef);

  async function handleSave() {
    setError(""); setSaving(true); setSaved(false);
    try {
      const payload = {
        ...form,
        logo_url:       cleanAssetForSave(form.logo_url),
        hero_image_url: cleanAssetForSave(form.hero_image_url),
        favicon_url:    cleanAssetForSave(form.favicon_url),
        og_image_url:   cleanAssetForSave(form.og_image_url),
      };

      const res = await client.put(`/seller/store/pages/${pageId}`, payload);
      formFromData(res.data);
      if (res.data.slug) setIframeSrc(storeUrl(res.data.slug, true));
      trackEvent("Personalizacion_Diseno", { section });
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
    { id: "identidad", label: "Identidad" },
    { id: "tema",      label: "Tema"      },
    { id: "cabecera",  label: "Cabecera"  },
    { id: "portada",   label: "Portada"   },
    { id: "catalogo",  label: "Catálogo"  },
    { id: "producto",  label: "Producto"  },
    { id: "pie",       label: "Pie"       },
    { id: "seo",       label: "SEO"       },
  ];

  const isOnProductPage = iframeSrc.includes("/product/") || iframeSrc.includes("/combo/");

  return (
    <div className="pe-editor">

      {/* ── Body: section nav + left fields + right preview ─────── */}
      <div className="pe-editor__body">

      {/* ── Vertical section nav ────────────────────────────────── */}
      <div className="pe-editor__section-nav" data-tour="page-tabs">
        {CONFIG_SECTIONS.map(({ id, label, Icon }) => (
          <button key={id} type="button"
            className={`pe-editor__section-btn ${section === id ? "is-active" : ""}`}
            onClick={() => goToSection(id)}
            title={label}>
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Left panel ──────────────────────────────────────────── */}
      <div className="pe-editor__left">

        {/* Scrollable fields */}
        <div className="pe-editor__fields">

          {/* ── Identidad ──────────────────────────────── */}
          {section === "identidad" && <>
            <Field label="Nombre de la tienda" hint="Aparece en el navbar y en toda la tienda"
              highlighted={highlightedField === "logo"}>
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
            <Field label="Logo de la tienda" hint="PNG, JPG, SVG o WEBP · máx. 2 MB"
              highlighted={highlightedField === "logo"}>
              {form.logo_url && (
                <img src={assetPreviewSrc(form.logo_url)} alt="logo"
                  style={{ marginBottom: 8, height: 52, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)", background: "#fff", padding: 4 }}
                  onError={e => { e.target.style.display = "none"; }} />
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" className="btn btn--ghost btn--sm"
                  onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                  {uploadingLogo ? "Subiendo..." : "Subir logo"}
                </button>
                {form.logo_url && (
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => set("logo_url", "")}>
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </div>
              <input ref={logoRef} type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                style={{ display: "none" }} onChange={handleLogoUpload} />
            </Field>
            <Field label="Favicon" hint="Ícono de la pestaña del navegador · ICO, PNG · máx. 2 MB">
              {form.favicon_url && (
                <img src={assetPreviewSrc(form.favicon_url)} alt="favicon"
                  style={{ marginBottom: 8, height: 32, width: 32, objectFit: "contain", borderRadius: 4, border: "1px solid var(--border)", background: "#fff", padding: 2 }}
                  onError={e => { e.target.style.display = "none"; }} />
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" className="btn btn--ghost btn--sm"
                  onClick={() => faviconRef.current?.click()} disabled={uploadingFavicon}>
                  {uploadingFavicon ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                  {uploadingFavicon ? "Subiendo..." : "Subir favicon"}
                </button>
                {form.favicon_url && (
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => set("favicon_url", "")}>
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </div>
              <input ref={faviconRef} type="file"
                accept="image/x-icon,image/png,image/jpeg,image/webp"
                style={{ display: "none" }} onChange={handleFaviconUpload} />
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
            <Field label="Descripción" hint="Footer y SEO">
              <textarea className="form-textarea" value={form.store_description}
                onChange={e => set("store_description", e.target.value)}
                placeholder="Los mejores productos..." rows={2} />
            </Field>
          </>}

          {/* ── Tema ────────────────────────────────────── */}
          {section === "tema" && <>
            <div className="pe-section-note">
              <strong>Apariencia global</strong>
              <span>Elegí un estilo base o personalizá cada detalle. Cambia todo en tiempo real.</span>
            </div>

            <div className="pe-divider-title">Estilo rápido</div>
            <div className="pe-style-presets">
              {STYLE_PRESETS.map((preset) => (
                <button key={preset.id} type="button"
                  className="pe-style-preset"
                  onClick={() => applyStylePreset(preset)}
                  title={`Aplicar estilo ${preset.name}`}>
                  <span className="pe-style-preset__colors">
                    <i style={{ background: preset.banner_color }} />
                    <i style={{ background: preset.color_bg }} />
                    <i style={{ background: preset.theme_config.footer_bg || "#111" }} />
                  </span>
                  <strong>{preset.name}</strong>
                  <small>{preset.desc}</small>
                </button>
              ))}
            </div>

            <div className="pe-divider-title">Colores</div>

            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Color de marca</strong>
                <span>Portada, botones, precios destacados y acentos.</span>
              </div>
              <ColorRow value={form.banner_color || "#5b52f0"} onChange={v => set("banner_color", v)} />
            </div>
            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Fondo general</strong>
                <span>Fondo de la tienda y secciones.</span>
              </div>
              <ColorRow value={form.color_bg || "#fafafa"}
                onChange={v => set("color_bg", v)}
                onClear={() => set("color_bg", "")} />
            </div>
            <div className="pe-style-control">
              <div className="pe-style-control__head">
                <strong>Texto principal</strong>
                <span>Títulos, precios y descripciones.</span>
              </div>
              <ColorRow value={form.color_text || "#111111"}
                onChange={v => set("color_text", v)}
                onClear={() => set("color_text", "")} />
            </div>

            <div className="pe-divider-title">Botones y forma</div>

            <Field label="Estilo de botones">
              <div className="pe-choice-grid pe-choice-grid--3">
                {[
                  { value: "square", label: "Rectos",   desc: "Sin redondeo" },
                  { value: "soft",   label: "Suaves",   desc: "Redondeados" },
                  { value: "round",  label: "Redondos", desc: "Totalmente redondos" },
                ].map(item => (
                  <button key={item.value} type="button"
                    className={`pe-choice-card ${(tc.button_style || "soft") === item.value ? "is-active" : ""}`}
                    onClick={() => setButtonStyle(item.value)}>
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Espaciado general">
              <div className="pe-choice-grid pe-choice-grid--3">
                {[
                  { value: "compact", label: "Compacto" },
                  { value: "normal",  label: "Normal"   },
                  { value: "wide",    label: "Amplio"   },
                ].map(item => (
                  <button key={item.value} type="button"
                    className={`pe-choice-card ${(tc.card_density || "normal") === item.value ? "is-active" : ""}`}
                    onClick={() => setDensity(item.value)}>
                    <strong>{item.label}</strong>
                  </button>
                ))}
              </div>
            </Field>

            <div className="pe-reset-design">
              <button type="button" className="btn btn--ghost btn--sm"
                onClick={() => applyStylePreset(STYLE_PRESETS[0])}>
                Volver al estilo recomendado
              </button>
            </div>
          </>}

          {/* ── Cabecera ────────────────────────────────── */}
          {section === "cabecera" && <>
            <Field label="Estilo del navbar" highlighted={highlightedField === "navbar"}>
              <div className="pe-option-grid pe-option-grid--3">
                {[
                  { value: "default",     label: "Clásico",      desc: "Fondo claro." },
                  { value: "transparent", label: "Transparente", desc: "Sobre la portada." },
                  { value: "dark",        label: "Oscuro",       desc: "Fondo oscuro." },
                ].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    className={optionClass((tc.navbar_style || "default") === value)}
                    onClick={() => setTheme("navbar_style", value)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Navbar al hacer scroll">
              <Toggle checked={tc.navbar_sticky !== false}
                onChange={v => setTheme("navbar_sticky", v)}
                label={tc.navbar_sticky !== false ? "Fijo (siempre visible)" : "Estático"} />
            </Field>
            <Field label="Mostrar categorías en el navbar">
              <Toggle checked={!!tc.navbar_show_categories}
                onChange={v => setTheme("navbar_show_categories", v)}
                label={tc.navbar_show_categories ? "Activado" : "Desactivado"} />
              <p style={{ fontSize: ".77rem", color: "var(--text-tertiary)", marginTop: 4 }}>Muestra las categorías del catálogo como links en el navbar.</p>
            </Field>

            <div className="pe-divider-title">Barra de promoción</div>

            <Field label="Barra de promoción" highlighted={highlightedField === "promo_bar"}>
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

          {/* ── Portada ─────────────────────────────────── */}
          {section === "portada" && <>
            <Field label="Tipo de fondo" highlighted={highlightedField === "hero"}>
              <div className="pe-option-grid pe-option-grid--2">
                {[
                  { val: "color", label: "Color de marca", desc: "Usa el color configurado en Tema." },
                  { val: "image", label: "Foto de fondo",  desc: "Subís una imagen para el hero." },
                ].map(({ val, label, desc }) => (
                  <button key={val} type="button"
                    className={optionClass((tc.hero_bg_type || "color") === val)}
                    onClick={() => setTheme("hero_bg_type", val)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            {tc.hero_bg_type === "image" ? (<>
              <Field label="Imagen de fondo" hint="PNG, JPG o WEBP · máx. 2 MB">
                {form.hero_image_url && (
                  <img src={assetPreviewSrc(form.hero_image_url)} alt="hero preview"
                    style={{ marginBottom: 8, width: "100%", maxHeight: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => heroRef.current?.click()} disabled={uploadingHero}>
                    {uploadingHero ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                    {uploadingHero ? "Subiendo..." : "Subir imagen"}
                  </button>
                  {form.hero_image_url && (
                    <button type="button" className="btn btn--ghost btn--sm"
                      onClick={() => set("hero_image_url", "")}>
                      <Trash2 size={13} /> Quitar
                    </button>
                  )}
                </div>
                <input ref={heroRef} type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: "none" }} onChange={handleHeroUpload} />
              </Field>
              <Field label="Oscuridad del overlay" hint={`${tc.hero_overlay_opacity ?? 50}%`}>
                <input type="range" min={0} max={90} step={5}
                  value={tc.hero_overlay_opacity ?? 50}
                  onChange={e => setTheme("hero_overlay_opacity", Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--brand)" }} />
              </Field>
            </>) : (
              <div className="pe-info-box">
                <strong>La portada usa el color de marca.</strong>
                <span>Cambialo en la pestaña Tema → Color de marca.</span>
              </div>
            )}

            <Field label="Alineación del contenido">
              <div className="pe-option-grid pe-option-grid--2">
                {[
                  { value: "center", label: "Centrada",  desc: "Texto al centro." },
                  { value: "left",   label: "Izquierda", desc: "Tipo marca premium." },
                ].map(item => (
                  <button key={item.value} type="button"
                    className={optionClass((tc.hero_layout || "center") === item.value)}
                    onClick={() => setTheme("hero_layout", item.value)}>
                    <strong>{item.label}</strong><span>{item.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Título principal">
              <input className="form-input" value={form.hero_headline}
                onChange={e => set("hero_headline", e.target.value)}
                placeholder="Ej: Todo lo que necesitás" />
            </Field>

            <Field label="Tagline" hint="Subtítulo debajo del título">
              <input className="form-input" value={form.tagline}
                onChange={e => set("tagline", e.target.value)}
                placeholder="Envíos a todo el país, pagá con MercadoPago" maxLength={160} />
            </Field>

            <Field label="Texto del botón">
              <input className="form-input" value={tc.hero_btn_text || ""}
                onChange={e => setTheme("hero_btn_text", e.target.value)}
                placeholder="Ver productos" />
            </Field>

            <Field label="Badges de confianza">
              <Toggle checked={tc.show_trust_badges !== false}
                onChange={v => setTheme("show_trust_badges", v)}
                label={tc.show_trust_badges !== false ? "Visibles" : "Ocultos"} />
            </Field>

            <Field label="Forma del separador inferior">
              <div className="pe-option-grid pe-option-grid--2">
                {[
                  { value: "wave",     label: "Ola",       desc: "Transición suave." },
                  { value: "straight", label: "Recto",     desc: "Borde limpio." },
                  { value: "diagonal", label: "Diagonal",  desc: "Corte inclinado." },
                  { value: "double",   label: "Doble ola", desc: "Más dinamismo." },
                ].map(item => (
                  <button key={item.value} type="button"
                    className={optionClass((tc.hero_wave_shape || "wave") === item.value)}
                    onClick={() => setTheme("hero_wave_shape", item.value)}>
                    <strong>{item.label}</strong><span>{item.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            {tc.hero_bg_type !== "image" && (
              <Field label="Patrón de fondo">
                <div className="pe-option-grid pe-option-grid--2">
                  {[
                    { value: "circles",   label: "Círculos",   desc: "Formas redondeadas flotantes." },
                    { value: "bubbles",   label: "Burbujas",   desc: "Burbujeo sutil." },
                    { value: "gradient",  label: "Gradiente",  desc: "Resplandor suave." },
                    { value: "geometric", label: "Geométrico", desc: "Polígonos angulares." },
                  ].map(item => (
                    <button key={item.value} type="button"
                      className={optionClass((tc.hero_bg_pattern || "circles") === item.value)}
                      onClick={() => setTheme("hero_bg_pattern", item.value)}>
                      <strong>{item.label}</strong><span>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </>}

          {/* ── Catálogo ────────────────────────────────── */}
          {section === "catalogo" && <>
            <div className="pe-section-note">
              <strong>Grilla y tarjetas</strong>
              <span>Controlá cómo se ven los productos en la tienda.</span>
            </div>

            <Field label="Columnas" hint="En móvil se ajusta automáticamente."
              highlighted={highlightedField === "products"}>
              <div className="pe-option-grid pe-option-grid--3">
                {[2, 3, 4].map(n => (
                  <button key={n} type="button"
                    className={optionClass((tc.products_cols ?? 3) === n)}
                    onClick={() => setTheme("products_cols", n)}>
                    <strong>{n} col.</strong>
                    <span>{n === 2 ? "Grande" : n === 3 ? "Equilibrado" : "Compacto"}</span>
                  </button>
                ))}
              </div>
              <div className="pe-grid-preview" style={{ gridTemplateColumns: `repeat(${tc.products_cols ?? 3}, 1fr)` }}>
                {Array.from({ length: tc.products_cols ?? 3 }, (_, i) => <span key={i} />)}
              </div>
            </Field>

            <Field label="Estilo de tarjeta">
              <div className="pe-option-grid pe-option-grid--2">
                {[
                  { value: "default",  label: "Clásica",   desc: "Con sombra suave." },
                  { value: "minimal",  label: "Minimal",   desc: "Simple y limpia." },
                  { value: "bordered", label: "Con borde", desc: "Más estructurada." },
                  { value: "floating", label: "Flotante",  desc: "Mayor profundidad." },
                ].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    className={optionClass((tc.card_style || "default") === value)}
                    onClick={() => setTheme("card_style", value)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Separación entre productos">
              <div className="pe-option-grid pe-option-grid--3">
                {[
                  { value: "normal", label: "Normal",   desc: "Con espacio." },
                  { value: "tight",  label: "Ajustado", desc: "Poco espacio." },
                  { value: "none",   label: "Sin sep.", desc: "Tipo Zara." },
                ].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    className={optionClass((tc.card_gap || "normal") === value)}
                    onClick={() => setTheme("card_gap", value)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="pe-divider-title">Búsqueda y encabezado</div>

            <Field label="Buscador">
              <Toggle checked={tc.show_search_bar !== false}
                onChange={v => setTheme("show_search_bar", v)}
                label={tc.show_search_bar !== false ? "Visible" : "Oculto"} />
            </Field>

            <Field label="Descuentos en las tarjetas" hint="Muestra tiers disponibles debajo del precio.">
              <Toggle checked={tc.show_discount_on_cards !== false}
                onChange={v => setTheme("show_discount_on_cards", v)}
                label={tc.show_discount_on_cards !== false ? "Visible" : "Oculto"} />
            </Field>

            <Field label="Título de la sección">
              <input className="form-input" value={tc.products_section_title || ""}
                onChange={e => setTheme("products_section_title", e.target.value)}
                placeholder="Todos los productos" />
            </Field>

            <div className="pe-divider-title">Categorías</div>

            <Field label="Cómo se muestran" highlighted={highlightedField === "categories"}>
              <div className="pe-option-grid pe-option-grid--3">
                {[
                  { value: "pills",  label: "Pastillas", desc: "Filtros en fila." },
                  { value: "grid",   label: "Grilla",    desc: "Cards grandes." },
                  { value: "hidden", label: "Ocultas",   desc: "Sin filtro." },
                ].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    className={optionClass((tc.category_display || "pills") === value)}
                    onClick={() => setTheme("category_display", value)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            {categories.length > 0 && tc.category_display !== "hidden" && (
              <Field label="Categorías visibles" hint="Sin selección = todas visibles.">
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

          {/* ── Producto ────────────────────────────────── */}
          {section === "producto" && <>
            <div className="pe-section-note">
              <strong>Página de producto</strong>
              <span>Doble clic en un producto de la previsualización para ver cómo se ve. Configurá el layout y los textos.</span>
            </div>

            <Field label="Layout">
              <div className="pe-option-grid pe-option-grid--3">
                {[
                  { value: "standard",   label: "Clásico",   desc: "Imagen + info, lado a lado." },
                  { value: "fullscreen", label: "Inmersivo", desc: "Imagen grande arriba, info abajo." },
                  { value: "minimal",    label: "Minimal",   desc: "Columna simple y limpia." },
                ].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    className={optionClass((tc.product_detail_style || "standard") === value)}
                    onClick={() => setTheme("product_detail_style", value)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Texto del botón de compra" hint="Aparece en el botón principal de cada producto">
              <input className="form-input" value={tc.product_btn_text || ""}
                onChange={e => setTheme("product_btn_text", e.target.value)}
                placeholder="Agregar al carrito" maxLength={40} />
            </Field>

            <Field label="Mostrar reseñas de clientes">
              <Toggle checked={tc.product_show_reviews !== false}
                onChange={v => setTheme("product_show_reviews", v)}
                label={tc.product_show_reviews !== false ? "Visibles" : "Ocultas"} />
            </Field>

            {!isOnProductPage && (
              <div className="pe-info-box" style={{ marginTop: 8 }}>
                <strong>Tip:</strong>
                <span>Hacé doble clic en cualquier producto de la previsualización para ver la página de detalle aquí.</span>
              </div>
            )}
          </>}

          {/* ── Pie de página ──────────────────────────── */}
          {section === "pie" && <>
            <div className="pe-style-control">
              <div className="pe-style-control__head"><strong>Fondo del footer</strong></div>
              <ColorRow value={tc.footer_bg || "#0a0f09"}
                onChange={v => setTheme("footer_bg", v)}
                onClear={() => setTheme("footer_bg", "")} />
            </div>
            <div className="pe-style-control">
              <div className="pe-style-control__head"><strong>Texto del footer</strong></div>
              <ColorRow value={tc.footer_text_color || "#ffffff"}
                onChange={v => setTheme("footer_text_color", v)}
                onClear={() => setTheme("footer_text_color", "")} />
            </div>
            <Field label="Frase del footer">
              <input className="form-input" value={tc.footer_tagline || ""}
                onChange={e => setTheme("footer_tagline", e.target.value)}
                placeholder="Envíos a todo el país · Atención personalizada" />
            </Field>
          </>}

          {/* ── SEO & Redes ─────────────────────────────── */}
          {section === "seo" && <>
            <div className="pe-section-note">
              <strong>SEO y redes sociales</strong>
              <span>Mejorá cómo se ve tu tienda en Google y al compartir links.</span>
            </div>

            <div className="pe-divider-title">Meta tags</div>

            <Field label="Título de la página" hint="Pestaña del navegador y Google">
              <input className="form-input" value={form.meta_title}
                onChange={e => set("meta_title", e.target.value)}
                placeholder={form.store_name || "Mi tienda"} maxLength={60} />
              <p style={{ margin: "4px 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                {(form.meta_title || "").length}/60 caracteres
              </p>
            </Field>

            <Field label="Descripción meta" hint="Aparece en resultados de Google">
              <textarea className="form-textarea" value={form.meta_description}
                onChange={e => set("meta_description", e.target.value)}
                placeholder="Describí tu tienda en 1-2 frases" rows={2} maxLength={160} />
              <p style={{ margin: "4px 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                {(form.meta_description || "").length}/160 caracteres
              </p>
            </Field>

            <Field label="Imagen OG" hint="Se muestra al compartir en WhatsApp, redes, etc. · máx. 2 MB">
              {form.og_image_url && (
                <img src={assetPreviewSrc(form.og_image_url)} alt="og preview"
                  style={{ marginBottom: 8, width: "100%", maxHeight: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                  onError={e => { e.target.style.display = "none"; }} />
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" className="btn btn--ghost btn--sm"
                  onClick={() => ogImageRef.current?.click()} disabled={uploadingOgImage}>
                  {uploadingOgImage ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                  {uploadingOgImage ? "Subiendo..." : "Subir imagen"}
                </button>
                {form.og_image_url && (
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => set("og_image_url", "")}>
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </div>
              <input ref={ogImageRef} type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: "none" }} onChange={handleOgImageUpload} />
            </Field>

            <div className="pe-divider-title">Redes sociales y contacto</div>

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
            <Field label="Facebook" hint="URL completa o usuario">
              <input className="form-input" value={form.facebook}
                onChange={e => set("facebook", e.target.value)}
                placeholder="https://facebook.com/mitienda" maxLength={120} />
            </Field>
            <Field label="TikTok" hint="Solo el usuario, sin @">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: ".85rem", color: "var(--text-tertiary)" }}>@</span>
                <input className="form-input" value={form.tiktok}
                  onChange={e => set("tiktok", e.target.value)}
                  placeholder="mitienda" maxLength={60}
                  style={{ paddingLeft: 24 }} />
              </div>
            </Field>
            <Field label="YouTube" hint="URL del canal o usuario">
              <input className="form-input" value={form.youtube}
                onChange={e => set("youtube", e.target.value)}
                placeholder="https://youtube.com/@mitienda" maxLength={120} />
            </Field>
          </>}

        </div>{/* end .pe-editor__fields */}

        {/* Save bar */}
        <div className="pe-editor__save" data-tour="page-save">
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
          {isOnProductPage && form.slug && (
            <button type="button" className="pe-editor__device-btn" title="Volver a la tienda"
              onClick={() => setIframeSrc(storeUrl(form.slug, true))}>
              <ChevronLeft size={14} />
            </button>
          )}
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
          <div className="pe-editor__preview-url">{form.slug ? storeUrl(form.slug) : "Cargando..."}</div>
          <button type="button" className="pe-editor__device-btn"
            onClick={() => setIframeKey(k => k + 1)} title="Recargar">
            <RefreshCw size={13} />
          </button>
          {form.slug && (
            <a href={storeUrl(form.slug)} target="_blank" rel="noreferrer"
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

      </div>{/* end .pe-editor__body */}

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

// ── DiscountCard ──────────────────────────────────────────────

function DiscountCard({ icon: Icon, title, enabled, onToggle, tiersCount, maxPct, onEdit }) {
  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 38, height: 38, borderRadius: "var(--radius-md)",
        background: enabled ? "var(--brand-light)" : "var(--bg-subtle,#f4f6f3)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        transition: "background .2s",
      }}>
        <Icon size={17} color={enabled ? "var(--brand)" : "var(--text-secondary)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: ".9375rem", color: "var(--text-primary)" }}>{title}</div>
        <div style={{ fontSize: ".8rem", color: "var(--text-secondary)", marginTop: 2 }}>
          {tiersCount === 0
            ? "Sin niveles configurados"
            : `${tiersCount} nivel${tiersCount !== 1 ? "es" : ""} · hasta ${maxPct}% off`}
        </div>
      </div>
      <label className="toggle-switch" style={{ flexShrink: 0 }}>
        <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} />
        <span className="toggle-track"><span className="toggle-thumb" /></span>
      </label>
      <button type="button" className="btn btn--secondary btn--sm" style={{ flexShrink: 0 }} onClick={onEdit}>
        <Pencil size={13} /> Editar
      </button>
    </div>
  );
}

// ── DiscountDrawer ────────────────────────────────────────────

function DiscountDrawer({ open, isNew, type: initialType, tiers: initialTiers, enabled: initialEnabled, existingTypes, onClose, onSave }) {
  const [type,    setType]    = useState(initialType || "quantity");
  const [tiers,   setTiers]   = useState(initialTiers || []);
  const [enabled, setEnabled] = useState(initialEnabled ?? true);

  useEffect(() => {
    if (open) {
      setType(initialType || "quantity");
      setTiers(initialTiers ? initialTiers.map(t => ({ ...t })) : []);
      setEnabled(initialEnabled ?? true);
    }
  }, [open, initialType, initialTiers, initialEnabled]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1000, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100dvh", width: "min(480px,100vw)",
        background: "var(--surface,#fff)", boxShadow: "-4px 0 32px rgba(0,0,0,.18)",
        zIndex: 1001, display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: "1.0625rem", flex: 1, color: "var(--text-primary)" }}>
            {isNew ? "Nuevo descuento" : "Editar descuento"}
          </span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 6, borderRadius: "var(--radius-sm)", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)", margin: "0 0 12px" }}>Tipo de descuento</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { val: "quantity", label: "Por cantidad",       desc: "Descuento según unidades compradas",   icon: Tag },
                { val: "price",    label: "Por monto",          desc: "Descuento al superar un total en $",   icon: TrendingDown },
              ].map(({ val, label, desc, icon }) => {
                const TypeIcon      = icon;
                const locked        = !isNew && type !== val;
                const alreadyExists = isNew && existingTypes.includes(val);
                const active        = type === val;
                return (
                  <button key={val} type="button"
                    disabled={locked || alreadyExists}
                    onClick={() => !locked && !alreadyExists && setType(val)}
                    style={{
                      textAlign: "left", padding: "14px 16px",
                      border: `2px solid ${active ? "var(--brand)" : "var(--border)"}`,
                      borderRadius: "var(--radius-md)",
                      background: active ? "var(--brand-light)" : "var(--bg,#fff)",
                      cursor: (locked || alreadyExists) ? "default" : "pointer",
                      opacity: alreadyExists ? .45 : 1, transition: "border-color .15s, background .15s",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <TypeIcon size={14} color={active ? "var(--brand)" : "var(--text-secondary)"} />
                      <span style={{ fontWeight: 600, fontSize: ".875rem", color: active ? "var(--brand)" : "var(--text-primary)" }}>{label}</span>
                    </div>
                    <span style={{ fontSize: ".78rem", color: "var(--text-secondary)", display: "block" }}>{desc}</span>
                    {alreadyExists && <span style={{ fontSize: ".72rem", color: "var(--text-tertiary)", marginTop: 4, display: "block" }}>Ya existe uno</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg-subtle,#f4f6f3)", borderRadius: "var(--radius-md)" }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)", margin: 0 }}>Activo</p>
              <p style={{ fontSize: ".8rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                {enabled ? "Los clientes verán este descuento" : "El descuento está oculto para los clientes"}
              </p>
            </div>
            <label className="toggle-switch" style={{ flexShrink: 0 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
            </label>
          </div>

          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)", margin: "0 0 12px" }}>Niveles de descuento</p>
            <TiersSection type={type} tiers={tiers} onChange={setTiers} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button type="button" className="btn btn--secondary btn--sm" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn--primary btn--sm" style={{ flex: 2 }} onClick={() => onSave({ type, tiers, enabled })}>
            Guardar descuento
          </button>
        </div>
      </div>
    </>
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
  const [drawer,   setDrawer]   = useState(null);

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

  const existingTypes = [
    ...(config.quantity_tiers.length > 0 ? ["quantity"] : []),
    ...(config.price_tiers.length    > 0 ? ["price"]    : []),
  ];

  function openNewDrawer() {
    const availType = !existingTypes.includes("quantity") ? "quantity" : "price";
    setDrawer({ isNew: true, type: availType, tiers: [], enabled: true });
  }

  function openEditDrawer(type) {
    const tiers   = type === "quantity" ? config.quantity_tiers : config.price_tiers;
    const enabled = type === "quantity" ? config.enabled_quantity : config.enabled_price;
    setDrawer({ isNew: false, type, tiers, enabled });
  }

  function handleDrawerSave({ type, tiers, enabled }) {
    if (type === "quantity") {
      setConfig(c => ({ ...c, enabled_quantity: enabled, quantity_tiers: tiers }));
    } else {
      setConfig(c => ({ ...c, enabled_price: enabled, price_tiers: tiers }));
    }
    setDrawer(null);
  }

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
      trackEvent("Personalizacion_Descuentos");
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
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  const discountCards = [
    { type: "quantity", icon: Tag,         title: "Descuento por cantidad",          tiers: config.quantity_tiers, enabled: config.enabled_quantity },
    { type: "price",    icon: TrendingDown, title: "Descuento por monto del carrito", tiers: config.price_tiers,    enabled: config.enabled_price    },
  ].filter(d => d.tiers.length > 0);

  const canCreate = existingTypes.length < 2;

  return (
    <>
      <DiscountDrawer
        open={!!drawer}
        isNew={drawer?.isNew}
        type={drawer?.type}
        tiers={drawer?.tiers}
        enabled={drawer?.enabled}
        existingTypes={existingTypes}
        onClose={() => setDrawer(null)}
        onSave={handleDrawerSave}
      />

      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Descuentos</h3>
              <p style={{ margin: "3px 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
                Configurá descuentos automáticos para tus clientes.
              </p>
            </div>
            {canCreate && discountCards.length > 0 && (
              <button type="button" className="btn btn--primary btn--sm" style={{ flexShrink: 0 }} onClick={openNewDrawer}>
                <Plus size={13} /> Crear descuento
              </button>
            )}
          </div>

          {discountCards.length === 0 ? (
            <div style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius-lg)", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-subtle,#f4f6f3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Tag size={20} color="var(--text-secondary)" />
              </div>
              <p style={{ fontWeight: 600, fontSize: ".9375rem", color: "var(--text-primary)", margin: "0 0 6px" }}>Sin descuentos creados</p>
              <p style={{ fontSize: ".85rem", color: "var(--text-secondary)", margin: "0 0 20px" }}>
                Creá un descuento por cantidad o por monto del carrito.
              </p>
              <button type="button" className="btn btn--primary" onClick={openNewDrawer}>
                <Plus size={14} /> Crear mi primer descuento
              </button>
            </div>
          ) : (
            discountCards.map(d => {
              const maxPct = Math.max(0, ...d.tiers.map(t => Number(t.discount_pct)).filter(v => !isNaN(v)));
              return (
                <DiscountCard
                  key={d.type}
                  icon={d.icon}
                  title={d.title}
                  enabled={d.enabled}
                  onToggle={v => setConfig(c => d.type === "quantity" ? { ...c, enabled_quantity: v } : { ...c, enabled_price: v })}
                  tiersCount={d.tiers.length}
                  maxPct={maxPct.toFixed(0)}
                  onEdit={() => openEditDrawer(d.type)}
                />
              );
            })
          )}

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
                  const draft     = draftAdj[v.id] ?? "";
                  const draftNum  = Number(draft);
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

        {discountCards.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
            {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
            {saved && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
            <button type="submit" disabled={saving || violations.length > 0} className="btn btn--primary btn--lg">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </form>
    </>
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
      trackEvent("Personalizacion_Integraciones", { integration: integration.key, active: newActive });
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
