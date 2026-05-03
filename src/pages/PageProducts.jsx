import { useEffect, useMemo, useRef, useState } from "react";
import client from "../api/client";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";

function fmt(n) {
  return Number(Math.round(Number(n || 0))).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function money(n) {
  const value = Math.round(Number(n || 0));
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `$${fmt(value)}`;
}
function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function roundPrice(value) { const n = toNumber(value); return n <= 0 ? 0 : Math.round(n); }

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function firstDefined(...values) {
  return values.find((v) => v !== undefined && v !== null && v !== "");
}

// FIX: check system_images / seller_images que son los campos reales del backend
function firstImage(product) {
  if (Array.isArray(product.seller_images) && product.seller_images.length > 0 && product.seller_images[0]) {
    return product.seller_images[0];
  }
  if (Array.isArray(product.system_images) && product.system_images.length > 0 && product.system_images[0]) {
    return product.system_images[0];
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || img?.image_url || "";
  }
  return product.image_url || product.image || product.thumbnail || product.main_image || product.photo_url || "";
}

function productName(product) {
  return product.custom_name || product.name || product.nombre || "Producto sin nombre";
}
function productCode(product) {
  return product.codigo || product.code || product.sku || product.barcode || "Sin código";
}
function productStock(product) {
  return product.stock ?? product.stock_actual ?? product.quantity ?? product.available_stock ?? 0;
}
function productCategoryName(product) {
  return product.category_name || product.categoria || product.category?.name || product.category || "Sin categoría";
}

function resellerCost(product) {
  return roundPrice(firstDefined(
    product.precio_1, product.precio_base, product.base_price, product.cost_price,
    product.costo, product.price_floor, product.min_price, product.minimum_price,
    product.precio_minimo, product.provider_price,
  ));
}

// FIX: agrega seller_product_id e in_my_store que son los campos reales del backend
function isProductInStore(product) {
  return Boolean(
    product.in_my_store === true ||
    product.seller_product_id ||
    product.in_store === true ||
    product.in_page === true ||
    product.is_in_page === true ||
    product.selected === true ||
    product.is_selected === true ||
    product.page_product_id ||
    product.store_product_id ||
    product.pageProductId ||
    product.storeProductId,
  );
}

function backendPagePrice(product) {
  return roundPrice(firstDefined(
    product.custom_price, product.precio_venta, product.sale_price,
    product.public_price, product.store_price,
  ));
}

function suggestedPrice(product) {
  const cost = resellerCost(product);
  const backendSuggested = roundPrice(firstDefined(
    product.precio_sugerido, product.suggested_price, product.recommended_price,
    product.price_suggested, product.default_sale_price,
  ));
  if (backendSuggested > 0) return Math.max(cost, backendSuggested);
  const publicLikePrice = roundPrice(firstDefined(product.public_price, product.sale_price));
  if (publicLikePrice > cost) return publicLikePrice;
  return Math.max(cost, roundPrice(cost * 1.25));
}

function initialPriceFor(product) {
  const cost = resellerCost(product);
  const saved = isProductInStore(product) ? backendPagePrice(product) : 0;
  const suggested = suggestedPrice(product);
  return String(Math.max(cost, saved || suggested || cost));
}

async function tryMany(requests) {
  let lastError;
  for (const req of requests) {
    try { return await req(); } catch (err) { lastError = err; }
  }
  throw lastError;
}

function ProductImage({ product }) {
  const img = firstImage(product);
  if (!img) {
    return (
      <div className="seller-product-card__image seller-product-card__image--empty">
        <ImageIcon size={28} />
      </div>
    );
  }
  return (
    <div className="seller-product-card__image">
      <img src={img} alt={productName(product)} loading="lazy" />
    </div>
  );
}

export default function PageProducts({ pageId }) {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [prices,     setPrices]     = useState({});
  const [query,      setQuery]      = useState("");
  const [category,   setCategory]   = useState("all");
  const [onlyMine,   setOnlyMine]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [savingId,   setSavingId]   = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message,    setMessage]    = useState("");
  const debounceRef = useRef(null);

  // Cargar categorías una sola vez
  useEffect(() => {
    client.get("/seller/store/categories").then(res => {
      const raw = res.data;
      setCategories(Array.isArray(raw) ? raw : raw?.categories || []);
    }).catch(() => {});
  }, []);

  // Re-fetch cuando cambian los filtros (búsqueda con debounce)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchProducts, query ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [pageId, query, category, onlyMine]);

  async function fetchProducts() {
    setLoading(true);
    setMessage("");

    const params = { limit: 50 };
    if (query.trim())       params.search      = query.trim();
    if (category !== "all") params.category_id = category;
    if (onlyMine)           params.only_mine   = "true";

    try {
      const res  = await client.get(`/seller/store/pages/${pageId}/products`, { params });
      const list = normalizeProducts(res.data);
      setProducts(list);
      setTotal(res.data?.total ?? list.length);
      setPrices(prev => {
        const next = {};
        list.forEach(p => { next[p.id] = prev[p.id] ?? initialPriceFor(p); });
        return next;
      });
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }

  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories.map(cat => ({
        id:   String(cat.id ?? cat.value ?? cat.name),
        name: cat.name ?? cat.label ?? String(cat.id),
      }));
    }
    const map = new Map();
    products.forEach(p => {
      const name = productCategoryName(p);
      if (name && name !== "Sin categoría") map.set(name, name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [categories, products]);

  const stats = useMemo(() => ({
    total,
    visible:  products.length,
    inStore:  products.filter(isProductInStore).length,
  }), [products, total]);

  function setPrice(productId, value) {
    const rounded = value === "" ? "" : String(Math.round(Number(value) || 0));
    setPrices(prev => ({ ...prev, [productId]: rounded }));
    if (message) setMessage("");
  }

  function getInfo(product) {
    const cost      = resellerCost(product);
    const suggested = suggestedPrice(product);
    const sale      = roundPrice(prices[product.id]);
    const saved     = backendPagePrice(product);
    const inStore   = isProductInStore(product);
    const profit    = sale - cost;
    const valid     = cost > 0 && sale >= cost;
    const changed   = inStore && Math.round(sale) !== Math.round(saved || suggested);
    return { cost, suggested, sale, saved, profit, valid, changed, inStore, profitPct: cost > 0 ? Math.round((profit / cost) * 100) : 0 };
  }

  function useSuggested(product) { setPrice(product.id, suggestedPrice(product)); }

  async function addProduct(product) {
    const info = getInfo(product);
    if (!info.valid) {
      setMessage(`Para agregar "${productName(product)}", el precio tiene que ser igual o mayor a ${money(info.cost)}.`);
      return false;
    }
    setSavingId(product.id);
    setMessage("");
    try {
      const res = await tryMany([
        () => client.post(`/seller/store/pages/${pageId}/products/${product.id}`, { custom_price: info.sale }),
        () => client.post(`/seller/store/pages/${pageId}/products`, { product_id: product.id, custom_price: info.sale }),
        () => client.patch(`/seller/store/pages/${pageId}/products/${product.id}`, { in_store: true, custom_price: info.sale }),
      ]);
      setProducts(prev => prev.map(item =>
        item.id === product.id
          ? { ...item, ...(res.data || {}), in_my_store: true, seller_product_id: item.seller_product_id || "pending", in_store: true, in_page: true, selected: true, custom_price: info.sale }
          : item,
      ));
      setPrices(prev => ({ ...prev, [product.id]: String(info.sale) }));
      setMessage("Producto agregado a tu tienda.");
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo agregar el producto.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function savePrice(product) {
    const info = getInfo(product);
    if (!info.valid) {
      setMessage(`El precio de "${productName(product)}" no puede ser menor a ${money(info.cost)}.`);
      return false;
    }
    setSavingId(product.id);
    setMessage("");
    try {
      const res = await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/price`, { custom_price: info.sale });
      setProducts(prev => prev.map(item =>
        item.id === product.id
          ? { ...item, ...(res.data || {}), custom_price: info.sale, in_my_store: true, in_store: true, in_page: true, selected: true }
          : item,
      ));
      setMessage("Precio guardado.");
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo guardar el precio.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function removeProduct(product) {
    setSavingId(product.id);
    setMessage("");
    try {
      await tryMany([
        () => client.delete(`/seller/store/pages/${pageId}/products/${product.id}`),
        () => client.patch(`/seller/store/pages/${pageId}/products/${product.id}`, { in_store: false, enabled: false }),
      ]);
      setProducts(prev => prev.map(item =>
        item.id === product.id
          ? { ...item, in_my_store: false, seller_product_id: null, in_store: false, in_page: false, is_in_page: false, selected: false, is_selected: false, page_product_id: null, store_product_id: null, custom_price: null }
          : item,
      ));
      setPrices(prev => ({ ...prev, [product.id]: String(suggestedPrice(product)) }));
      setMessage("Producto quitado de tu tienda.");
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo quitar el producto.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function addVisibleProducts() {
    const candidates = products.filter(p => !isProductInStore(p));
    if (candidates.length === 0) { setMessage("No hay productos visibles para agregar."); return; }
    setBulkSaving(true);
    let ok = 0;
    for (const product of candidates) { const done = await addProduct(product); if (done) ok++; }
    setBulkSaving(false);
    setMessage(`${ok} producto${ok !== 1 ? "s" : ""} agregado${ok !== 1 ? "s" : ""} a tu tienda.`);
  }

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
      <section className="seller-products-intro">
        <div>
          <span><Sparkles size={15} />Productos</span>
          <h2>Elegí productos y definí tu precio de venta</h2>
          <p>
            El <strong>costo revendedor</strong> es tu base. El <strong>precio sugerido</strong> es una referencia.
            Tu ganancia se calcula con el precio que cargues.
          </p>
        </div>
        <button type="button" onClick={addVisibleProducts} disabled={bulkSaving}>
          {bulkSaving ? <Loader2 size={16} className="seller-products-spin" /> : <PackagePlus size={16} />}
          {bulkSaving ? "Agregando..." : "Agregar visibles"}
        </button>
      </section>

      <section className="seller-products-toolbar">
        <div className="seller-products-search">
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código..."
          />
        </div>
        <div className="seller-products-tabs">
          <button type="button" className={!onlyMine ? "is-active" : ""} onClick={() => setOnlyMine(false)}>Todos</button>
          <button type="button" className={onlyMine  ? "is-active" : ""} onClick={() => setOnlyMine(true)}>En mi tienda</button>
        </div>
      </section>

      <section className="seller-products-cats">
        <button type="button" className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>
          Todas
        </button>
        {categoryOptions.map(cat => (
          <button
            type="button"
            key={cat.id}
            className={String(category) === String(cat.id) || String(category) === String(cat.name) ? "is-active" : ""}
            onClick={() => setCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </section>

      <div className="seller-products-count">
        <ShoppingCart size={15} />
        <span>
          Mostrando {stats.visible} de {stats.total} productos · {stats.inStore} en tu tienda
        </span>
      </div>

      {message && (
        <div className={`seller-products-message ${message.includes("No se pudo") || message.includes("menor") || (message.includes("agregar") && message.includes("igual")) ? "is-error" : "is-ok"}`}>
          {message.includes("No se pudo") || message.includes("menor") ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{message}</span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="seller-products-empty">
          <ShoppingCart size={34} />
          <h3>No encontramos productos</h3>
          <p>Probá con otra búsqueda, otra categoría o cambiá el filtro.</p>
        </div>
      ) : (
        <section className="seller-products-grid">
          {products.map((product, index) => {
            const info   = getInfo(product);
            const saving = savingId === product.id;
            return (
              <article
                key={product.id}
                className={`seller-product-card ${info.inStore ? "is-in-store" : ""} ${!info.valid && info.sale > 0 ? "has-price-error" : ""}`}
                style={{ animationDelay: `${index * 22}ms` }}
              >
                <div className="seller-product-card__media">
                  <ProductImage product={product} />
                  {info.inStore && (
                    <span className="seller-product-card__badge">
                      <BadgeCheck size={13} />
                      En tienda
                    </span>
                  )}
                </div>

                <div className="seller-product-card__body">
                  <div>
                    <h3 title={productName(product)}>{productName(product)}</h3>
                    <p className="seller-product-card__meta">
                      {productCode(product)} · Stock: {fmt(productStock(product))}
                    </p>
                  </div>

                  <div className="seller-product-prices">
                    <div className="seller-product-price seller-product-price--cost">
                      <span>Costo revendedor</span>
                      <strong>{money(info.cost)}</strong>
                    </div>
                    <button
                      type="button"
                      className="seller-product-price seller-product-price--suggested"
                      onClick={() => useSuggested(product)}
                      title="Usar precio sugerido"
                    >
                      <span>Precio sugerido</span>
                      <strong>{money(info.suggested)}</strong>
                      <small>Usar sugerido</small>
                    </button>
                  </div>

                  <label className="seller-product-sale">
                    <span>Tu precio de venta</span>
                    <div>
                      <b>$</b>
                      <input
                        type="number"
                        min={info.cost || 0}
                        step="1"
                        value={prices[product.id] ?? ""}
                        onChange={e => setPrice(product.id, e.target.value)}
                      />
                    </div>
                  </label>

                  <div className={`seller-product-profit ${info.profit > 0 ? "is-positive" : ""}`}>
                    <TrendingUp size={16} />
                    <span>Ganancia estimada</span>
                    <strong>{info.valid && info.profit >= 0 ? money(info.profit) : "—"}</strong>
                  </div>

                  {!info.valid && info.sale > 0 && (
                    <div className="seller-product-warning">
                      <AlertTriangle size={14} />
                      No puede ser menor a {money(info.cost)}
                    </div>
                  )}

                  <div className="seller-product-actions">
                    {!info.inStore ? (
                      <button
                        type="button"
                        className="seller-product-btn seller-product-btn--add"
                        onClick={() => addProduct(product)}
                        disabled={saving || !info.valid}
                      >
                        {saving ? <Loader2 size={16} className="seller-products-spin" /> : <Plus size={16} />}
                        Agregar a mi tienda
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="seller-product-btn seller-product-btn--save"
                          onClick={() => savePrice(product)}
                          disabled={saving || !info.valid || !info.changed}
                        >
                          {saving ? <Loader2 size={16} className="seller-products-spin" /> : <Save size={16} />}
                          {info.changed ? "Guardar precio" : "Precio guardado"}
                        </button>
                        <button
                          type="button"
                          className="seller-product-btn seller-product-btn--remove"
                          onClick={() => removeProduct(product)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 size={16} className="seller-products-spin" /> : <Trash2 size={16} />}
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
