import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  X,
  Zap,
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

function productKey(id) {
  return String(id ?? "");
}

function sameProductId(a, b) {
  return productKey(a) === productKey(b);
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
  return product.available_stock ?? product.stock ?? product.stock_actual ?? product.quantity ?? 0;
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

function isProductInStore(product) {
  return Boolean(
    product.in_my_store === true ||
    product.in_store === true ||
    product.in_page === true ||
    product.is_in_page === true ||
    product.selected === true ||
    product.is_selected === true ||
    product.seller_product_id ||
    product.page_product_id ||
    product.store_product_id
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

const PAGE_SIZE = 20;

export default function PageProducts({ pageId }) {
  const navigate = useNavigate();
  const [products,      setProducts]      = useState([]);
  const [locallyAdded,  setLocallyAdded]  = useState({});
  const [combos,        setCombos]        = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [prices,        setPrices]        = useState({});
  const [query,         setQuery]         = useState("");
  const [category,      setCategory]      = useState("all");
  const [onlyMine,      setOnlyMine]      = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState(0);
  const [promos,        setPromos]        = useState({});
  const [savingId,      setSavingId]      = useState(null);
  const [bulkSaving,    setBulkSaving]    = useState(false);
  const [message,       setMessage]       = useState("");
  const [toast,         setToast]         = useState(null);
  const [infoTip,       setInfoTip]       = useState(null);
  const toastTimerRef = useRef(null);
  const toolbarRef = useRef(null);
  const [fixedToolbar, setFixedToolbar] = useState({ show: false, left: 0, width: 0, top: 0 });
  // Combo mode
  const [comboMode,     setComboMode]     = useState(false);
  const [comboSelected, setComboSelected] = useState(new Set());
  const [creatingCombo, setCreatingCombo] = useState(false);
  const debounceRef = useRef(null);
  const abortRef    = useRef(null);

  function showToast(name) {
    clearTimeout(toastTimerRef.current);
    setToast({ message: name, isError: false });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  function showErrorToast(msg) {
    clearTimeout(toastTimerRef.current);
    setToast({ message: msg, isError: true });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    function updateFixedToolbar() {
      const el = toolbarRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const mobile = window.matchMedia("(max-width: 920px)").matches;
      const top = mobile ? 62 : 10;
      const shouldShow = rect.bottom <= top;

      setFixedToolbar(prev => {
        const next = {
          show: shouldShow,
          left: Math.max(8, Math.round(rect.left)),
          width: Math.round(rect.width),
          top,
        };

        if (
          prev.show === next.show &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.top === next.top
        ) {
          return prev;
        }

        return next;
      });
    }

    updateFixedToolbar();

    const main = document.querySelector(".layout__main");
    window.addEventListener("scroll", updateFixedToolbar, { passive: true });
    window.addEventListener("resize", updateFixedToolbar);
    main?.addEventListener("scroll", updateFixedToolbar, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateFixedToolbar);
      window.removeEventListener("resize", updateFixedToolbar);
      main?.removeEventListener("scroll", updateFixedToolbar);
    };
  }, []);

  // Cargar categorías y combos
  useEffect(() => {
    client.get("/seller/store/categories").then(res => {
      const raw = res.data;
      setCategories(Array.isArray(raw) ? raw : raw?.categories || []);
    }).catch(() => {});
    client.get(`/seller/store/pages/${pageId}/combos`).then(res => {
      setCombos(res.data || []);
    }).catch(() => {});
  }, [pageId]);

  // Re-fetch cuando cambian los filtros (búsqueda con debounce)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(0), query ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [pageId, query, category, onlyMine]);

  async function fetchProducts(offset = 0) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setMessage("");

    const params = { limit: PAGE_SIZE, offset };
    if (query.trim())       params.search      = query.trim();
    if (category !== "all") params.category_id = category;
    if (onlyMine)           params.only_mine   = "true";
    else                    params.not_mine    = "true";

    try {
      const res  = await client.get(`/seller/store/pages/${pageId}/products`, { params, signal: controller.signal });
      const list = normalizeProducts(res.data);
      if (offset === 0) {
        setProducts(list);
        setPrices(prev => {
          const next = {};
          list.forEach(p => { next[p.id] = prev[p.id] ?? initialPriceFor(p); });
          return next;
        });
        setPromos(() => {
          const next = {};
          list.forEach(p => { next[p.id] = { promoEnabled: p.promo_enabled || false, promoPrice: p.promo_price ? String(p.promo_price) : "" }; });
          return next;
        });
      } else {
        setProducts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...list.filter(p => !ids.has(p.id))];
        });
        setPrices(prev => {
          const next = { ...prev };
          list.forEach(p => { if (!(p.id in next)) next[p.id] = initialPriceFor(p); });
          return next;
        });
        setPromos(prev => {
          const next = { ...prev };
          list.forEach(p => { if (!(p.id in next)) next[p.id] = { promoEnabled: p.promo_enabled || false, promoPrice: p.promo_price ? String(p.promo_price) : "" }; });
          return next;
        });
      }
      setTotal(res.data?.total ?? list.length);
      setHasMore(res.data?.hasMore ?? false);
      setLoading(false);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setLoading(false);
      setMessage(err.response?.data?.message || "No se pudieron cargar los productos.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    await fetchProducts(products.length);
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
    const inStore   = isProductInStore(product) || Boolean(locallyAdded[productKey(product.id)]);
    const profit    = sale - cost;
    const valid     = cost > 0 && sale >= cost;
    const priceChanged = inStore && Math.round(sale) !== Math.round(saved || suggested);
    const promoState   = promos[product.id] || {};
    const promoChanged = inStore && (
      String(promoState.promoPrice ?? "") !== String(product.promo_price ?? "") ||
      Boolean(promoState.promoEnabled) !== Boolean(product.promo_enabled)
    );
    const changed = priceChanged || promoChanged;
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
      await tryMany([
        () => client.post(`/seller/store/pages/${pageId}/products/${product.id}`, { custom_price: info.sale }),
        () => client.post(`/seller/store/pages/${pageId}/products`, { product_id: product.id, custom_price: info.sale }),
        () => client.patch(`/seller/store/pages/${pageId}/products/${product.id}`, { in_store: true, custom_price: info.sale }),
      ]);
      // Remove from "Todos" list (Todos only shows not-in-store products)
      setProducts(prev => prev.filter(item => !sameProductId(item.id, product.id)));
      setTotal(prev => Math.max(0, prev - 1));
      showToast(productName(product));
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
    const promo      = promos[product.id] || {};
    const promoPrice = Number(promo.promoPrice) || 0;
    const promoEnabled = promoPrice > 0;
    if (promoEnabled && promoPrice < info.cost) {
      showErrorToast(`El precio promo no puede ser menor al mínimo permitido (${money(info.cost)}).`);
      return false;
    }
    setSavingId(product.id);
    setMessage("");
    try {
      await Promise.all([
        client.patch(`/seller/store/pages/${pageId}/products/${product.id}/price`, { custom_price: info.sale }),
        client.patch(`/seller/store/pages/${pageId}/products/${product.id}/promo`, {
          promo_price:   promoEnabled ? promoPrice : null,
          promo_enabled: promoEnabled,
        }),
      ]);
      setLocallyAdded(prev => ({ ...prev, [productKey(product.id)]: true }));
      setProducts(prev => prev.map(item =>
        sameProductId(item.id, product.id)
          ? {
              ...item,
              id: item.id,
              custom_price:  info.sale,
              precio_venta:  info.sale,
              promo_price:   promoEnabled ? promoPrice : null,
              promo_enabled: promoEnabled,
              in_my_store:   true,
              in_store:      true,
              in_page:       true,
              is_in_page:    true,
              selected:      true,
              is_selected:   true,
            }
          : item,
      ));
      setPromos(prev => ({ ...prev, [product.id]: { ...prev[product.id], promoEnabled } }));
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
      setLocallyAdded(prev => {
        const next = { ...prev };
        delete next[productKey(product.id)];
        return next;
      });
      setProducts(prev => prev.map(item =>
        sameProductId(item.id, product.id)
          ? { ...item, in_my_store: false, seller_product_id: null, in_store: false, in_page: false, is_in_page: false, selected: false, is_selected: false, page_product_id: null, store_product_id: null, custom_price: null, precio_venta: null }
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

  async function toggleFreeShipping(product) {
    const newVal = !product.free_shipping;
    try {
      await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/customize`, { free_shipping: newVal });
      setProducts(prev => prev.map(p => sameProductId(p.id, product.id) ? { ...p, free_shipping: newVal } : p));
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo actualizar el envío.");
    }
  }

  async function savePromo(product) {
    const promo = promos[product.id] || {};
    const promoPrice = Number(promo.promoPrice);
    const promoEnabled = promoPrice > 0;
    if (promoEnabled) {
      const info = getInfo(product);
      if (promoPrice < info.cost) {
        showErrorToast(`El precio promo no puede ser menor al mínimo permitido (${money(info.cost)}).`);
        return;
      }
    }
    setSavingId(`promo-${product.id}`);
    setMessage("");
    try {
      await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/promo`, {
        promo_price: promoEnabled ? promoPrice : null,
        promo_enabled: promoEnabled,
      });
      setProducts(prev => prev.map(p => sameProductId(p.id, product.id)
        ? { ...p, promo_price: promoEnabled ? promoPrice : null, promo_enabled: promoEnabled }
        : p
      ));
      setPromos(prev => ({ ...prev, [product.id]: { ...prev[product.id], promoEnabled } }));
      setMessage(promoEnabled ? "Precio promo guardado." : "Promo desactivada.");
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo guardar la promoción.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleComboFreeShipping(combo) {
    const newVal = !combo.free_shipping;
    try {
      await client.patch(`/seller/store/pages/${pageId}/combos/${combo.id}`, { free_shipping: newVal });
      setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, free_shipping: newVal } : c));
    } catch { /* silent */ }
  }

  async function toggleCombo(combo) {
    try {
      await client.patch(`/seller/store/pages/${pageId}/combos/${combo.id}`, { active: !combo.active });
      setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, active: !c.active } : c));
    } catch { /* silent */ }
  }

  async function deleteCombo(combo) {
    if (!confirm(`¿Eliminar el combo "${combo.name}"?`)) return;
    try {
      await client.delete(`/seller/store/pages/${pageId}/combos/${combo.id}`);
      setCombos(prev => prev.filter(c => c.id !== combo.id));
    } catch { /* silent */ }
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

  function enterComboMode() {
    setComboSelected(new Set());
    setComboMode(true);
    setOnlyMine(false);
  }

  function cancelComboMode() {
    setComboMode(false);
    setComboSelected(new Set());
  }

  function toggleComboProduct(productId) {
    setComboSelected(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  }

  async function finalizeCombo() {
    if (comboSelected.size === 0) return;
    setCreatingCombo(true);
    try {
      const res = await client.post(`/seller/store/pages/${pageId}/combos`, {
        name: "Nuevo combo",
        products: Array.from(comboSelected).map(id => ({ product_id: id, quantity: 1 })),
        custom_price: 0,
      });
      navigate(`/pages/${pageId}/combos/${res.data.id}/edit`);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error al crear el combo.");
      setCreatingCombo(false);
    }
  }

  function renderToolbar(extraClass = "", extraProps = {}) {
    return (
      <section
        className={`seller-products-toolbar ${extraClass}`.trim()}
        {...extraProps}
      >
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
    );
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

      {/* Toast — renderizado en body para evitar clipping por overflow */}
      {toast && createPortal(
        <div className={`pp-toast${toast.isError ? " pp-toast--error" : ""}`}>
          {toast.isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.isError ? toast.message : <><strong>{toast.message}</strong> agregado a tu tienda</>}</span>
        </div>,
        document.body
      )}

      {/* Tooltip flotante para el ícono de precio promocional */}
      {infoTip && createPortal(
        <div
          className="pp-info-tooltip"
          style={{ left: infoTip.x, top: infoTip.y }}
        >
          {infoTip.text}
        </div>,
        document.body
      )}

      {comboMode ? (
        <section className="combo-mode-banner">
          <div className="combo-mode-banner__info">
            <Layers size={17} />
            <div>
              <strong>Modo combo</strong>
              <span>Seleccioná los productos que quieras incluir</span>
            </div>
          </div>
          <div className="combo-mode-banner__actions">
            <span className="combo-mode-banner__count">
              {comboSelected.size} {comboSelected.size === 1 ? "producto" : "productos"}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={cancelComboMode}>
              <X size={14} /> Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={finalizeCombo}
              disabled={comboSelected.size === 0 || creatingCombo}
            >
              {creatingCombo ? <Loader2 size={14} className="seller-products-spin" /> : <CheckCircle2 size={14} />}
              {creatingCombo ? "Creando..." : "Finalizar combo"}
            </button>
          </div>
        </section>
      ) : (
        <section className="seller-products-intro">
          <div>
            <span><Sparkles size={15} />Productos</span>
            <h2>Elegí productos y definí tu precio de venta</h2>
            <p>
              El <strong>costo</strong> es tu base. <strong>Tu precio</strong> es el precio normal.
              Si cargás un <strong>precio promo menor</strong>, la tienda muestra automáticamente el porcentaje de descuento.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <button type="button" className="btn btn--combo-cta" onClick={enterComboMode}>
              <Layers size={16} /> Crear combo
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={addVisibleProducts} disabled={bulkSaving}>
              {bulkSaving ? <Loader2 size={16} className="seller-products-spin" /> : <PackagePlus size={16} />}
              {bulkSaving ? "Agregando..." : "Agregar a mi tienda todos los productos visibles"}
            </button>
          </div>
        </section>
      )}

      {renderToolbar("", { ref: toolbarRef })}

      {fixedToolbar.show && createPortal(
        renderToolbar("seller-products-toolbar--fixed", {
          style: {
            left: `${fixedToolbar.left}px`,
            width: `${fixedToolbar.width}px`,
            top: `${fixedToolbar.top}px`,
          },
        }),
        document.body
      )}

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

      <div className="seller-products-mini-help">
        <Zap size={14} />
        <span><strong>Precio promo:</strong> si es menor a tu precio normal, la tienda lo muestra como descuento automático: <strong>10% OFF</strong>.</span>
      </div>

      {message && (
        <div className={`seller-products-message ${message.includes("No se pudo") || message.includes("menor") || (message.includes("agregar") && message.includes("igual")) ? "is-error" : "is-ok"}`}>
          {message.includes("No se pudo") || message.includes("menor") ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{message}</span>
        </div>
      )}

      {products.length === 0 && combos.length === 0 ? (
        <div className="seller-products-empty">
          <ShoppingCart size={34} />
          <h3>No encontramos productos</h3>
          <p>Probá con otra búsqueda, otra categoría o cambiá el filtro.</p>
        </div>
      ) : (
        <>
        <section className="seller-products-grid">
          {/* Combos — always shown first, not affected by search/filter */}
          {!comboMode && combos.map(combo => (
            <article
              key={`combo-${combo.id}`}
              className={`seller-product-card ${combo.active ? "is-in-store" : ""}`}
            >
              <div className="seller-product-card__media">
                {combo.images?.[0] ? (
                  <div className="seller-product-card__image">
                    <img src={combo.images[0]} alt={combo.name} loading="lazy" />
                  </div>
                ) : (
                  <div className="seller-product-card__image seller-product-card__image--empty">
                    <Layers size={28} />
                  </div>
                )}
                <span className="seller-product-card__badge" style={{ background: "var(--brand-secondary, #6366f1)" }}>
                  <Layers size={11} /> Combo
                </span>
                <button
                  type="button"
                  className={`seller-product-card__shipping-badge ${combo.free_shipping ? "is-active" : ""}`}
                  onClick={() => toggleComboFreeShipping(combo)}
                  title={combo.free_shipping ? "Envío gratis activo — clic para desactivar" : "Activar envío gratis"}
                  aria-pressed={combo.free_shipping}
                >
                  <Truck size={12} />
                  <span>Envío gratis</span>
                  <b>{combo.free_shipping ? "Sí" : "No"}</b>
                </button>
                {!combo.active && (
                  <div className="seller-product-card__stock-warn">
                    <AlertTriangle size={11} />
                    <span>Inactivo · No visible en tu tienda</span>
                  </div>
                )}
              </div>
              <div className="seller-product-card__body">
                <div>
                  <h3 title={combo.name}>{combo.name}</h3>
                  <p className="seller-product-card__meta">
                    {(combo.products || []).length} producto{(combo.products || []).length !== 1 ? "s" : ""}
                    {combo.products?.length > 0 && (
                      <> · {combo.products.map(p => p.name).join(", ").slice(0, 60)}{combo.products.map(p => p.name).join(", ").length > 60 ? "…" : ""}</>
                    )}
                  </p>
                </div>
                {(() => {
                  const comboCost   = Number(combo.combo_cost_min || 0);
                  const comboPrice  = Number(combo.custom_price   || 0);
                  const comboProfit = comboPrice > 0 && comboCost > 0 ? comboPrice - comboCost : 0;
                  const comboPct    = comboCost > 0 && comboProfit > 0 ? Math.round((comboProfit / comboCost) * 100) : 0;
                  const recommended = comboCost > 0 ? Math.round(comboCost * 1.15) : 0;
                  return (<>
                    <div className="seller-product-prices">
                      <div className="seller-product-price seller-product-price--cost">
                        <span>Costo total</span>
                        <strong>{comboCost > 0 ? money(comboCost) : "—"}</strong>
                      </div>
                      <div className="seller-product-price seller-product-price--suggested">
                        <span>Precio recomendado</span>
                        <strong>{recommended > 0 ? money(recommended) : "—"}</strong>
                      </div>
                    </div>

                    <div className="seller-product-sale-wrap">
                      <div className="seller-product-sale">
                        <span>Precio del combo</span>
                        <div className="seller-product-combo-price">
                          <b>$</b>
                          <span>{comboPrice > 0 ? money(comboPrice) : <em style={{ color: "var(--text-tertiary)" }}>Sin precio</em>}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`seller-product-profit ${comboProfit > 0 ? "is-positive" : ""}`}>
                      <TrendingUp size={16} />
                      <span>Ganancia estimada</span>
                      <strong>{comboProfit > 0 ? `${money(comboProfit)} (${comboPct}%)` : "—"}</strong>
                    </div>

                    <button
                      type="button"
                      className={`seller-product-btn ${combo.active ? "seller-product-btn--save" : "seller-product-btn--ghost"}`}
                      onClick={() => toggleCombo(combo)}
                    >
                      <Power size={15} />
                      {combo.active ? "Activo en tienda" : "Inactivo"}
                    </button>
                    <div className="seller-product-actions">
                      <button
                        type="button"
                        className="seller-product-btn seller-product-btn--edit"
                        onClick={() => navigate(`/pages/${pageId}/combos/${combo.id}/edit`)}
                        style={{ flex: 1 }}
                      >
                        <Pencil size={15} />
                        Editar combo
                      </button>
                      <button
                        type="button"
                        className="seller-product-btn seller-product-btn--remove"
                        onClick={() => deleteCombo(combo)}
                        style={{ flex: "0 0 auto", padding: "0 12px" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>);
                })()}
              </div>
            </article>
          ))}

          {products.map((product, index) => {
            const info       = getInfo(product);
            const saving     = savingId === product.id;
            const isLowStock = product.is_low_stock === true;
            const promoPrice = Number(promos[product.id]?.promoPrice || 0);
            const promoPct   = promoPrice > 0 && info.sale > promoPrice
              ? Math.round(((info.sale - promoPrice) / info.sale) * 100)
              : 0;
            return (
              <article
                key={product.id}
                className={`seller-product-card ${info.inStore ? "is-in-store" : "is-not-in-store"} ${!info.valid && info.sale > 0 ? "has-price-error" : ""} ${isLowStock ? "is-low-stock" : ""}`.trim()}
                style={{ animationDelay: `${index * 22}ms` }}
              >
                <div className="seller-product-card__media">
                  <ProductImage product={product} />
                  {info.inStore && (
                    <span className="seller-product-card__badge seller-product-card__badge--desktop-only">
                      <BadgeCheck size={13} />
                      En tienda
                    </span>
                  )}
                  {info.inStore && (
                    <button
                      type="button"
                      className={`seller-product-card__shipping-badge ${product.free_shipping ? "is-active" : ""}`}
                      onClick={() => toggleFreeShipping(product)}
                      title={product.free_shipping ? "Envío gratis activo — clic para desactivar" : "Activar envío gratis"}
                      aria-pressed={product.free_shipping}
                    >
                      <Truck size={12} />
                      <span>Envío gratis</span>
                      <b>{product.free_shipping ? "Sí" : "No"}</b>
                    </button>
                  )}
                  {isLowStock && info.inStore && (
                    <div className="seller-product-card__stock-warn">
                      <AlertTriangle size={11} />
                      <span>Sin stock · No visible en tu tienda</span>
                    </div>
                  )}
                  {!info.inStore && (
                    <span className="seller-product-card__not-added">
                      Sin agregar
                    </span>
                  )}

                  {info.inStore && (
                    <Link
                      to={`/pages/${pageId}/products/${product.id}/edit`}
                      className="seller-product-card__edit-media"
                      title="Editar imagen y descripción"
                    >
                      <Pencil size={13} />
                      Editar
                    </Link>
                  )}
                </div>

                <div className="seller-product-card__body">
                  <div>
                    <h3 title={productName(product)}>{productName(product)}</h3>
                    <p className="seller-product-card__meta">
                      {productCode(product)} ·{" "}
                      <span style={{ color: isLowStock ? "#f59e0b" : "inherit", fontWeight: isLowStock ? 600 : undefined }}>
                        Stock: {fmt(productStock(product))}{isLowStock ? " ⚠" : ""}
                      </span>
                    </p>
                  </div>

                  <div className="seller-product-prices">
                    <div className="seller-product-price seller-product-price--cost">
                      <span>Costo</span>
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

                  <div className="seller-product-sale-wrap">
                    <label className="seller-product-sale">
                      <span>Tu precio</span>
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
                    {info.inStore && (
                      <div className={`seller-product-sale seller-product-sale--promo ${promoPct > 0 ? "is-active" : ""}`}>
                        <span className="seller-product-promo-label">
                          {promoPct > 0 ? (
                            <span className="seller-product-promo-off-badge">{promoPct}% OFF</span>
                          ) : (
                            <>
                              Precio promocional
                              <span
                                className="seller-product-promo-info"
                                onMouseEnter={e => {
                                  const r = e.currentTarget.getBoundingClientRect();
                                  setInfoTip({ x: r.left + r.width / 2, y: r.top, text: "Precio con descuento. Si es menor a tu precio normal, la tienda muestra el % de ahorro automáticamente (ej: 10% OFF)." });
                                }}
                                onMouseLeave={() => setInfoTip(null)}
                              >
                                <Info size={11} />
                              </span>
                            </>
                          )}
                        </span>
                        <div>
                          <b>$</b>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            placeholder="Opcional"
                            aria-label="Precio promocional"
                            value={promos[product.id]?.promoPrice ?? ""}
                            onChange={e => setPromos(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || {}), promoPrice: e.target.value } }))}
                          />
                        </div>
                        {promoPrice > 0 && promoPrice < info.cost && (
                          <small className="seller-product-promo-hint is-warn">
                            Mínimo {money(info.cost)}
                          </small>
                        )}
                        {promoPrice > 0 && promoPrice >= info.cost && promoPct === 0 && (
                          <small className="seller-product-promo-hint is-warn">
                            Debe ser menor al precio
                          </small>
                        )}
                      </div>
                    )}
                  </div>

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
                    {comboMode ? (
                      <button
                        type="button"
                        className={`seller-product-btn ${comboSelected.has(product.id) ? "seller-product-btn--save" : "seller-product-btn--add"}`}
                        onClick={() => toggleComboProduct(product.id)}
                        style={{ flex: 1 }}
                      >
                        {comboSelected.has(product.id) ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                        {comboSelected.has(product.id) ? "En el combo ✓" : "Agregar al combo"}
                      </button>
                    ) : !info.inStore ? (
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
                          Guardar precio
                        </button>
                        <Link
                          to={`/pages/${pageId}/products/${product.id}/edit`}
                          className="seller-product-btn seller-product-btn--edit"
                        >
                          <Pencil size={16} />
                          Editar
                        </Link>
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
        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
            <button
              type="button"
              className="seller-product-btn seller-product-btn--add"
              onClick={loadMore}
              disabled={loadingMore}
              style={{ minWidth: 220 }}
            >
              {loadingMore ? <Loader2 size={16} className="seller-products-spin" /> : <Plus size={16} />}
              {loadingMore ? "Cargando..." : "Ver más productos"}
            </button>
          </div>
        )}
        </>
      )}

    </div>
  );
}
