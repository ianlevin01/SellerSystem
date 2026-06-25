// src/pages/Products.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import { Plus, Minus, Search, Image, PlusCircle, ShoppingBag, Package, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function Modal({ onClose, children, title }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Modal: Solicitar producto ────────────────────────────────────────────────
function RequestModal({ product, onClose }) {
  const [step,         setStep]        = useState("type"); // type | quote | confirm
  const [shippingType, setShippingType] = useState(null);
  const [postalCode,   setPostalCode]  = useState("");
  const [rates,        setRates]       = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error,        setError]       = useState("");

  const precio1 = Number(product.precio_1 || 0);

  async function fetchRates() {
    setError("");
    setLoadingRates(true);
    try {
      const res = await client.get("/seller/products/shipping-quote", { params: { postal_code: postalCode } });
      if (!res.data.available || !res.data.rates?.length) {
        setError("No hay opciones de envío disponibles para ese código postal.");
        return;
      }
      setRates(res.data.rates);
      setStep("quote");
    } catch {
      setError("Error al obtener tarifas de envío.");
    } finally {
      setLoadingRates(false);
    }
  }

  async function checkout() {
    setLoadingCheckout(true);
    setError("");
    try {
      const shipping = shippingType === "pickup"
        ? { type: "pickup" }
        : { type: shippingType, postal_code: postalCode, rate: selectedRate };

      const res = await client.post("/seller/products/request-product", {
        product_id: product.id,
        shipping,
      });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear el checkout.");
      setLoadingCheckout(false);
    }
  }

  const shippingCost = shippingType === "pickup" ? 0 : Number(selectedRate?.price || 0);
  const total        = precio1 + shippingCost;

  return (
    <Modal onClose={onClose} title="Solicitar producto">
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
          <strong style={{ color: "var(--color-text)" }}>{product.custom_name || product.name}</strong>
          <br />Solicitá 1 unidad para vos — para mostrarle el producto a tus clientes.
        </p>

        {step === "type" && (
          <>
            <div style={{ fontWeight: 600, fontSize: 13 }}>¿Cómo querés recibir el producto?</div>
            {[
              { key: "pickup",    label: "Pasar a buscar",            desc: "Retirás en depósito, sin costo de envío" },
              { key: "sucursal",  label: "Correo Argentino sucursal", desc: "Lo recibís en una sucursal cercana" },
              { key: "domicilio", label: "Correo Argentino domicilio",desc: "Envío a tu dirección" },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setShippingType(opt.key)}
                style={{
                  textAlign: "left", padding: "12px 16px", border: "1px solid",
                  borderColor: shippingType === opt.key ? "var(--brand)" : "var(--color-border)",
                  borderRadius: 8, background: shippingType === opt.key ? "var(--brand-light)" : "var(--color-surface)",
                  cursor: "pointer", transition: "all .15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}

            {shippingType && shippingType !== "pickup" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Código postal"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value.replace(/\D/g, ""))}
                  maxLength={8}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn--primary"
                  onClick={fetchRates}
                  disabled={loadingRates || postalCode.length < 4}
                >
                  {loadingRates ? <Loader2 size={14} className="spin" /> : "Ver tarifas"}
                </button>
              </div>
            )}

            {shippingType === "pickup" && (
              <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Total a pagar</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)" }}>{fmt(precio1)}</div>
              </div>
            )}
          </>
        )}

        {step === "quote" && (
          <>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Elegí una opción de envío</div>
            {rates.map(r => (
              <button
                key={r.code}
                onClick={() => setSelectedRate(r)}
                style={{
                  textAlign: "left", padding: "12px 16px", border: "1px solid",
                  borderColor: selectedRate?.code === r.code ? "var(--brand)" : "var(--color-border)",
                  borderRadius: 8, background: selectedRate?.code === r.code ? "var(--brand-light)" : "var(--color-surface)",
                  cursor: "pointer", transition: "all .15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)" }}>{r.name}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{fmt(r.price)}</div>
              </button>
            ))}
            {selectedRate && (
              <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Total (producto + envío)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)" }}>{fmt(total)}</div>
              </div>
            )}
          </>
        )}

        {error && <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          {step === "quote" && (
            <button className="btn btn--ghost btn--sm" onClick={() => { setStep("type"); setSelectedRate(null); }}>
              Atrás
            </button>
          )}
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={checkout}
            disabled={
              loadingCheckout ||
              !shippingType ||
              (shippingType !== "pickup" && step !== "quote") ||
              (step === "quote" && !selectedRate)
            }
          >
            {loadingCheckout ? <Loader2 size={15} className="spin" /> : "Ir a pagar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Reservar stock ────────────────────────────────────────────────────
function ReserveModal({ product, onClose }) {
  const [quantity,        setQuantity]        = useState(1);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error,           setError]           = useState("");

  const precio1           = Number(product.precio_1 || 0);
  const availableReserve  = Number(product.available_for_reserve || 0);
  const total             = precio1 * quantity;

  async function checkout() {
    if (quantity < 1 || quantity > availableReserve) return;
    setLoadingCheckout(true);
    setError("");
    try {
      const res = await client.post("/seller/products/reserve-stock", {
        product_id: product.id,
        quantity,
      });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear el checkout.");
      setLoadingCheckout(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Reservar stock">
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
          <strong style={{ color: "var(--color-text)" }}>{product.custom_name || product.name}</strong>
          <br />Las unidades reservadas son exclusivamente tuyas. Cuando alguien te compra, se descuenta de tu reserva y te llevás la ganancia completa.
        </p>

        <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Disponible para reservar</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>{availableReserve} unidad{availableReserve !== 1 ? "es" : ""}</div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Cantidad a reservar</label>
          <input
            type="number"
            className="form-input"
            min={1}
            max={availableReserve}
            value={quantity}
            onChange={e => setQuantity(Math.max(1, Math.min(availableReserve, Number(e.target.value) || 1)))}
          />
        </div>

        <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Total a pagar ({quantity} × {fmt(precio1)})</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)" }}>{fmt(total)}</div>
        </div>

        {error && <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{error}</p>}

        <button
          className="btn btn--primary"
          onClick={checkout}
          disabled={loadingCheckout || quantity < 1 || quantity > availableReserve || availableReserve === 0}
        >
          {loadingCheckout ? <Loader2 size={15} className="spin" /> : `Reservar ${quantity} unidad${quantity !== 1 ? "es" : ""}`}
        </button>
      </div>
    </Modal>
  );
}

// ─── Banner de confirmación post-pago ────────────────────────────────────────
function ConfirmBanner({ type, onClose }) {
  return (
    <div style={{
      background: "var(--success-bg, #f0fdf4)", border: "1px solid var(--success-border, #bbf7d0)",
      borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
    }}>
      <CheckCircle2 size={20} style={{ color: "var(--success, #16a34a)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text)" }}>
          {type === "seller_request" ? "Solicitud confirmada" : "Reserva confirmada"}
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {type === "seller_request"
            ? "Tu pago fue procesado. El producto ya está en camino."
            : "Tu pago fue procesado. Las unidades ya están reservadas para vos."}
        </div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
        <X size={16} style={{ color: "var(--color-text-secondary)" }} />
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Products() {
  const { seller } = useAuth();
  const location   = useLocation();
  const navigate   = useNavigate();

  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [saving, setSaving]       = useState({});
  const [requestModal, setRequestModal] = useState(null); // product object
  const [reserveModal, setReserveModal] = useState(null); // product object
  const [confirmType,  setConfirmType]  = useState(null); // "seller_request" | "stock_reserve"
  const searchTimeout = useRef(null);

  // Detectar retorno desde MercadoPago
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const confirmed = params.get("confirmed");
    if (confirmed === "seller_request" || confirmed === "stock_reserve") {
      setConfirmType(confirmed);
      navigate("/products", { replace: true });
    }
  }, [location.search]);

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

      {confirmType && (
        <ConfirmBanner type={confirmType} onClose={() => setConfirmType(null)} />
      )}

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
              const ownStock    = Number(product.seller_own_stock || 0);

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
                    <div className="product-card__badge-wrap" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {inStore && <span className="badge badge--brand">En mi tienda</span>}
                      {ownStock > 0 && (
                        <span className="badge" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontSize: 11 }}>
                          Stock propio: {ownStock}
                        </span>
                      )}
                    </div>
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

                    {/* Acciones de checkout propio */}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button
                        className="btn btn--ghost btn--xs"
                        style={{ flex: 1, fontSize: 11 }}
                        onClick={() => setRequestModal(product)}
                        title="Solicitar 1 unidad para vos"
                      >
                        <ShoppingBag size={11} /> Solicitar
                      </button>
                      <button
                        className="btn btn--ghost btn--xs"
                        style={{ flex: 1, fontSize: 11 }}
                        onClick={() => setReserveModal(product)}
                        disabled={Number(product.available_for_reserve || 0) === 0}
                        title="Reservar stock exclusivo para vos"
                      >
                        <Package size={11} /> Reservar stock
                      </button>
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

      {requestModal && (
        <RequestModal product={requestModal} onClose={() => setRequestModal(null)} />
      )}
      {reserveModal && (
        <ReserveModal product={reserveModal} onClose={() => setReserveModal(null)} />
      )}
    </div>
  );
}
