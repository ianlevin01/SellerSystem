import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import client from "../api/client";
import "../styles/Combos.css";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Flame,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  ShoppingBag,
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

// Imagen de la card de catálogo ML — clase propia, sin compartir seller-product-card__image:
// esa clase tiene varias reglas !important de "Mis productos" (alturas por breakpoint,
// aspect-ratio) que pisaban cualquier override e inflaban la imagen tapando el título.
function MlCatalogImage({ product }) {
  const img = firstImage(product);
  if (!img) {
    return (
      <div className="ml-catalog-card__image ml-catalog-card__image--empty">
        <ImageIcon size={26} />
      </div>
    );
  }
  return (
    <div className="ml-catalog-card__image">
      <img src={img} alt={productName(product)} loading="lazy" />
    </div>
  );
}

// ── Card del catálogo en modo ML — el flujo acá es "elegir qué publicar", no fijar precio
// de tienda propia (por eso no comparte el DOM del card de "Mis productos": ese arrastra
// bloques de precio/promo/ganancia que nunca aplican del lado ML). ──────────────────────
function MlCatalogCard({ product, cost, isNew, isTopSeller, comboMode, isSelected, saving, onPublish, onToggleCombo, onRequestSample, onReserve, canReserve }) {
  return (
    <article className={`ml-catalog-card${comboMode && isSelected ? " is-selected" : ""}`}>
      <div className="ml-catalog-card__media">
        <MlCatalogImage product={product} />
        {isTopSeller ? (
          <span className="ml-catalog-card__badge ml-catalog-card__badge--fire" title="Entre los 10 productos más vendidos de la última semana">
            <Flame size={12} /> Top ventas
          </span>
        ) : isNew && (
          <span className="ml-catalog-card__badge ml-catalog-card__badge--new">
            <Sparkles size={11} /> Nuevo
          </span>
        )}
      </div>
      <div className="ml-catalog-card__body">
        <h3 title={productName(product)}>{productName(product)}</h3>
        <p className="ml-catalog-card__meta">
          {productCode(product)} · Stock {fmt(productStock(product))}
        </p>
        <div className="ml-catalog-card__cost">
          <span>Costo</span>
          <strong>{money(cost)}</strong>
        </div>
        <div className="ml-catalog-card__actions">
          {comboMode ? (
            <button type="button" className={`ml-catalog-card__btn${isSelected ? " is-selected" : ""}`} onClick={onToggleCombo}>
              {isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
              {isSelected ? "En el combo" : "Agregar al combo"}
            </button>
          ) : (
            <>
              <button type="button" className="ml-catalog-card__btn ml-catalog-card__btn--primary" onClick={onPublish} disabled={saving}>
                {saving && <Loader2 size={14} className="seller-products-spin" />}
                Publicar en Mercado Libre
              </button>
              <div className="ml-catalog-card__secondary-row">
                <button type="button" className="ml-catalog-card__icon-btn" onClick={onRequestSample} title="Solicitar una muestra para vos">
                  <ShoppingBag size={14} />
                </button>
                <button type="button" className="ml-catalog-card__icon-btn" onClick={onReserve} disabled={!canReserve} title={canReserve ? "Reservar stock" : "Sin stock disponible para reservar"}>
                  <Package size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

const PAGE_SIZE = 20;
const FREE_SHIPPING_MIN_MARGIN = 15000;

const AR_PROVINCES = [
  "Buenos Aires","Ciudad Autónoma de Buenos Aires","Catamarca","Chaco","Chubut",
  "Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja",
  "Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis",
  "Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán",
];

// ─── Modal: solicitar muestra ─────────────────────────────────────────────────
function SellerRequestModal({ product, onClose, pageId }) {
  const [step,            setStep]           = useState("postal"); // postal | method
  const [postalCode,      setPostalCode]     = useState("");
  const [rates,           setRates]          = useState([]);
  const [shippingType,    setShippingType]   = useState(null);  // "pickup" | "home" | "branch"
  const [selectedRate,    setSelectedRate]   = useState(null);
  const [street,          setStreet]         = useState("");
  const [streetNum,       setStreetNum]      = useState("");
  const [city,            setCity]           = useState("");
  const [province,        setProvince]       = useState("");
  const [branchProvince,  setBranchProvince] = useState("");
  const [agencies,        setAgencies]       = useState([]);
  const [selectedBranch,  setSelectedBranch] = useState(null);
  const [fetchingAgencies,setFetchingAgencies] = useState(false);
  const [loadingRates,    setLoadingRates]   = useState(false);
  const [loadingCO,       setLoadingCO]      = useState(false);
  const [error,           setError]          = useState("");

  const precio1     = resellerCost(product);
  const homeRates   = rates.filter(r => r.home_delivery);
  const branchRates = rates.filter(r => r.branch_pickup);

  async function fetchRates() {
    if (!postalCode.trim() || postalCode.length < 4) {
      setError("Ingresá un código postal válido.");
      return;
    }
    setError("");
    setLoadingRates(true);
    try {
      const res = await client.get("/seller/products/shipping-quote", { params: { postal_code: postalCode.trim() } });
      setRates(res.data.rates || []);
      setStep("method");
      setShippingType(null);
      setSelectedRate(null);
    } catch {
      setError("Error al obtener tarifas. Verificá el código postal.");
    } finally {
      setLoadingRates(false);
    }
  }

  async function fetchAgencies(prov) {
    setBranchProvince(prov);
    setSelectedBranch(null);
    setAgencies([]);
    if (!prov) return;
    setFetchingAgencies(true);
    try {
      const res = await client.get("/seller/products/shipping-agencies", { params: { province: prov, cp: postalCode.trim() } });
      setAgencies(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAgencies([]);
    } finally {
      setFetchingAgencies(false);
    }
  }

  function selectType(type) {
    setShippingType(type);
    setSelectedRate(type === "home" ? (homeRates[0] || null) : type === "branch" ? (branchRates[0] || null) : null);
    setSelectedBranch(null);
    setBranchProvince("");
    setAgencies([]);
  }

  function isReadyToPay() {
    if (!shippingType) return false;
    if (shippingType === "pickup") return true;
    if (!selectedRate) return false;
    if (shippingType === "home" && (!street.trim() || !streetNum.trim() || !city.trim())) return false;
    if (shippingType === "branch" && !selectedBranch) return false;
    return true;
  }

  async function checkout() {
    if (!isReadyToPay()) return;
    setLoadingCO(true);
    setError("");
    try {
      const shipping = shippingType === "pickup"
        ? { type: "pickup" }
        : {
            type: shippingType,
            postal_code: postalCode.trim(),
            rate: selectedRate,
            street: street.trim() || null,
            street_number: streetNum.trim() || null,
            city: shippingType === "branch" ? (selectedBranch?.city || null) : (city.trim() || null),
            branch_id:   selectedBranch?.id   || null,
            branch_name: selectedBranch?.name || null,
          };
      const res = await client.post("/seller/products/request-product", { product_id: product.id, shipping, page_id: pageId || null });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear el checkout.");
      setLoadingCO(false);
    }
  }

  const shippingCost = shippingType === "pickup" ? 0 : Number(selectedRate?.price || 0);
  const total        = precio1 + shippingCost;

  const btnStyle = { padding: "10px 14px", borderRadius: 8, border: "1.5px solid", cursor: "pointer", textAlign: "left", width: "100%", display: "block", background: "#fff", transition: "border-color .15s, background .15s" };
  const btnActive = { borderColor: "#22c55e", background: "rgba(34,197,94,.07)" };
  const btnInactive = { borderColor: "#e5e7eb" };

  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Solicitar muestra</h2>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            <strong style={{ color: "#111" }}>{productName(product)}</strong>
            <br />1 unidad para vos — para mostrarle el producto a tus clientes.
          </p>

          {/* ── Paso 1: código postal ── */}
          {step === "postal" && (
            <>
              <div style={{ fontWeight: 600, fontSize: 13 }}>¿Cuál es tu código postal?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="seller-product-price-input"
                  placeholder="Ej: 1414"
                  value={postalCode}
                  onChange={e => { setPostalCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && fetchRates()}
                  maxLength={8}
                  style={{ flex: 1, padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 14 }}
                />
                <button type="button" className="seller-product-btn seller-product-btn--save"
                  onClick={fetchRates} disabled={loadingRates || postalCode.length < 4}>
                  {loadingRates ? <Loader2 size={14} className="seller-products-spin" /> : "Ver opciones"}
                </button>
              </div>
              <button type="button" className="seller-product-btn seller-product-btn--save"
                onClick={() => { setStep("method"); setShippingType("pickup"); setRates([]); }}
                style={{ background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", fontWeight: 500 }}>
                Prefiero pasar a buscar (gratis)
              </button>
            </>
          )}

          {/* ── Paso 2: método ── */}
          {step === "method" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" className="seller-product-btn seller-product-btn--edit"
                  onClick={() => { setStep("postal"); setShippingType(null); setSelectedRate(null); }}
                  style={{ padding: "6px 10px", fontSize: 12 }}>← Atrás</button>
                <span style={{ fontSize: 12, color: "#6b7280" }}>CP {postalCode}</span>
              </div>

              <div style={{ fontWeight: 600, fontSize: 13 }}>¿Cómo querés recibirlo?</div>

              {/* Pickup */}
              <button type="button" onClick={() => selectType("pickup")}
                style={{ ...btnStyle, ...(shippingType === "pickup" ? btnActive : btnInactive) }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>Pasar a buscar</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Sin costo de envío</div>
              </button>

              {/* Sucursal */}
              {branchRates.length > 0 && (
                <button type="button" onClick={() => selectType("branch")}
                  style={{ ...btnStyle, ...(shippingType === "branch" ? btnActive : btnInactive) }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>Correo Argentino — Sucursal</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Desde {money(branchRates[0].price)} · Retirás en una sucursal cercana
                  </div>
                </button>
              )}
              {shippingType === "branch" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 12, borderLeft: "2px solid #e5e7eb" }}>
                  {branchRates.length > 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {branchRates.map(r => (
                        <label key={r.code} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
                          <input type="radio" name="branch_rate" checked={selectedRate?.code === r.code} onChange={() => setSelectedRate(r)} />
                          <span style={{ flex: 1 }}>{r.name}</span>
                          <span style={{ fontWeight: 600 }}>{money(r.price)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                      Provincia para buscar sucursales
                    </label>
                    <select
                      value={branchProvince}
                      onChange={e => fetchAgencies(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13 }}
                    >
                      <option value="">Seleccioná una provincia</option>
                      {AR_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {fetchingAgencies && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#6b7280" }}>
                      <Loader2 size={14} className="seller-products-spin" /> Buscando sucursales...
                    </div>
                  )}
                  {!fetchingAgencies && agencies.length > 0 && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                        Sucursal *
                        {postalCode && <span style={{ marginLeft: 6, fontWeight: 400, color: "#6b7280" }}>cercanas a CP {postalCode}</span>}
                      </label>
                      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                        {agencies.map(a => (
                          <label key={a.id} style={{
                            display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", cursor: "pointer",
                            borderBottom: "1px solid #f3f4f6",
                            background: selectedBranch?.id === a.id ? "rgba(34,197,94,.07)" : "transparent",
                          }}>
                            <input type="radio" name="branch_agency" style={{ marginTop: 3 }}
                              checked={selectedBranch?.id === a.id}
                              onChange={() => setSelectedBranch(a)} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                                {a.address}{a.city ? `, ${a.city}` : ""}{a.cp ? ` · CP ${a.cp}` : ""}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {!fetchingAgencies && branchProvince && agencies.length === 0 && (
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No se encontraron sucursales para esa provincia.</p>
                  )}
                </div>
              )}

              {/* Domicilio */}
              {homeRates.length > 0 && (
                <button type="button" onClick={() => selectType("home")}
                  style={{ ...btnStyle, ...(shippingType === "home" ? btnActive : btnInactive) }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>Correo Argentino — Domicilio</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Desde {money(homeRates[0].price)} · Envío a tu dirección
                  </div>
                </button>
              )}
              {shippingType === "home" && homeRates.length > 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 12 }}>
                  {homeRates.map(r => (
                    <label key={r.code} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" name="home_rate" checked={selectedRate?.code === r.code} onChange={() => setSelectedRate(r)} />
                      <span style={{ flex: 1 }}>{r.name}</span>
                      <span style={{ fontWeight: 600 }}>{money(r.price)}</span>
                    </label>
                  ))}
                </div>
              )}
              {shippingType === "home" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                    <input placeholder="Calle *" value={street} onChange={e => setStreet(e.target.value)}
                      style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13 }} />
                    <input placeholder="Número *" value={streetNum} onChange={e => setStreetNum(e.target.value)}
                      style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, width: 90 }} />
                  </div>
                  <input placeholder="Ciudad *" value={city} onChange={e => setCity(e.target.value)}
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13 }} />
                </div>
              )}

              {/* Total */}
              {shippingType && (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {shippingType === "pickup" ? "Total a pagar" : `Total (producto ${selectedRate ? `+ ${money(selectedRate.price)} envío` : ""})`}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{money(total)}</div>
                </div>
              )}
            </>
          )}

          {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

          {(shippingType) && (
            <button type="button" className="seller-product-btn seller-product-btn--save"
              onClick={checkout} disabled={loadingCO || !isReadyToPay()}>
              {loadingCO ? <Loader2 size={15} className="seller-products-spin" /> : <ShoppingBag size={15} />}
              {loadingCO ? "Procesando..." : "Ir a pagar"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Modal: reservar stock ────────────────────────────────────────────────────
function StockReserveModal({ product, onClose, pageId }) {
  const [quantity,        setQuantity]        = useState(1);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error,           setError]           = useState("");

  const precio1          = resellerCost(product);
  const availableReserve = Number(product.available_for_reserve || 0);
  const total            = precio1 * quantity;

  async function checkout() {
    if (quantity < 1 || quantity > availableReserve) return;
    setLoadingCheckout(true);
    setError("");
    try {
      const res = await client.post("/seller/products/reserve-stock", { product_id: product.id, quantity, page_id: pageId || null });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear el checkout.");
      setLoadingCheckout(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ width: "100%", maxWidth: 420 }}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Reservar stock</h2>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            <strong style={{ color: "#111" }}>{productName(product)}</strong>
            <br />Las unidades reservadas son exclusivas para vos. Cuando alguien te compra, se descuenta de tu reserva y te llevás la ganancia completa.
          </p>

          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Disponible para reservar</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>{availableReserve} unidad{availableReserve !== 1 ? "es" : ""}</div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Cantidad a reservar</label>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1.5px solid #d1d5db", borderRadius: 8, width: "fit-content", overflow: "hidden" }}>
              <button type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                style={{ width: 40, height: 40, border: "none", background: "#f9fafb", cursor: "pointer", fontSize: 18, fontWeight: 700, color: quantity <= 1 ? "#d1d5db" : "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
                −
              </button>
              <div style={{ borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", padding: "0 20px", height: 40, display: "flex", alignItems: "center", fontSize: 16, fontWeight: 700, minWidth: 60, justifyContent: "center" }}>
                {quantity}
              </div>
              <button type="button"
                onClick={() => setQuantity(q => Math.min(availableReserve, q + 1))}
                disabled={quantity >= availableReserve}
                style={{ width: 40, height: 40, border: "none", background: "#f9fafb", cursor: "pointer", fontSize: 18, fontWeight: 700, color: quantity >= availableReserve ? "#d1d5db" : "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
                +
              </button>
            </div>
          </div>

          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Total ({quantity} × {money(precio1)})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{money(total)}</div>
          </div>

          {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

          <button type="button" className="seller-product-btn seller-product-btn--save"
            onClick={checkout}
            disabled={loadingCheckout || quantity < 1 || quantity > availableReserve || availableReserve === 0}>
            {loadingCheckout ? <Loader2 size={15} className="seller-products-spin" /> : <Package size={15} />}
            {loadingCheckout ? "Procesando..." : `Reservar ${quantity} unidad${quantity !== 1 ? "es" : ""}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PageProducts({ pageId, mode = "page", onPublishToMl, onComboReadyForMl }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [products,      setProducts]      = useState([]);
  const [locallyAdded,  setLocallyAdded]  = useState({});
  const [combos,        setCombos]        = useState([]);
  const [comboPromos,     setComboPromos]     = useState({}); // comboId → promoPrice string
  const [comboPriceEdits, setComboPriceEdits] = useState({}); // comboId → mainPrice string
  const [savingComboPromoId, setSavingComboPromoId] = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null); // null | { product }
  const [categories,    setCategories]    = useState([]);
  const [prices,        setPrices]        = useState({});
  const [query,         setQuery]         = useState("");
  const [category,      setCategory]      = useState("all");
  const [onlyMine,      setOnlyMine]      = useState(false);
  const [minStock,      setMinStock]      = useState("");
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState(0);
  const [promos,        setPromos]        = useState({});
  const [savingId,      setSavingId]      = useState(null);
  const [bulkSaving,    setBulkSaving]    = useState(false);
  const [sellerPlan,    setSellerPlan]    = useState(null);
  const [message,       setMessage]       = useState("");
  const [toast,         setToast]         = useState(null);
  const [infoTip,       setInfoTip]       = useState(null);
  const [fsModal,       setFsModal]       = useState(null); // free shipping warning modal
  const toastTimerRef = useRef(null);
  const toolbarRef = useRef(null);
  const [fixedToolbar, setFixedToolbar] = useState({ show: false, left: 0, width: 0, top: 0 });
  // Combo mode
  const [comboMode,     setComboMode]     = useState(false);
  const [comboSelected, setComboSelected] = useState(new Set());
  const [creatingCombo, setCreatingCombo] = useState(false);
  const [requestModal, setRequestModal] = useState(null);
  const [reserveModal, setReserveModal] = useState(null);
  const [confirmBanner, setConfirmBanner] = useState(null);
  const [topSellingIds, setTopSellingIds] = useState(() => new Set());
  const debounceRef  = useRef(null);
  const abortRef     = useRef(null);
  const sentinelRef  = useRef(null);

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
    const params = new URLSearchParams(location.search);
    const confirmed = params.get("confirmed");
    if (confirmed === "seller_request" || confirmed === "stock_reserve") {
      setConfirmBanner(confirmed);
      navigate(location.pathname, { replace: true });
    }
  }, []);

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
    client.get("/seller/subscriptions/status")
      .then(r => setSellerPlan(r.data?.current?.plan_id || "inicial"))
      .catch(() => setSellerPlan("inicial"));
  }, []);

  useEffect(() => {
    if (location.state?.returnToMine) setOnlyMine(true);
  }, [location.state]);

  useEffect(() => {
    client.get("/seller/store/categories").then(res => {
      const raw = res.data;
      setCategories(Array.isArray(raw) ? raw : raw?.categories || []);
    }).catch(() => {});
    if (mode !== "page") return; // los combos son un concepto de tienda web, no aplican en modo ML
    client.get(`/seller/store/pages/${pageId}/combos`).then(res => {
      const data = res.data || [];
      setCombos(data);
      const pm = {};
      data.forEach(c => { pm[c.id] = c.promo_enabled && c.promo_price ? String(c.promo_price) : ""; });
      setComboPromos(pm);
    }).catch(() => {});
  }, [pageId, mode]);

  // Badge "Top ventas" del catálogo ML — top 10 productos más vendidos (7 días), una sola vez.
  useEffect(() => {
    if (mode !== "ml") return;
    client.get("/seller/products/top-selling").then(res => {
      setTopSellingIds(new Set(res.data?.productIds || []));
    }).catch(() => {});
  }, [mode]);

  // Re-fetch cuando cambian los filtros (búsqueda con debounce)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    setHasMore(false); // desconecta el observer inmediatamente para evitar loadMore con filtros viejos
    debounceRef.current = setTimeout(() => fetchProducts(0), (query || minStock) ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [pageId, query, category, onlyMine, minStock, comboMode]);

  // Infinite scroll — carga más cuando el sentinel llega al viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "300px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  async function fetchProducts(offset = 0) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setMessage("");

    const params = { limit: PAGE_SIZE, offset };
    if (query.trim())       params.search      = query.trim();
    if (category !== "all") params.category_id = category;
    if (mode === "ml") {
      // Nunca se puede publicar en ML algo sin stock real disponible (contando la reserva) —
      // el filtro de stock mínimo que carga el vendedor solo puede subir ese piso, nunca bajarlo.
      const typedMin = minStock.trim() ? Number(minStock) : 0;
      params.min_stock = Math.max(1, typedMin);
    }
    if (mode === "page") {
      // "en mi tienda"/"todos" es un concepto de página web — en modo ML se ve el catálogo completo
      if (onlyMine)        params.only_mine = "true";
      else if (!comboMode) params.not_mine  = "true";
    }

    try {
      const url = mode === "ml" ? "/seller/products" : `/seller/store/pages/${pageId}/products`;
      const res  = await client.get(url, { params, signal: controller.signal });
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
    // "En tienda" es un concepto de página web — en modo ML nunca aplica (evita links/acciones rotas con pageId undefined)
    const inStore   = mode === "page" && (isProductInStore(product) || Boolean(locallyAdded[productKey(product.id)]));
    const profit    = sale - cost;
    // Si tiene envío gratis activo el precio mínimo se eleva
    const minPrice  = product.free_shipping ? cost + FREE_SHIPPING_MIN_MARGIN : cost;
    const valid     = cost > 0 && sale >= minPrice;
    const priceChanged = inStore && Math.round(sale) !== Math.round(saved || suggested);
    const promoState   = promos[product.id] || {};
    const promoChanged = inStore && (
      String(promoState.promoPrice ?? "") !== String(product.promo_price ?? "") ||
      Boolean(promoState.promoEnabled) !== Boolean(product.promo_enabled)
    );
    const changed = priceChanged || promoChanged;
    // Ganancia efectiva: usa precio promo si está activo y es válido
    const promoPrice   = Number(promoState.promoPrice) || 0;
    const promoActive  = promoPrice > 0 && promoPrice < sale && promoPrice >= minPrice;
    const effectiveProfit = promoActive ? promoPrice - cost : profit;
    return { cost, suggested, sale, saved, profit, effectiveProfit, valid, changed, inStore, minPrice,
             profitPct: cost > 0 ? Math.round((profit / cost) * 100) : 0 };
  }

  function useSuggested(product) { setPrice(product.id, suggestedPrice(product)); }

  async function addProduct(product) {
    if (mode === "ml") { onPublishToMl?.(product); return; }
    const info = getInfo(product);
    if (!info.valid) {
      setMessage(`Para agregar "${productName(product)}", el precio tiene que ser igual o mayor a ${money(info.minPrice)}.`);
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
      const msg = product.free_shipping
        ? `Con envío gratis, el precio de "${productName(product)}" no puede ser menor a ${money(info.minPrice)} (costo + margen de envío).`
        : `El precio de "${productName(product)}" no puede ser menor a ${money(info.cost)}.`;
      setMessage(msg);
      return false;
    }
    const promo      = promos[product.id] || {};
    const promoPrice = Number(promo.promoPrice) || 0;
    const promoEnabled = promoPrice > 0;
    if (promoEnabled && promoPrice < info.minPrice) {
      showErrorToast(`El precio promo no puede ser menor al mínimo permitido (${money(info.minPrice)}).`);
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
      // Eliminar de la lista local para que desaparezca de "En mi tienda" inmediatamente
      setProducts(prev => prev.filter(item => !sameProductId(item.id, product.id)));
      setTotal(prev => Math.max(0, prev - 1));
      setMessage("Producto quitado de tu tienda.");
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo quitar el producto.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function applyFreeShipping(product, adjustPrice = false) {
    const cost       = resellerCost(product);
    const minRequired = cost + FREE_SHIPPING_MIN_MARGIN;
    try {
      if (adjustPrice) {
        // Ajustar precio al mínimo requerido antes de activar
        await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/price`, { custom_price: minRequired });
        setPrices(prev => ({ ...prev, [product.id]: String(minRequired) }));
        setProducts(prev => prev.map(p => sameProductId(p.id, product.id)
          ? { ...p, custom_price: minRequired, precio_venta: minRequired }
          : p
        ));
      }
      await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/customize`, { free_shipping: true });
      setProducts(prev => prev.map(p => sameProductId(p.id, product.id) ? { ...p, free_shipping: true } : p));
      setFsModal(null);
    } catch (err) {
      setMessage(err.response?.data?.message || "No se pudo actualizar el envío.");
      setFsModal(null);
    }
  }

  async function toggleFreeShipping(product) {
    const newVal = !product.free_shipping;

    if (!newVal) {
      // Desactivar: directo, sin validación
      try {
        await client.patch(`/seller/store/pages/${pageId}/products/${product.id}/customize`, { free_shipping: false });
        setProducts(prev => prev.map(p => sameProductId(p.id, product.id) ? { ...p, free_shipping: false } : p));
      } catch (err) {
        setMessage(err.response?.data?.message || "No se pudo actualizar el envío.");
      }
      return;
    }

    // Activar: validar que el precio actual cubre el margen de envío
    const cost        = resellerCost(product);
    const currentPrice = roundPrice(prices[product.id]) || roundPrice(backendPagePrice(product));
    const minRequired  = cost + FREE_SHIPPING_MIN_MARGIN;

    if (cost > 0 && currentPrice < minRequired) {
      // Precio insuficiente → mostrar modal con opciones
      setFsModal({ type: "product", product, cost, minRequired, currentPrice });
    } else {
      // Precio OK → activar directamente
      await applyFreeShipping(product, false);
    }
  }

  async function savePromo(product) {
    const promo = promos[product.id] || {};
    const promoPrice = Number(promo.promoPrice);
    const promoEnabled = promoPrice > 0;
    if (promoEnabled) {
      const info = getInfo(product);
      if (promoPrice < info.minPrice) {
        showErrorToast(`El precio promo no puede ser menor al mínimo permitido (${money(info.minPrice)}).`);
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
    if (newVal) {
      // Activar en combo: mostrar aviso informativo (no tenemos el costo del combo en el front)
      setFsModal({ type: "combo", combo, onConfirm: async () => {
        try {
          await client.patch(`/seller/store/pages/${pageId}/combos/${combo.id}`, { free_shipping: true });
          setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, free_shipping: true } : c));
        } catch { /* silent */ }
        setFsModal(null);
      }});
      return;
    }
    try {
      await client.patch(`/seller/store/pages/${pageId}/combos/${combo.id}`, { free_shipping: false });
      setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, free_shipping: false } : c));
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

  async function saveComboPromo(combo) {
    const promoNum   = Number(comboPromos[combo.id] ?? (combo.promo_price || 0));
    const newPrice   = comboPriceEdits[combo.id] !== undefined
      ? Number(comboPriceEdits[combo.id])
      : Number(combo.custom_price);
    if (newPrice <= 0) { setMessage("El precio del combo debe ser mayor a 0."); return; }
    setSavingComboPromoId(combo.id);
    try {
      await client.patch(`/seller/store/pages/${pageId}/combos/${combo.id}`, {
        custom_price: newPrice,
        promo_price:  promoNum > 0 ? promoNum : null,
      });
      setCombos(prev => prev.map(c => c.id === combo.id
        ? { ...c, custom_price: newPrice, promo_price: promoNum > 0 ? promoNum : null, promo_enabled: promoNum > 0 }
        : c
      ));
      // Limpiar edits → botón vuelve a gris
      setComboPromos(prev => { const n = { ...prev }; delete n[combo.id]; return n; });
      setComboPriceEdits(prev => { const n = { ...prev }; delete n[combo.id]; return n; });
      setMessage("Cambios guardados.");
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error al guardar.");
    } finally {
      setSavingComboPromoId(null);
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
      if (mode === "ml") {
        const res = await client.post(`/seller/ml/combos`, {
          products: Array.from(comboSelected).map(id => ({ productId: id, quantity: 1 })),
        });
        setComboMode(false);
        setComboSelected(new Set());
        setCreatingCombo(false);
        onComboReadyForMl?.(res.data.id);
        return;
      }
      const res = await client.post(`/seller/store/pages/${pageId}/combos`, {
        name: "Nuevo combo",
        products: Array.from(comboSelected).map(id => ({ product_id: id, quantity: 1 })),
        custom_price: 0,
      });
      navigate(`/pages/${pageId}/combos/${res.data.id}/edit`, { state: { isNew: true } });
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
        {mode === "page" && (
          <div className="seller-products-tabs">
            <button type="button" className={!onlyMine ? "is-active" : ""} onClick={() => setOnlyMine(false)}>Todos</button>
            <button type="button" className={onlyMine  ? "is-active" : ""} onClick={() => setOnlyMine(true)}>En mi tienda</button>
          </div>
        )}
        {mode === "ml" && (
          <div className="ml-stock-filter">
            <label htmlFor="ml-min-stock">Stock mayor a</label>
            <input
              id="ml-min-stock"
              type="number"
              min="0"
              value={minStock}
              onChange={e => setMinStock(e.target.value)}
              placeholder="0"
            />
          </div>
        )}
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
    <div className="seller-products" style={comboMode ? { paddingBottom: 90 } : undefined}>

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

      {/* Modal de advertencia envío gratis */}
      {fsModal && createPortal(
        <div className="fs-modal-backdrop" onClick={() => setFsModal(null)}>
          <div className="fs-modal" onClick={e => e.stopPropagation()}>
            <div className="fs-modal__icon">
              <Truck size={28} />
            </div>
            <h3 className="fs-modal__title">Envío gratis — revisá tu margen</h3>
            <p className="fs-modal__body">
              El costo del envío puede variar entre <strong>$4.000 y $15.000</strong> por pedido.
              Si activás envío gratis, ese costo lo absorbés vos, por lo que necesitás un margen suficiente para no perder plata.
            </p>

            {fsModal.type === "product" && (
              <div className="fs-modal__detail">
                <div className="fs-modal__row">
                  <span>Tu precio actual</span>
                  <strong className="fs-modal__val--warn">{money(fsModal.currentPrice)}</strong>
                </div>
                <div className="fs-modal__row">
                  <span>Mínimo requerido</span>
                  <strong className="fs-modal__val--ok">{money(fsModal.minRequired)}</strong>
                </div>
                <div className="fs-modal__row fs-modal__row--gap">
                  <span>Diferencia</span>
                  <strong>{money(fsModal.minRequired - fsModal.currentPrice)} por debajo del mínimo</strong>
                </div>
              </div>
            )}

            {fsModal.type === "combo" && (
              <p className="fs-modal__note">
                Para combos, asegurate de que el precio del combo cubra el costo de envío.
              </p>
            )}

            <div className="fs-modal__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setFsModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  if (fsModal.type === "product") applyFreeShipping(fsModal.product, true);
                  else if (fsModal.type === "combo") fsModal.onConfirm();
                }}
              >
                <Truck size={15} />
                {fsModal.type === "product"
                  ? `Ajustar precio a ${money(fsModal.minRequired)} y activar`
                  : "Activar envío gratis"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal confirmar quitar producto ──────────────────── */}
      {confirmDelete && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 20, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.2)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header rojo */}
            <div style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)", borderBottom: "1px solid #fecaca", padding: "24px 24px 20px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={22} color="#dc2626" />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111" }}>
                ¿Quitar de tu tienda?
              </h3>
            </div>
            {/* Cuerpo */}
            <div style={{ padding: "20px 24px 24px" }}>
              <p style={{ margin: "0 0 6px", fontSize: ".9rem", color: "#374151", textAlign: "center" }}>
                Vas a quitar <strong style={{ color: "#111" }}>
                  {confirmDelete.product.custom_name || confirmDelete.product.name}
                </strong> de tu tienda.
              </p>
              <p style={{ margin: "0 0 22px", fontSize: ".82rem", color: "#9ca3af", textAlign: "center" }}>
                Podés volver a agregarlo cuando quieras desde la sección Todos.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none" }}
                  onClick={() => {
                    const prod = confirmDelete.product;
                    setConfirmDelete(null);
                    removeProduct(prod);
                  }}
                >
                  <Trash2 size={15} />
                  Quitar de mi tienda
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {comboMode && createPortal(
        <div className="combo-finalize-bar">
          <span className="combo-finalize-bar__count">
            {comboSelected.size === 0
              ? "Ningún producto seleccionado"
              : `${comboSelected.size} producto${comboSelected.size !== 1 ? "s" : ""} seleccionado${comboSelected.size !== 1 ? "s" : ""}`}
          </span>
          <button type="button" className="btn btn--ghost btn--sm combo-finalize-bar__cancel" onClick={cancelComboMode}>
            <X size={14} /> Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={finalizeCombo}
            disabled={comboSelected.size === 0 || creatingCombo}
          >
            {creatingCombo ? <Loader2 size={16} className="seller-products-spin" /> : <CheckCircle2 size={16} />}
            {creatingCombo ? "Creando combo..." : "Finalizar combo"}
          </button>
        </div>,
        document.body
      )}

      {comboMode ? (
        <section className="combo-mode-banner">
          <div className="combo-mode-banner__info">
            <Layers size={22} />
            <div>
              <strong>Seleccioná los productos que querés incluir en el combo</strong>
              <span>Modo combo activo · tocá cada producto para agregarlo o quitarlo</span>
            </div>
          </div>
        </section>
      ) : (
        <section className={`seller-products-intro${mode === "ml" ? " seller-products-intro--ml" : ""}`}>
          <div>
            {mode === "ml" ? (
              <>
                <span><Sparkles size={13} />Catálogo</span>
                <h2>Elegí un producto para publicar en Mercado Libre</h2>
              </>
            ) : (
              <>
                <span><Sparkles size={15} />Productos</span>
                <h2>Elegí productos y definí tu precio de venta</h2>
                <p>
                  El <strong>costo</strong> es tu base. <strong>Tu precio</strong> es el precio normal.
                  Si cargás un <strong>precio promo menor</strong>, la tienda muestra automáticamente el porcentaje de descuento.
                </p>
              </>
            )}
          </div>
          {mode === "page" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
              <button type="button" className="btn btn--combo-cta" onClick={enterComboMode}>
                <Layers size={16} /> Crear combo
              </button>
              {sellerPlan === "inicial" ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  title="Disponible en Plan Pro y Max"
                  onClick={() => alert("La carga masiva de productos está disponible en el Plan Pro y Plan Max. Actualizá tu plan en la sección de suscripciones.")}
                >
                  <PackagePlus size={16} /> Agregar todos los productos visibles
                </button>
              ) : (
                <button type="button" className="btn btn--primary btn--sm" onClick={addVisibleProducts} disabled={bulkSaving}>
                  {bulkSaving ? <Loader2 size={16} className="seller-products-spin" /> : <PackagePlus size={16} />}
                  {bulkSaving ? "Agregando..." : "Agregar a mi tienda todos los productos visibles"}
                </button>
              )}
            </div>
          )}
          {mode === "ml" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
              <button type="button" className="btn btn--combo-cta" onClick={enterComboMode}>
                <Layers size={16} /> Crear combo
              </button>
            </div>
          )}
        </section>
      )}

      {renderToolbar(mode === "ml" ? "seller-products-toolbar--ml" : "", { ref: toolbarRef })}

      {fixedToolbar.show && createPortal(
        renderToolbar(`seller-products-toolbar--fixed${mode === "ml" ? " seller-products-toolbar--ml" : ""}`, {
          style: {
            left: `${fixedToolbar.left}px`,
            width: `${fixedToolbar.width}px`,
            top: `${fixedToolbar.top}px`,
          },
        }),
        document.body
      )}

      <section className={`seller-products-cats${mode === "ml" ? " seller-products-cats--ml" : ""}`}>
        <button type="button" className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>
          Todas
        </button>
        {categoryOptions.map(cat => (
          <button
            type="button"
            key={cat.id}
            title={mode === "ml" ? cat.name : undefined}
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
        <span><strong>Precio promo:</strong> si es menor a tu precio normal, la tienda lo muestra como precio especial con el original tachado.</span>
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
        <section className={`seller-products-grid${mode === "ml" ? " seller-products-grid--ml" : ""}`}>
          {/* Combos — solo visibles en la tab "En mi tienda" */}
          {!comboMode && onlyMine && combos.map(combo => (
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

                    {(() => {
                      // Precio principal: usa el edit local si existe, sino el guardado
                      const editedPriceStr = comboPriceEdits[combo.id] !== undefined
                        ? comboPriceEdits[combo.id]
                        : (comboPrice > 0 ? String(comboPrice) : "");
                      const displayPrice = Number(editedPriceStr) || comboPrice;

                      // Promo: muestra el guardado si el usuario no tocó el campo
                      const savedPromoStr = combo.promo_price
                        ? String(Math.round(Number(combo.promo_price))) : "";
                      const promoInputVal = comboPromos[combo.id] !== undefined
                        ? comboPromos[combo.id] : savedPromoStr;
                      const promoVal    = Number(promoInputVal || 0);
                      const promoPct2   = promoVal > 0 && displayPrice > promoVal
                        ? Math.round(((displayPrice - promoVal) / displayPrice) * 100) : 0;
                      const promoValid  = promoVal === 0 || (promoVal < displayPrice && promoVal >= comboCost);
                      const isSaving    = savingComboPromoId === combo.id;

                      // "changed" si el precio o la promo difieren de los valores guardados
                      const savedPromoNum = combo.promo_price ? Math.round(Number(combo.promo_price)) : 0;
                      const priceChanged  = comboPriceEdits[combo.id] !== undefined
                        && Math.round(Number(comboPriceEdits[combo.id] || 0)) !== comboPrice;
                      const promoChanged  = comboPromos[combo.id] !== undefined
                        && Math.round(Number(comboPromos[combo.id] || 0)) !== savedPromoNum;
                      const comboChanged  = priceChanged || promoChanged;

                      return (<>
                        <div className="seller-product-sale-wrap">
                          <label className="seller-product-sale">
                            <span>Tu precio</span>
                            <div>
                              <b>$</b>
                              <input
                                type="number"
                                min={comboCost > 0 ? comboCost : 0}
                                step="1"
                                placeholder={comboCost > 0 ? String(comboCost) : "0"}
                                value={editedPriceStr}
                                onChange={e => setComboPriceEdits(prev => ({ ...prev, [combo.id]: e.target.value }))}
                              />
                            </div>
                            {comboCost > 0 && displayPrice > 0 && displayPrice < comboCost && (
                              <small className="seller-product-promo-hint is-warn">Mínimo {money(comboCost)}</small>
                            )}
                          </label>
                          <div className={`seller-product-sale seller-product-sale--promo ${promoPct2 > 0 ? "is-active" : ""}`}>
                            <span className="seller-product-promo-label">
                              {promoPct2 > 0
                                ? <span className="seller-product-promo-off-badge">{promoPct2}% OFF</span>
                                : "Precio promocional"}
                            </span>
                            <div>
                              <b>$</b>
                              <input
                                type="number"
                                min={0}
                                step="1"
                                placeholder="Opcional"
                                value={promoInputVal}
                                onChange={e => setComboPromos(prev => ({ ...prev, [combo.id]: e.target.value }))}
                              />
                            </div>
                            {promoVal > 0 && !promoValid && (
                              <small className="seller-product-promo-hint is-warn">Debe ser menor al precio</small>
                            )}
                          </div>
                        </div>

                        {(() => {
                          const effectivePrice = promoVal > 0 && promoValid ? promoVal : displayPrice;
                          const liveProfit = effectivePrice > 0 && comboCost > 0 ? effectivePrice - comboCost : null;
                          return (
                            <div className={`seller-product-profit ${liveProfit > 0 ? "is-positive" : ""}`}>
                              <TrendingUp size={16} />
                              <span>Ganancia estimada</span>
                              <strong>{liveProfit !== null && liveProfit > 0 ? money(liveProfit) : "—"}</strong>
                            </div>
                          );
                        })()}

                        <div className="seller-product-actions">
                          <button
                            type="button"
                            className="seller-product-btn seller-product-btn--save"
                            onClick={() => saveComboPromo(combo)}
                            disabled={isSaving || !comboChanged || (promoVal > 0 && !promoValid)}
                            style={{ flex: 1 }}
                          >
                            {isSaving ? <Loader2 size={15} className="seller-products-spin" /> : <Save size={15} />}
                            {isSaving ? "Guardando..." : "Guardar precio"}
                          </button>
                          <button
                            type="button"
                            className="seller-product-btn seller-product-btn--edit"
                            onClick={() => navigate(`/pages/${pageId}/combos/${combo.id}/edit`)}
                          >
                            <Pencil size={15} />
                            Editar
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
            const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
            const isNew = product.created_at
              ? (Date.now() - new Date(product.created_at).getTime()) < ONE_WEEK_MS
              : false;
            const promoPct   = promoPrice > 0 && info.sale > promoPrice
              ? Math.round(((info.sale - promoPrice) / info.sale) * 100)
              : 0;
            if (mode === "ml") {
              return (
                <MlCatalogCard
                  key={product.id}
                  product={product}
                  cost={info.cost}
                  isNew={isNew}
                  isTopSeller={topSellingIds.has(product.id)}
                  comboMode={comboMode}
                  isSelected={comboSelected.has(product.id)}
                  saving={saving}
                  onPublish={() => addProduct(product)}
                  onToggleCombo={() => toggleComboProduct(product.id)}
                  onRequestSample={() => setRequestModal(product)}
                  onReserve={() => setReserveModal(product)}
                  canReserve={Number(product.available_for_reserve || 0) > 0}
                />
              );
            }
            return (
              <article
                key={product.id}
                className={`seller-product-card ${info.inStore && !comboMode ? "is-in-store" : "is-not-in-store"} ${info.inStore && !info.valid && info.sale > 0 ? "has-price-error" : ""} ${isLowStock ? "is-low-stock" : ""}`.trim()}
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
                  {isNew && !onlyMine && (
                    <span className="seller-product-card__badge seller-product-card__badge--new">
                      <Sparkles size={11} />
                      Nuevo
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
                  {info.inStore && (
                    <Link
                      to={`/pages/${pageId}/products/${product.id}/edit`}
                      state={{ returnToMine: true }}
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
                      {Number(product.seller_own_stock || 0) > 0 && (
                        <>
                          {" · "}
                          <span style={{ color: "#166534", fontWeight: 600 }}>
                            Stock propio: {product.seller_own_stock}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="seller-product-prices">
                    <div className={`seller-product-price seller-product-price--cost ${(!info.inStore || comboMode) ? "seller-product-price--cost-solo" : ""}`}>
                      <span>Costo</span>
                      <strong>{money(info.cost)}</strong>
                    </div>
                    {info.inStore && !comboMode && (
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
                    )}
                  </div>

                  <div className="seller-product-sale-wrap">
                    {info.inStore && !comboMode && (
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
                    )}
                    {info.inStore && !comboMode && (
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
                                  setInfoTip({ x: r.left + r.width / 2, y: r.top, text: "Precio con descuento. Si es menor a tu precio normal, la tienda muestra el original tachado y el precio especial." });
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
                        {promoPrice > 0 && promoPrice < info.minPrice && (
                          <small className="seller-product-promo-hint is-warn">
                            Mínimo {money(info.minPrice)}
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

                  {info.inStore && !comboMode && (
                    <div className={`seller-product-profit ${info.profit > 0 ? "is-positive" : ""}`}>
                      <TrendingUp size={16} />
                      <span>Ganancia estimada</span>
                      <strong>{info.valid && info.profit >= 0 ? money(info.effectiveProfit) : "—"}</strong>
                    </div>
                  )}

                  {info.inStore && !info.valid && info.sale > 0 && (
                    <div className="seller-product-warning">
                      <AlertTriangle size={14} />
                      No puede ser menor a {money(info.minPrice)}
                      {product.free_shipping && <span style={{ display: "block", fontSize: ".72rem", marginTop: 2, opacity: .8 }}>Incluye margen mínimo de envío gratis</span>}
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
                    ) : mode === "ml" ? (
                      <button
                        type="button"
                        className="seller-product-btn seller-product-btn--add"
                        onClick={() => addProduct(product)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 size={16} className="seller-products-spin" /> : <Plus size={16} />}
                        Publicar en Mercado Libre
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
                          onClick={() => setConfirmDelete({ product })}
                          disabled={saving}
                        >
                          <Trash2 size={16} />
                          Quitar
                        </button>
                      </>
                    )}
                  </div>

                  {/* Botones de compra propia */}
                  {!comboMode && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        type="button"
                        className="seller-product-btn seller-product-btn--edit"
                        style={{ flex: 1, fontSize: 12, padding: "7px 10px" }}
                        onClick={() => setRequestModal(product)}
                        title="Solicitá 1 unidad para vos, para mostrarle el producto a tus clientes"
                      >
                        <ShoppingBag size={13} />
                        Solicitar muestra
                      </button>
                      <button
                        type="button"
                        className="seller-product-btn seller-product-btn--edit"
                        style={{ flex: 1, fontSize: 12, padding: "7px 10px" }}
                        onClick={() => setReserveModal(product)}
                        disabled={Number(product.available_for_reserve || 0) === 0}
                        title={Number(product.available_for_reserve || 0) === 0 ? "Sin stock disponible para reservar" : "Reservá unidades exclusivas para vos"}
                      >
                        <Package size={13} />
                        Reservar stock
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
        {/* Sentinel de infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
            <Loader2 size={24} className="seller-products-spin" />
          </div>
        )}
        </>
      )}

      {/* Banner post-pago MercadoPago */}
      {confirmBanner && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,.12)", zIndex: 9999, maxWidth: 440, width: "calc(100% - 48px)",
        }}>
          <CheckCircle2 size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
              {confirmBanner === "seller_request" ? "¡Solicitud confirmada!" : "¡Reserva confirmada!"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {confirmBanner === "seller_request"
                ? "Tu pago fue procesado. El producto está en camino."
                : "Tu pago fue procesado. Las unidades ya están reservadas para vos."}
            </div>
          </div>
          <button type="button" onClick={() => setConfirmBanner(null)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6b7280" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {requestModal && <SellerRequestModal product={requestModal} onClose={() => setRequestModal(null)} pageId={pageId} />}
      {reserveModal && <StockReserveModal product={reserveModal} onClose={() => setReserveModal(null)} pageId={pageId} />}

    </div>
  );
}
