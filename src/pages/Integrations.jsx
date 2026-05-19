import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../api/client";
import { Loader2, Puzzle, Star, Trash2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────

function StarRating({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13}
          fill={i <= rating ? "var(--brand, #6366f1)" : "none"}
          stroke={i <= rating ? "var(--brand, #6366f1)" : "var(--border, #ccc)"} />
      ))}
    </span>
  );
}

// ── StarAI section ────────────────────────────────────────────

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
    <div>
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
          {generating
            ? <><Loader2 size={14} className="spin" /> Generando...</>
            : <><Star size={14} /> Generar reseñas</>}
        </button>
      </div>

      {msg && (
        <p style={{ fontSize: ".875rem", marginBottom: 12,
          color: msg.startsWith("✓") ? "var(--success, #059669)" : "var(--danger, #ef4444)" }}>
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
            <div key={r.id} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: ".875rem" }}>{r.author_name}</span>
                  <span style={{ marginLeft: 10 }}><StarRating rating={r.rating} /></span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    fontSize: ".72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                    background: r.published ? "var(--success-light,#d1fae5)" : "var(--surface-2,#f3f4f6)",
                    color: r.published ? "var(--success,#059669)" : "var(--text-secondary)",
                  }}>
                    {r.published ? "Publicada" : "Oculta"}
                  </span>
                  <button type="button" className="btn btn--sm btn--ghost"
                    style={{ padding: "4px 10px", fontSize: ".78rem" }}
                    onClick={() => handleToggle(r)}>
                    {r.published ? "Ocultar" : "Publicar"}
                  </button>
                  <button type="button"
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "var(--danger,#ef4444)", display: "flex", padding: 4 }}
                    onClick={() => handleDelete(r.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {r.comment}
              </p>
            </div>
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

// ── Integration card ──────────────────────────────────────────

function IntegrationCard({ integration, pageId, products, onToggle, toggling }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ fontSize: "1.75rem", lineHeight: 1 }}>{integration.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>{integration.name}</span>
            <span style={{
              fontSize: ".72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: integration.activated ? "var(--success-light,#d1fae5)" : "var(--surface-2,#f3f4f6)",
              color: integration.activated ? "var(--success,#059669)" : "var(--text-secondary)",
            }}>
              {integration.activated ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: ".875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {integration.description}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={`btn ${integration.activated ? "btn--ghost" : "btn--primary"} btn--sm`}
              disabled={toggling}
              onClick={() => onToggle(integration)}
            >
              {toggling
                ? <Loader2 size={13} className="spin" />
                : integration.activated ? "Desactivar" : "Activar"}
            </button>
            {integration.activated && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setExpanded(p => !p)}
              >
                {expanded ? "Cerrar configuración" : "Configurar ▾"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* StarAI config */}
      {integration.key === "star_ai" && integration.activated && expanded && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <h4 style={{ margin: "0 0 4px", fontSize: ".9375rem", display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={15} /> Generar reseñas con StarAI
          </h4>
          <p style={{ margin: "0 0 16px", fontSize: ".82rem", color: "var(--text-secondary)" }}>
            Elegí un producto y StarAI crea 5 reseñas que podés publicar en tu tienda.
          </p>
          <StarAISection pageId={pageId} products={products} />
        </div>
      )}

      {/* Meta Pixel config */}
      {integration.key === "meta_pixel" && integration.activated && expanded && (
        <MetaPixelConfig pageId={pageId} initialConfig={integration.config} />
      )}
    </div>
  );
}

function MetaPixelConfig({ pageId, initialConfig }) {
  const [pixelId,     setPixelId]     = useState(initialConfig?.pixel_id || "");
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState("");

  async function save() {
    setSaving(true); setMsg("");
    try {
      await client.put(`/seller/store/pages/${pageId}/integrations/meta_pixel/config`, {
        config: { pixel_id: pixelId.trim() },
      });
      setMsg("✓ Guardado");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
      <h4 style={{ margin: "0 0 4px", fontSize: ".9375rem" }}>Pixel ID</h4>
      <p style={{ margin: "0 0 10px", fontSize: ".82rem", color: "var(--text-secondary)" }}>
        Encontrás tu Pixel ID en Meta Business → Fuentes de datos → Píxeles.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="form-input" value={pixelId}
          onChange={e => setPixelId(e.target.value)}
          placeholder="Ej: 1234567890123456"
          style={{ flex: 1 }} />
        <button type="button" className="btn btn--primary btn--sm"
          onClick={save} disabled={saving || !pixelId.trim()}>
          {saving ? <Loader2 size={13} className="spin" /> : "Guardar"}
        </button>
      </div>
      {msg && (
        <p style={{ margin: "6px 0 0", fontSize: ".82rem",
          color: msg.startsWith("✓") ? "var(--success,#059669)" : "var(--danger,#ef4444)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function Integrations() {
  const [searchParams] = useSearchParams();
  const [pages,        setPages]        = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [integrations, setIntegrations] = useState([]);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [toggling,     setToggling]     = useState({});

  // Load pages
  useEffect(() => {
    client.get("/seller/store/pages").then(r => {
      const list = r.data || [];
      setPages(list);
      const preselect = searchParams.get("pageId");
      if (preselect && list.find(p => p.id === preselect)) {
        setSelectedPage(preselect);
      } else if (list.length === 1) {
        setSelectedPage(list[0].id);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  // Load integrations + products when page changes
  useEffect(() => {
    if (!selectedPage) { setIntegrations([]); setProducts([]); return; }
    setLoading(true);
    Promise.all([
      client.get(`/seller/store/pages/${selectedPage}/integrations`),
      client.get(`/seller/store/pages/${selectedPage}/products`, { params: { only_mine: "true", limit: 200 } }),
    ]).then(([intRes, pRes]) => {
      setIntegrations(intRes.data || []);
      setProducts(pRes.data?.products || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedPage]);

  async function handleToggle(integration) {
    const newActive = !integration.activated;
    setToggling(p => ({ ...p, [integration.key]: true }));
    try {
      await client.post(`/seller/store/pages/${selectedPage}/integrations/${integration.key}/toggle`, { active: newActive });
      setIntegrations(prev => prev.map(i =>
        i.key === integration.key ? { ...i, activated: newActive } : i
      ));
    } catch { /* silencio */ } finally {
      setToggling(p => ({ ...p, [integration.key]: false }));
    }
  }

  return (
    <main style={{ maxWidth: 720 }}>
      {/* Hero */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        padding: "clamp(28px, 4vw, 44px)",
        marginBottom: 28,
        color: "#fff",
        background: "radial-gradient(circle at 14% 22%, rgba(87,214,37,.28), transparent 26rem), radial-gradient(circle at 84% 18%, rgba(87,214,37,.12), transparent 22rem), linear-gradient(135deg, #061006 0%, #09200d 52%, #123816 100%)",
        boxShadow: "0 24px 64px rgba(15,23,42,.16)",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "radial-gradient(circle at center, black 30%, transparent 82%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#b8ff9d", marginBottom: 12 }}>
            <Puzzle size={13} /> Integraciones
          </span>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.9rem, 4vw, 3.2rem)", fontWeight: 800, lineHeight: .95, letterSpacing: "-.05em", color: "#fff" }}>
            Conectá tus herramientas
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.5, maxWidth: 400 }}>
            Activá integraciones externas para potenciar tu tienda y entender mejor a tus clientes.
          </p>
        </div>
      </section>

      {/* Page selector */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <label style={{ fontSize: ".875rem", fontWeight: 600, display: "block", marginBottom: 8 }}>
          Tienda a configurar
        </label>
        <select
          className="form-input"
          value={selectedPage}
          onChange={e => setSelectedPage(e.target.value)}
        >
          <option value="">Seleccioná una tienda...</option>
          {pages.map(p => (
            <option key={p.id} value={p.id}>{p.store_name || p.page_name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {!selectedPage && (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>
          Seleccioná una tienda para ver sus integraciones.
        </p>
      )}

      {selectedPage && loading && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
          <Loader2 size={18} className="spin" />
          <span style={{ color: "var(--text-secondary)" }}>Cargando...</span>
        </div>
      )}

      {selectedPage && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              pageId={selectedPage}
              products={products}
              onToggle={handleToggle}
              toggling={!!toggling[integration.key]}
            />
          ))}
          {integrations.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0" }}>
              No hay integraciones disponibles.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
