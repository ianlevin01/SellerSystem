// src/pages/Pages.jsx
// Mis tiendas premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import "../styles/Pages.css";
import {
  ArrowRight,
  BadgeCheck,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Palette,
  Percent,
  Plus,
  Search,
  Settings,
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
    pct_markup: 0,
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
      store_name: prev.store_name || value,
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
        page_name: form.page_name.trim(),
        store_name: (form.store_name || form.page_name).trim(),
        slug: form.slug.trim(),
        pct_markup: Number(form.pct_markup),
      });

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
                <Percent size={17} />
                Recargo general
                <strong>{form.pct_markup}%</strong>
              </span>
              <input
                type="range"
                min="0"
                max="200"
                step="0.5"
                value={form.pct_markup}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pct_markup: e.target.value }))
                }
              />
              <small>Podés cambiarlo después por producto o desde la configuración.</small>
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

  const navigate = useNavigate();

  useEffect(() => {
    client
      .get("/seller/store/pages")
      .then((res) => setPages(res.data))
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

  const avgMarkup = useMemo(() => {
    if (!pages.length) return 0;

    const total = pages.reduce((sum, page) => sum + Number(page.pct_markup || 0), 0);
    return total / pages.length;
  }, [pages]);

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
          onClick={() => setShowNew(true)}
        >
          <Plus size={18} />
          Nueva tienda
        </button>
      </section>

      <section className="vtz-pages-stats">
        <article>
          <Store size={23} />
          <span>Tiendas creadas</span>
          <strong>{pages.length}</strong>
        </article>

        <article>
          <Percent size={23} />
          <span>Recargo promedio</span>
          <strong>{avgMarkup.toFixed(1)}%</strong>
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
                      <Percent size={15} />
                      {page.pct_markup ?? 0}% de recargo
                    </span>
                    <span>
                      <Palette size={15} />
                      {page.banner_color || "#57d625"}
                    </span>
                  </div>
                </div>

                <div className="vtz-page-card__actions">
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
            navigate(`/pages/${page.id}`);
          }}
        />
      )}
    </main>
  );
}
