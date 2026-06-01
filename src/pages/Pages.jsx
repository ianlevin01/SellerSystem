// src/pages/Pages.jsx
// Mis tiendas premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";
import { trackEvent } from "../utils/pixel";
import { useAuth } from "../auth/AuthContext";
import "../styles/Pages.css";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  Palette,
  Percent,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Store,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

function storeUrl(slug) {
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}?shop=${slug}`;
  }

  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}`;
}

function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function NewPageModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    page_name: "",
    slug: "",
    store_name: "",
    banner_color: "#57d625",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const ready = form.page_name.trim() && form.slug.trim();

  function handleNameChange(e) {
    const value = e.target.value;

    setForm((prev) => ({
      ...prev,
      page_name: value,
      store_name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));

    if (error) setError("");
  }

  function handleSlugChange(e) {
    setSlugTouched(true);
    setForm((prev) => ({
      ...prev,
      slug: slugify(e.target.value),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!ready) {
      setError("Completá el nombre y el link de la tienda.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const res = await client.post("/seller/store/pages", {
        ...form,
        page_name:  form.page_name.trim(),
        store_name: (form.store_name || form.page_name).trim(),
        slug:       form.slug.trim(),
      });

      trackEvent("Creacion_Tienda");
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear la tienda");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vtz-pages-modal-overlay" onClick={onClose}>
      <section className="vtz-pages-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vtz-pages-modal__close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="vtz-pages-modal__grid">
          <div className="vtz-pages-modal__intro">
            <span className="vtz-pages-kicker">
              <WandSparkles size={16} />
              Nueva tienda
            </span>

            <h2>Creá una tienda para empezar a publicar.</h2>

            <p>
              Cada tienda puede tener su propio link, color, precios y descuentos.
              Después vas a poder configurarla con más detalle.
            </p>

            <div className="vtz-pages-preview" style={{ "--preview-color": form.banner_color }}>
              <div className="vtz-pages-preview__bar" />
              <div className="vtz-pages-preview__body">
                <span>Tienda pública</span>
                <strong>{form.page_name || "Nombre de tu tienda"}</strong>
                <small>
                  {form.slug ? storeUrl(form.slug) : "Elegí un nombre para generar el link"}
                </small>
              </div>
            </div>
          </div>

          <form className="vtz-pages-modal__form" onSubmit={handleSubmit}>
            <label className="vtz-pages-field">
              <span>
                <Store size={17} />
                Nombre de la tienda
              </span>
              <input
                value={form.page_name}
                onChange={handleNameChange}
                placeholder="Ej: Tienda Verano"
                required
              />
            </label>

            <label className="vtz-pages-field">
              <span>Link de la tienda</span>
              <div className="vtz-pages-slug-input">
                <b>/</b>
                <input
                  value={form.slug}
                  onChange={handleSlugChange}
                  placeholder="tienda-verano"
                  required
                />
              </div>
              <small>Solo minúsculas, números y guiones. Este link identifica tu tienda.</small>
            </label>

            <label className="vtz-pages-field">
              <span>
                <Palette size={17} />
                Color principal
              </span>
              <div className="vtz-pages-color-row">
                <input
                  type="color"
                  value={form.banner_color}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, banner_color: e.target.value }))
                  }
                />
                <b>{form.banner_color}</b>
              </div>
            </label>

            {error && <div className="vtz-pages-modal__error">{error}</div>}

            <div className="vtz-pages-modal__actions">
              <button type="button" className="vtz-pages-btn vtz-pages-btn--ghost" onClick={onClose}>
                Cancelar
              </button>

              <button
                type="submit"
                className="vtz-pages-btn vtz-pages-btn--primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="vtz-pages-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    Crear tienda
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function Pages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

  const navigate = useNavigate();
  const { refreshSeller } = useAuth();
  const [searchParams] = useSearchParams();
  // Capturar en el montaje — la URL se limpia al abrir el modal y perdemos el valor
  const [isFirstLogin] = useState(() => searchParams.get("new") === "true");

  useEffect(() => {
    client
      .get("/seller/store/pages")
      .then((res) => {
        setPages(res.data);
        // Primer acceso: abrir modal de creación automáticamente
        if (isFirstLogin && res.data.length === 0) {
          setShowNew(true);
          navigate("/pages", { replace: true }); // limpiar ?new=true de la URL
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return pages;

    return pages.filter((page) => {
      const name = String(page.page_name || page.store_name || "").toLowerCase();
      const slug = String(page.slug || "").toLowerCase();

      return name.includes(query) || slug.includes(query);
    });
  }, [pages, search]);

  async function handleDelete(page) {
    const name = page.page_name || page.store_name || "esta tienda";

    if (!confirm(`¿Eliminar la tienda "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeleting(page.id);

    try {
      await client.delete(`/seller/store/pages/${page.id}`);
      setPages((prev) => prev.filter((item) => item.id !== page.id));
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  async function handleCopy(page) {
    const url = storeUrl(page.slug);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(page.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      window.prompt("Copiá el link de tu tienda:", url);
    }
  }

  if (loading) {
    return (
      <main className="vtz-pages">
        <section className="vtz-pages-hero">
          <div className="vtz-pages-skeleton vtz-pages-skeleton--title" />
          <div className="vtz-pages-skeleton vtz-pages-skeleton--text" />
        </section>

        <div className="vtz-pages-loading">
          {[1, 2, 3].map((item) => (
            <div key={item} className="vtz-pages-skeleton vtz-pages-skeleton--card" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="vtz-pages">
      <section className="vtz-pages-hero">
        <div>
          <span className="vtz-pages-kicker">
            <Sparkles size={16} />
            Mis tiendas
          </span>

          <h1>Creá y gestioná tus tiendas</h1>

          <p>
            Cada tienda tiene su propio link, diseño, precios y descuentos.
            Usalas para vender distintos productos o probar diferentes propuestas.
          </p>
        </div>

        <button
          type="button"
          className="vtz-pages-btn vtz-pages-btn--hero"
          data-tour="new-page-btn"
          onClick={() => setShowNew(true)}
        >
          <Plus size={18} />
          Nueva tienda
        </button>
      </section>

      <section className="vtz-pages-stats" data-tour="pages-stats">
        <article>
          <Store size={23} />
          <span>Tiendas creadas</span>
          <strong>{pages.length}</strong>
        </article>

        <article>
          <BadgeCheck size={23} />
          <span>Links activos</span>
          <strong>{pages.length}</strong>
        </article>
      </section>

      <section className="vtz-pages-toolbar">
        <div className="vtz-pages-search">
          <Search size={16} />
          <input
            placeholder="Buscar por nombre o link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span>
          {filteredPages.length} resultado{filteredPages.length !== 1 ? "s" : ""}
        </span>
      </section>

      {pages.length === 0 ? (
        <section className="vtz-pages-empty">
          <div className="vtz-pages-empty__icon">
            <Store size={34} />
          </div>

          <h2>Creá tu primera tienda</h2>

          <p>
            Tu tienda va a tener un link propio para compartir con clientes.
            Después vas a poder agregar productos, descuentos y diseño.
          </p>

          <button
            type="button"
            className="vtz-pages-btn vtz-pages-btn--primary"
            onClick={() => setShowNew(true)}
          >
            <Plus size={18} />
            Crear mi primera tienda
          </button>
        </section>
      ) : filteredPages.length === 0 ? (
        <section className="vtz-pages-empty">
          <div className="vtz-pages-empty__icon">
            <Search size={34} />
          </div>

          <h2>No encontramos tiendas</h2>
          <p>Probá buscando por otro nombre o limpiá el campo de búsqueda.</p>
        </section>
      ) : (
        <section className="vtz-pages-grid">
          {filteredPages.map((page, index) => {
            const name = page.page_name || page.store_name || "Tienda sin nombre";
            const url = storeUrl(page.slug);

            return (
              <article
                key={page.id}
                className="vtz-page-card"
                data-tour={index === 0 ? "page-card" : undefined}
                style={{
                  "--page-color": page.banner_color || "#57d625",
                  animationDelay: `${index * 40}ms`,
                }}
              >
                <div className="vtz-page-card__top">
                  <div className="vtz-page-card__mark">
                    <Store size={22} />
                  </div>

                  <div className="vtz-page-card__menu">
                    <button
                      type="button"
                      onClick={() => handleCopy(page)}
                      title="Copiar link"
                    >
                      <Copy size={16} />
                    </button>

                    <a href={url} target="_blank" rel="noreferrer" title="Ver tienda">
                      <ExternalLink size={16} />
                    </a>

                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(page)}
                        disabled={deleting === page.id}
                        title="Eliminar tienda"
                      >
                        {deleting === page.id ? (
                          <Loader2 size={16} className="vtz-pages-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="vtz-page-card__body">
                  <h2>{name}</h2>

                  <button
                    type="button"
                    className="vtz-page-card__url"
                    onClick={() => handleCopy(page)}
                  >
                    <span>/{page.slug}</span>
                    <small>{copiedId === page.id ? "Copiado" : "Copiar link"}</small>
                  </button>

                  <div className="vtz-page-card__meta">
                    <span>
                      <Palette size={15} />
                      {page.banner_color || "#57d625"}
                    </span>
                  </div>
                </div>

                <div className="vtz-page-card__actions" data-tour={index === 0 ? "page-card-actions" : undefined}>
                  <button
                    type="button"
                    className="vtz-pages-btn vtz-pages-btn--primary"
                    onClick={() => navigate(`/pages/${page.id}`)}
                  >
                    <Settings size={17} />
                    Configurar
                  </button>

                  <button
                    type="button"
                    className="vtz-pages-btn vtz-pages-btn--secondary"
                    onClick={() => navigate(`/pages/${page.id}/discounts`)}
                  >
                    <Percent size={17} />
                    Descuentos
                  </button>

                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="vtz-pages-btn vtz-pages-btn--secondary"
                  >
                    <Eye size={17} />
                    Ver
                  </a>

                  <button
                    type="button"
                    className="vtz-pages-btn vtz-pages-btn--share"
                    onClick={() => { setShareModal(page); setShareCopied(false); }}
                  >
                    <Share2 size={17} />
                    Compartir
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showNew && (
        <NewPageModal
          onClose={() => setShowNew(false)}
          onCreated={(page) => {
            setPages((prev) => [...prev, page]);
            setShowNew(false);
            if (isFirstLogin) {
              refreshSeller().catch(() => {});
              navigate(`/pages/${page.id}?guide=true`);
            } else {
              navigate(`/pages/${page.id}`);
            }
          }}
        />
      )}

      {shareModal && createPortal(
        <ShareModal
          page={shareModal}
          copied={shareCopied}
          onCopy={(url) => {
            navigator.clipboard.writeText(url).catch(() => {});
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2500);
          }}
          onClose={() => setShareModal(null)}
        />,
        document.body
      )}
    </main>
  );
}

/* ── Modal de compartir ─────────────────────────────────────── */

const SOCIALS = [
  {
    name: "WhatsApp",
    color: "#25D366",
    getHref: (url) => `https://wa.me/?text=${encodeURIComponent(`¡Visitá mi tienda online! 🛍️ ${url}`)}`,
    svg: "M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.38 1.25 4.8L2.05 22l5.43-1.43c1.38.75 2.94 1.17 4.56 1.17 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.52 14.18c-.23.64-1.35 1.22-1.87 1.27-.5.05-1.02.23-3.4-.71-2.86-1.12-4.7-3.99-4.84-4.17-.14-.18-1.12-1.49-1.12-2.84s.71-2.01.96-2.29c.25-.28.55-.35.73-.35l.52.01c.17 0 .4-.07.62.47.23.56.79 1.93.86 2.07.07.14.11.3.02.48-.09.18-.14.29-.27.45-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.8.87-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.87.89.28.14.46.21.53.32.07.12.07.68-.16 1.32z",
  },
  {
    name: "Instagram",
    color: "url(#ig)",
    colorSolid: "#E1306C",
    gradient: { id: "ig", from: "#f09433", via: "#e6683c", mid: "#dc2743", to: "#a12c6c", end: "#515bd4" },
    getHref: null, // copia al portapapeles
    svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    name: "Facebook",
    color: "#1877F2",
    getHref: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    name: "Twitter / X",
    color: "#000",
    getHref: (url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Visitá mi tienda! 🛍️`)}&url=${encodeURIComponent(url)}`,
    svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    name: "Telegram",
    color: "#229ED9",
    getHref: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("¡Visitá mi tienda online! 🛍️")}`,
    svg: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  },
  {
    name: "TikTok",
    color: "#010101",
    getHref: null,
    svg: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z",
  },
];

function ShareModal({ page, copied, onCopy, onClose }) {
  const url = (() => {
    if (import.meta.env.DEV) {
      const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
      return `${base}?shop=${page.slug}`;
    }
    const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
    return `https://${page.slug}.${domain}`;
  })();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)" }}
      />

      {/* Card */}
      <div style={{
        position: "relative",
        background: "#fff",
        borderRadius: 24,
        width: "100%",
        maxWidth: 480,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.06)",
      }}>
        {/* Header con gradiente Ventaz */}
        <div style={{
          background: "linear-gradient(135deg, #4db81a 0%, #3a9a15 100%)",
          padding: "28px 28px 56px",
          position: "relative",
        }}>
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.2)", border: "none", borderRadius: 99, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <X size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Share2 size={22} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.75)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".5px" }}>Compartir tienda</p>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>{page.store_name || page.page_name}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "0 24px 28px", marginTop: -32 }}>
          {/* Link box */}
          <div style={{
            background: "#fff",
            border: "2px solid #e5e7eb",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
            boxShadow: "0 4px 16px rgba(0,0,0,.08)",
          }}>
            <Link2 size={15} color="#9ca3af" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: "#374151", wordBreak: "break-all", fontFamily: "monospace", fontWeight: 500 }}>{url}</span>
            <button
              onClick={() => onCopy(url)}
              style={{
                flexShrink: 0,
                background: copied ? "#4db81a" : "#f3f4f6",
                border: "none",
                borderRadius: 10,
                padding: "7px 14px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: copied ? "#fff" : "#374151",
                transition: "all .2s",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? <><Check size={13} /> ¡Copiado!</> : <><Copy size={13} /> Copiar link</>}
            </button>
          </div>

          {/* Social grid */}
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".8px" }}>Compartir en</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {SOCIALS.map(s => {
              const isInstagram = s.name === "Instagram";
              const isTikTok = s.name === "TikTok";
              const needsCopy = !s.getHref;
              const href = s.getHref ? s.getHref(url) : null;
              const bg = s.color === "url(#ig)" ? "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" : s.color;

              return needsCopy ? (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => onCopy(url)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
                    padding: "14px 8px", cursor: "pointer", transition: "all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#bbf7d0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${s.colorSolid || s.color}44` }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d={s.svg} /></svg>
                  </div>
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, lineHeight: 1.2, textAlign: "center" }}>{s.name}</span>
                </button>
              ) : (
                <a
                  key={s.name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none",
                    background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
                    padding: "14px 8px", transition: "all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#bbf7d0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${s.colorSolid || s.color}44` }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d={s.svg} /></svg>
                  </div>
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, lineHeight: 1.2, textAlign: "center" }}>{s.name}</span>
                </a>
              );
            })}
          </div>

          <p style={{ margin: "16px 0 0", fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
            Instagram y TikTok: usá "Copiar link" y pegalo en tu bio o historia.
          </p>
        </div>
      </div>
    </div>
  );
}
