import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Sparkles, Loader2 } from "lucide-react";
import client from "../api/client";
import { Modal } from "./ml/mlShared";
import { MlCatalogCard } from "./PageProducts";

const PAGE_SIZE = 20;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function roundPrice(value) { const n = toNumber(value); return n <= 0 ? 0 : Math.round(n); }
function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && v !== "");
}
// Misma lógica que resellerCost() en PageProducts.jsx — duplicada acá porque es una función
// suelta (no componente) y exportarla desde ahí rompe el fast-refresh de ese archivo.
function resellerCost(product) {
  return roundPrice(firstDefined(
    product.precio_1, product.precio_base, product.base_price, product.cost_price,
    product.costo, product.price_floor, product.min_price, product.minimum_price,
    product.precio_minimo, product.provider_price,
  ));
}

// Versión de solo lectura del catálogo — misma fuente de datos y misma card que
// la pestaña "Catálogo" de Mercado Libre (MlCatalogCard, en PageProducts.jsx),
// pero sin reservar stock ni solicitar muestra: acá solo se viene a mirar. Si el
// vendedor quiere publicar, "Publicar" lo manda al flujo real en Mercado Libre.
export default function Catalogo() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topSellingIds, setTopSellingIds] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [adminInfoModal, setAdminInfoModal] = useState(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    client.get("/seller/store/categories").then(res => {
      const raw = res.data;
      setCategories(Array.isArray(raw) ? raw : raw?.categories || []);
    }).catch(() => {});
    client.get("/seller/products/top-selling").then(res => {
      setTopSellingIds(new Set(res.data?.productIds || []));
    }).catch(() => {});
  }, []);

  async function fetchProducts(offset = 0) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params = { limit: PAGE_SIZE, offset };
    if (query.trim())       params.search      = query.trim();
    if (category !== "all") params.category_id = category;

    try {
      const res  = await client.get("/seller/products", { params, signal: controller.signal });
      const list = normalizeProducts(res.data);
      setProducts(prev => offset === 0 ? list : [...prev, ...list.filter(p => !prev.some(x => x.id === p.id))]);
      setTotal(res.data?.total ?? list.length);
      setHasMore(res.data?.hasMore ?? false);
      setLoading(false);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setLoading(false);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(0), query.trim() ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  function loadMore() {
    setLoadingMore(true);
    fetchProducts(products.length);
  }

  function goPublish() {
    navigate("/mercado-libre?tab=publish");
  }

  const categoryOptions = categories.map(cat => ({
    id:   String(cat.id ?? cat.value ?? cat.name),
    name: cat.name ?? cat.label ?? String(cat.id),
  }));

  if (loading) {
    return (
      <div className="seller-products">
        <div className="seller-products-loading">
          {[1, 2, 3, 4].map(item => <div key={item} className="seller-products-skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="seller-products">
      <section className="seller-products-intro seller-products-intro--ml">
        <div>
          <span><Sparkles size={13} />Catálogo</span>
          <h2>Todos los productos disponibles en Ventaz</h2>
        </div>
      </section>

      <section className="seller-products-toolbar seller-products-toolbar--ml">
        <div className="seller-products-search">
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código..."
          />
        </div>
      </section>

      <section className="seller-products-cats seller-products-cats--ml">
        <button type="button" className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>
          Todas
        </button>
        {categoryOptions.map(cat => (
          <button
            type="button"
            key={cat.id}
            title={cat.name}
            className={String(category) === String(cat.id) || String(category) === String(cat.name) ? "is-active" : ""}
            onClick={() => setCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </section>

      <div className="seller-products-count">
        <ShoppingCart size={15} />
        <span>Mostrando {products.length} de {total} productos</span>
      </div>

      {products.length === 0 ? (
        <div className="seller-products-empty">
          <ShoppingCart size={34} />
          <h3>No encontramos productos</h3>
          <p>Probá con otra búsqueda o cambiá la categoría.</p>
        </div>
      ) : (
        <>
          <section className="seller-products-grid seller-products-grid--ml">
            {products.map(product => {
              const isNew = product.created_at
                ? (Date.now() - new Date(product.created_at).getTime()) < ONE_WEEK_MS
                : false;
              return (
                <MlCatalogCard
                  key={product.id}
                  product={product}
                  cost={resellerCost(product)}
                  isNew={isNew}
                  isTopSeller={topSellingIds.has(product.id)}
                  comboMode={false}
                  onPublish={goPublish}
                  onShowInfo={() => setAdminInfoModal(product)}
                  alwaysShowInfo
                />
              );
            })}
          </section>
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
              <button type="button" className="btn btn--ghost" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? <Loader2 size={16} className="seller-products-spin" /> : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}

      {adminInfoModal && (
        <Modal title={adminInfoModal.custom_name || adminInfoModal.name || "Producto"} onClose={() => setAdminInfoModal(null)} maxWidth={480}>
          <p style={{ margin: 0, fontSize: ".88rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: adminInfoModal.admin_info ? undefined : "var(--text-secondary)" }}>
            {adminInfoModal.admin_info || "Todavía no cargamos información adicional para este producto."}
          </p>
        </Modal>
      )}
    </div>
  );
}
