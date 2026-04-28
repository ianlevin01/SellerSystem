import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { Plus, Minus, Search, Image, PlusCircle, Check, AlertCircle } from "lucide-react";

const PAGE_SIZE = 20;

function fmt(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function PriceEditor({ product, pageId, onSaved }) {
  const precio1    = product.precio_1;
  const initial    = product.custom_price ?? precio1 ?? "";
  const [value,    setValue]   = useState(initial !== "" ? Number(initial).toFixed(0) : "");
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState("");
  const [success,  setSuccess] = useState(false);

  const tooLow = precio1 && value !== "" && Number(value) < precio1 - 0.01;

  async function handleSave() {
    if (tooLow || value === "") return;
    setSaving(true); setError(""); setSuccess(false);
    try {
      await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/price`, {
        custom_price: Number(value),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onSaved(product.id, Number(value));
    } catch (err) {
      setError(err.response?.data?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {precio1 && (
        <div style={{ fontSize: ".72rem", color: "var(--text-muted)", marginBottom: 4 }}>
          Mínimo: {fmt(precio1)}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: ".8rem", color: "var(--text-secondary)" }}>$</span>
          <input
            type="number"
            min={precio1 || 0}
            step={1}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="form-input form-input--sm"
            style={{ paddingLeft: 20, borderColor: tooLow ? "var(--danger)" : undefined }}
            placeholder="Tu precio"
          />
        </div>
        <button
          className="btn btn--primary"
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "0 14px", height: 36, fontSize: ".8125rem", fontWeight: 600 }}
          onClick={handleSave}
          disabled={saving || tooLow || value === ""}
        >
          {saving ? "Guardando..." : <><Check size={14} /> Guardar</>}
        </button>
      </div>
      {tooLow && (
        <div style={{ fontSize: ".72rem", color: "var(--danger)", marginTop: 3, display: "flex", gap: 4, alignItems: "center" }}>
          <AlertCircle size={11} /> Por debajo del mínimo
        </div>
      )}
      {success && (
        <div style={{ fontSize: ".72rem", color: "var(--success)", marginTop: 3 }}>✓ Guardado</div>
      )}
      {error && (
        <div style={{ fontSize: ".72rem", color: "var(--danger)", marginTop: 3 }}>{error}</div>
      )}
    </div>
  );
}

export default function PageProducts({ pageId }) {
  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [offset,      setOffset]      = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [categoryId,  setCategoryId]  = useState(null);
  const [categories,  setCategories]  = useState([]);
  const [saving,      setSaving]      = useState({});
  const searchTimeout = useRef(null);

  useEffect(() => {
    client.get("/seller/store/categories").then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async (newOffset = 0, append = false) => {
    if (newOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await client.get(`/seller/store/pages/${pageId}/products`, {
        params: {
          search:      search || undefined,
          only_mine:   filter === "mine" ? "true" : undefined,
          category_id: categoryId || undefined,
          limit:       PAGE_SIZE,
          offset:      newOffset,
        },
      });
      const { products: incoming, total: t, hasMore: more } = res.data;
      setProducts(prev => append ? [...prev, ...incoming] : incoming);
      setTotal(t);
      setHasMore(more);
      setOffset(newOffset);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pageId, search, filter, categoryId]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchProducts(0, false), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [fetchProducts]);

  async function toggle(product) {
    setSaving(p => ({ ...p, [product.id]: true }));
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, in_my_store: !p.in_my_store } : p));
    try {
      if (product.in_my_store) {
        await client.delete(`/seller/store/pages/${pageId}/products/${product.id}`);
      } else {
        await client.post(`/seller/store/pages/${pageId}/products/${product.id}`);
      }
    } catch {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, in_my_store: product.in_my_store } : p));
    } finally {
      setSaving(p => ({ ...p, [product.id]: false }));
    }
  }

  async function addAll() {
    if (!confirm("¿Agregar todos los productos activos a esta tienda?")) return;
    await client.post(`/seller/store/pages/${pageId}/products/add-all`);
    await fetchProducts(0, false);
  }

  function handlePriceSaved(productId, newPrice) {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, custom_price: newPrice } : p));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)" }}>
          Elegí qué productos aparecen en esta tienda y fijá el precio de cada uno.
        </p>
        <button className="btn btn--primary btn--sm" onClick={addAll}>
          <PlusCircle size={14} /> Agregar todos
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: 10 }}>
        <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <Search className="search-wrapper__icon" size={15} />
          <input
            className="form-input"
            style={{ paddingLeft: 38 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
          />
        </div>
        <div className="pill-tabs">
          <button className={`pill-tab${filter === "all"  ? " active" : ""}`} onClick={() => setFilter("all")}>Todos</button>
          <button className={`pill-tab${filter === "mine" ? " active" : ""}`} onClick={() => setFilter("mine")}>En esta tienda</button>
        </div>
      </div>

      {categories.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <button className={`pill-tab${!categoryId ? " active" : ""}`} onClick={() => setCategoryId(null)}>
            Todas las categorías
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={`pill-tab${categoryId === c.id ? " active" : ""}`}
              onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!loading && (
        <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginBottom: 12 }}>
          {products.length} de {total} producto{total !== 1 ? "s" : ""}
        </p>
      )}

      {loading ? (
        <div className="product-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)", fontSize: ".9rem" }}>
          No se encontraron productos.
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((product, i) => {
              const images  = product.seller_images?.length > 0 ? product.seller_images : product.system_images;
              const imgUrl  = images?.[0] || null;
              const inStore = !!product.in_my_store;
              const currentPrice = product.custom_price ?? product.precio_1;

              return (
                <div
                  key={product.id}
                  className={`product-card${inStore ? " product-card--active" : ""}`}
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="product-card__img">
                    {imgUrl
                      ? <img src={imgUrl} alt={product.custom_name || product.name} />
                      : <div className="product-card__img-placeholder"><Image size={24} /></div>
                    }
                    {inStore && (
                      <div className="product-card__badge-wrap">
                        <span className="badge badge--brand">En tienda</span>
                      </div>
                    )}
                  </div>

                  <div className="product-card__body">
                    <div className="product-card__name">{product.custom_name || product.name}</div>
                    <div className="product-card__meta">{product.code || "—"} · Stock: {product.stock_total}</div>

                    {inStore && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginBottom: 2 }}>
                          Precio actual: <strong style={{ color: "var(--brand)" }}>{fmt(currentPrice)}</strong>
                          {!product.custom_price && <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}> (mínimo)</span>}
                        </div>
                        <PriceEditor product={product} pageId={pageId} onSaved={handlePriceSaved} />
                      </div>
                    )}

                    <div className="product-card__actions" style={{ marginTop: 10 }}>
                      <button
                        onClick={() => toggle(product)}
                        disabled={saving[product.id]}
                        className={`btn btn--sm${inStore ? " btn--danger" : ""}`}
                        style={!inStore ? { background: "var(--brand-light)", color: "var(--brand-text)", flex: 1 } : { flex: 1 }}
                      >
                        {inStore ? <><Minus size={12} /> Quitar</> : <><Plus size={12} /> Agregar</>}
                      </button>
                      {inStore && (
                        <Link
                          to={`/pages/${pageId}/products/${product.id}/edit`}
                          className="btn btn--secondary btn--sm"
                          title="Editar imágenes y nombre"
                        >
                          <Image size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                className="btn btn--secondary"
                onClick={() => fetchProducts(offset + PAGE_SIZE, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Cargando..." : `Cargar más (${total - products.length} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
