// src/pages/Products.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { Plus, Minus, Search, Image, PlusCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;

export default function Products() {
  const { seller } = useAuth();
  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [saving, setSaving]       = useState({});
  const searchTimeout             = useRef(null);

  const fetchProducts = useCallback(async (newOffset = 0, append = false) => {
    if (newOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await client.get("/seller/products", {
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
  }, [search, filter]);

  // Reset and reload when search/filter changes
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchProducts(0, false), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [fetchProducts]);

  async function toggle(product) {
    setSaving(p => ({ ...p, [product.id]: true }));
    try {
      if (product.in_my_store) {
        await client.delete(`/seller/products/${product.id}`);
      } else {
        await client.post(`/seller/products/${product.id}`);
      }
      await fetchProducts(0, false);
    } finally {
      setSaving(p => ({ ...p, [product.id]: false }));
    }
  }

  async function addAll() {
    if (!confirm("¿Agregar todos los productos activos a tu tienda?")) return;
    await client.post("/seller/products/add-all");
    await fetchProducts(0, false);
  }

  const pct = Number(seller?.pct_markup || 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Productos</h1>
          <p>Elegí qué mostrar en tu tienda y personalizá sus fotos.</p>
        </div>
        <button className="btn btn--primary" onClick={addAll}>
          <PlusCircle size={15} /> Agregar todos
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <Search className="search-wrapper__icon" />
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
          <button className={`pill-tab${filter === "mine" ? " active" : ""}`} onClick={() => setFilter("mine")}>En mi tienda</button>
        </div>
      </div>

      {/* Contador */}
      {!loading && (
        <p style={{ fontSize: ".85rem", color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Mostrando {products.length} de {total} producto{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="product-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">No se encontraron productos.</div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((product, i) => {
              const images      = product.seller_images?.length > 0 ? product.seller_images : product.system_images;
              const imgUrl      = images?.[0] || null;
              const precioVenta = product.precio_1 ? (Number(product.precio_1) * (1 + pct / 100)) : null;
              const inStore     = !!product.in_my_store;

              return (
                <div
                  key={product.id}
                  className={`product-card${inStore ? " product-card--active" : ""}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="product-card__img">
                    {imgUrl
                      ? <img src={imgUrl} alt={product.custom_name || product.name} />
                      : <div className="product-card__img-placeholder"><Image size={24} /></div>
                    }
                    {inStore && (
                      <div className="product-card__badge-wrap">
                        <span className="badge badge--brand">En mi tienda</span>
                      </div>
                    )}
                  </div>

                  <div className="product-card__body">
                    <div className="product-card__name">{product.custom_name || product.name}</div>
                    <div className="product-card__meta">
                      {product.code || "—"} · Stock: {product.stock_total}
                    </div>

                    <div className="product-card__price-row">
                      <div className="product-card__base-price">
                        Base: {fmt(product.precio_1)}
                      </div>
                      {precioVenta && (
                        <div className="product-card__sale-price">
                          {fmt(precioVenta)}
                        </div>
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
                          title="Editar producto"
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

          {/* Cargar más */}
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

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
