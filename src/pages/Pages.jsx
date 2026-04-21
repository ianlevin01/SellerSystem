import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { Plus, Trash2, ExternalLink, Settings, Percent, Loader2, X } from "lucide-react";

function storeUrl(slug) {
  if (import.meta.env.DEV) {
    const base = import.meta.env.VITE_STORE_DEV_URL || "http://localhost:5174";
    return `${base}?shop=${slug}`;
  }
  const domain = import.meta.env.VITE_STORE_DOMAIN || "ventaz.com.ar";
  return `https://${slug}.${domain}`;
}

function NewPageModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ page_name: "", slug: "", store_name: "", banner_color: "#5b52f0", pct_markup: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function handleNameChange(e) {
    const v = e.target.value;
    setForm(f => ({
      ...f,
      page_name:  v,
      store_name: f.store_name || v,
      slug:       f.slug || slugify(v),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await client.post("/seller/store/pages", { ...form, pct_markup: Number(form.pct_markup) });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear la tienda");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva tienda</h2>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre de la tienda</label>
            <input className="form-input" value={form.page_name} onChange={handleNameChange}
              placeholder="Ej: Tienda Verano" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Slug (URL única)</label>
            <input className="form-input" value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder="ej: tienda-verano" required />
            <span style={{ fontSize: ".78rem", color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Solo letras minúsculas, números y guiones
            </span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              % de aumento sobre precio base
              <span style={{ float: "right", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{form.pct_markup}%</span>
            </label>
            <input type="range" min={0} max={200} step={0.5}
              value={form.pct_markup} onChange={e => setForm(f => ({ ...f, pct_markup: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Color principal</label>
            <div className="color-picker-row">
              <input type="color" value={form.banner_color}
                onChange={e => setForm(f => ({ ...f, banner_color: e.target.value }))} />
              <span className="color-picker-hex">{form.banner_color}</span>
            </div>
          </div>
          {error && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? <><Loader2 size={14} className="spin" /> Creando…</> : "Crear tienda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Pages() {
  const [pages, setPages]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/seller/store/pages")
      .then(res => setPages(res.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(page) {
    if (!confirm(`¿Eliminar la tienda "${page.page_name || page.store_name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(page.id);
    try {
      await client.delete(`/seller/store/pages/${page.id}`);
      setPages(p => p.filter(x => x.id !== page.id));
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1>Mis tiendas</h1>
            <p>Cada tienda tiene su propio diseño, precios y descuentos.</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowNew(true)} style={{ flexShrink: 0, marginTop: 4 }}>
            <Plus size={15} /> Nueva tienda
          </button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
            Todavía no tenés ninguna tienda configurada.
          </p>
          <button className="btn btn--primary" onClick={() => setShowNew(true)}>
            <Plus size={15} /> Crear mi primera tienda
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pages.map(page => (
            <div key={page.id} className="card pages-card">
              <div className="pages-card__color" style={{ background: page.banner_color || "#5b52f0" }} />
              <div className="pages-card__info">
                <div className="pages-card__name">{page.page_name || page.store_name}</div>
                <div className="pages-card__meta">
                  <span className="pages-card__slug">/{page.slug}</span>
                  <span className="pages-card__markup">{page.pct_markup ?? 0}% de recargo</span>
                </div>
              </div>
              <div className="pages-card__actions">
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => navigate(`/pages/${page.id}`)}
                  title="Configurar tienda"
                >
                  <Settings size={13} /> Configurar
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => navigate(`/pages/${page.id}/discounts`)}
                  title="Descuentos"
                >
                  <Percent size={13} /> Descuentos
                </button>
                <a
                  href={storeUrl(page.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--secondary btn--sm"
                  title="Ver tienda"
                >
                  <ExternalLink size={13} />
                </a>
                {pages.length > 1 && (
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => handleDelete(page)}
                    disabled={deleting === page.id}
                    title="Eliminar"
                  >
                    {deleting === page.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewPageModal
          onClose={() => setShowNew(false)}
          onCreated={page => { setPages(p => [...p, page]); setShowNew(false); navigate(`/pages/${page.id}`); }}
        />
      )}
    </div>
  );
}
