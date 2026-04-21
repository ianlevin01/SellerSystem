import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { Plus, Minus, Search, Image, PlusCircle } from "lucide-react";

const PAGE_SIZE = 20;

function fmt(n) {
  if (!n) return "—";
  return Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function PageProducts({ pageId, pctMarkup = 0 }) {
  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [offset,      setOffset]      = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [saving,      setSaving]      = useState({});
  const searchTimeout = useRef(null);

  const fetchProducts = useCallback(async (newOffset = 0, append = false) => {
    if (newOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await client.get(`/seller/store/pages/${pageId}/products`, {
        params: {
          search:    search || undefined,
          only_mine: filter === "mine" ? "true" : undefined,
          limit:     PAGE_SIZE,
          offset:    newOffset,
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
  }, [pageId, search, filter]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchProducts(0, false), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [fetchProducts]);

  async function toggle(product) {
    setSaving(p => ({ ...p, [product.id]: true }));
    try {
      if (product.in_my_store) {
        await client.delete(`/seller/store/pages/${pageId}/products/${product.id}`);
      } else {
        await client.post(`/seller/store/pages/${pageId}/products/${product.id}`);
      }
      await fetchProducts(0, false);
    } finally {
      setSaving(p => ({ ...p, [product.id]: false }));
    }
  }

  async function addAll() {
    if (!confirm("¿Agregar todos los productos activos a esta tienda?")) return;
    await client.post(`/seller/store/pages/${pageId}/products/add-all`);
    await fetchProducts(0, false);
  }

  const pct = Number(pctMarkup || 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)" }}>
          Elegí qué productos aparecen en esta tienda.
        </p>
        <button className="btn btn--primary btn--sm" onClick={addAll}>
          <PlusCircle size={14} /> Agregar todos
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
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

      {!loading && (
        <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginBottom: 12 }}>
          {products.length} de {total} producto{total !== 1 ? "s" : ""}
        </p>
      )}

      {loading ? (
        <div className="product-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 260, borderRadius: "var(--radius-lg)" }} />
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
              const images      = product.seller_images?.length > 0 ? product.seller_images : product.system_images;
              const imgUrl      = images?.[0] || null;
              const precio1     = product.precio_1;
              const precioVenta = precio1 ? precio1 * (1 + pct / 100) : null;
              const inStore     = !!product.in_my_store;

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

                    <div className="product-card__price-row">
                      <div className="product-card__base-price">Base: {fmt(precio1)}</div>
                      {precioVenta && (
                        <div className="product-card__sale-price">{fmt(precioVenta)}</div>
                      )}
                    </div>

                    <div className="product-card__actions">
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
                          to={`/products/${product.id}/edit`}
                          className="btn btn--secondary btn--sm"
                          title="Editar imágenes"
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
