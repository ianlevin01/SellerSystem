import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { AlertTriangle, ArrowLeft, CheckCircle2, Image, Loader2, Trash2, Truck, Upload } from "lucide-react";
import RichEditor from "../components/RichEditor";

function fmt(n) {
  return Number(Math.round(Number(n || 0))).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function money(n) {
  const v = Math.round(Number(n || 0));
  if (!Number.isFinite(v) || v <= 0) return "—";
  return `$${fmt(v)}`;
}

export default function ComboEditor() {
  const { pageId, comboId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [combo,        setCombo]        = useState(null);
  const [products,     setProducts]     = useState([]); // products in combo with qty
  const [productPrices, setProductPrices] = useState({}); // product_id → precio_1
  const [images,       setImages]       = useState([]); // [{ key, url }]
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [name,         setName]         = useState("");
  const [price,        setPrice]        = useState("");
  const [promoPrice,   setPromoPrice]   = useState("");
  const [desc,         setDesc]         = useState("");
  const [freeShipping, setFreeShipping] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [uploading,    setUploading]    = useState(false);

  useEffect(() => {
    Promise.all([
      client.get(`/seller/store/pages/${pageId}/combos/${comboId}`),
      client.get(`/seller/store/pages/${pageId}/products`, { params: { limit: 500 } }),
    ]).then(([comboRes, prodsRes]) => {
      const c = comboRes.data;
      setCombo(c);
      setName(c.name || "");
      setPrice(c.custom_price > 0 ? String(c.custom_price) : "");
      setPromoPrice(c.promo_price && c.promo_enabled ? String(c.promo_price) : "");
      setDesc(c.description || "");
      setProducts(c.products || []);
      setImages(c.images || []);
      setFreeShipping(Boolean(c.free_shipping));

      const list = Array.isArray(prodsRes.data) ? prodsRes.data : prodsRes.data?.products || [];
      const map = {};
      list.forEach(p => { map[p.id] = Number(p.precio_1 || 0); });
      setProductPrices(map);
    }).catch(() => setError("No se pudo cargar el combo.")).finally(() => setLoading(false));
  }, [pageId, comboId]);

  const FREE_SHIPPING_MIN_MARGIN = 0; // TODO: volver a 15000 después de pruebas

  // Price floor: sum of precio_1 × quantity for each product
  const minRequired = products.reduce((sum, p) => {
    return sum + (productPrices[p.product_id] || 0) * (p.quantity || 1);
  }, 0);
  const minPrice   = freeShipping && minRequired > 0 ? minRequired + FREE_SHIPPING_MIN_MARGIN : minRequired;
  const comboPrice = Number(price) || 0;
  const priceOk    = comboPrice === 0 || comboPrice >= minPrice;

  const comboPriceNum = Number(promoPrice) || 0;
  const promoOk       = comboPriceNum === 0
    || (comboPriceNum >= minPrice && (comboPrice === 0 || comboPriceNum < comboPrice));

  function setProductQty(productId, qty) {
    setProducts(prev => prev.map(p =>
      p.product_id === productId
        ? { ...p, quantity: Math.max(1, parseInt(qty, 10) || 1) }
        : p
    ));
  }

  async function handleSave() {
    if (!name.trim()) { setSaveMsg("El nombre es requerido."); return; }
    if (comboPrice > 0 && !priceOk) {
      setSaveMsg(`El precio mínimo para este combo es ${money(minPrice)}.`);
      return;
    }
    if (comboPriceNum > 0 && !promoOk) {
      if (comboPriceNum < minPrice) {
        setSaveMsg(`El precio promo no puede ser menor al mínimo permitido (${money(minPrice)}).`);
      } else {
        setSaveMsg("El precio promo debe ser menor al precio regular.");
      }
      return;
    }
    setSaving(true); setSaveMsg("");
    try {
      await client.patch(`/seller/store/pages/${pageId}/combos/${comboId}`, {
        name:          name.trim(),
        description:   desc.trim() || null,
        custom_price:  comboPrice,
        free_shipping: freeShipping,
        promo_price:   comboPriceNum > 0 ? comboPriceNum : null,
        products:      products.map(p => ({ product_id: p.product_id, quantity: p.quantity || 1 })),
      });
      setSaveMsg("Guardado");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true); setError("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await client.post(
          `/seller/store/pages/${pageId}/combos/${comboId}/images`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setImages(prev => [...prev, { key: res.data.key, url: res.data.url }]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error al subir imagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(key) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    try {
      await client.delete(`/seller/store/pages/${pageId}/combos/${comboId}/images`, { data: { key } });
      setImages(prev => prev.filter(img => img.key !== key));
    } catch (err) {
      setError(err.response?.data?.message || "Error al eliminar imagen.");
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
      ))}
    </div>
  );

  if (!combo) return <div className="empty-state">Combo no encontrado.</div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)} style={{ padding: "6px 8px" }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ marginBottom: 2 }}>{name || "Nuevo combo"}</h1>
          <p>Editor de combo</p>
        </div>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Datos del combo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 2 }}>Datos del combo</h2>
          <p style={{ fontSize: ".85rem" }}>Nombre, precio y descripción que verán tus clientes.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 4, color: "var(--color-text-secondary)" }}>
              Nombre *
            </label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Pack inicio, Combo verano..."
            />
          </div>

          {/* Price */}
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 4, color: "var(--color-text-secondary)" }}>
              Precio del combo
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b style={{ color: "var(--color-text-secondary)" }}>$</b>
              <input
                className="form-input"
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Ej: 45000"
                style={{ maxWidth: 200 }}
              />
            </div>
            {minPrice > 0 && (
              <p style={{ marginTop: 6, fontSize: ".8rem", display: "flex", alignItems: "center", gap: 5,
                color: priceOk ? "var(--color-success, #16a34a)" : "var(--color-error, #dc2626)" }}>
                {priceOk
                  ? <><CheckCircle2 size={13} /> Precio válido · Mínimo: {money(minPrice)}{freeShipping && minRequired > 0 ? " (incluye margen de envío)" : ""}</>
                  : <><AlertTriangle size={13} /> El mínimo es {money(minPrice)}{freeShipping ? " (incluye margen de envío gratis)" : " (suma de costos de los productos)"}</>
                }
              </p>
            )}
          </div>

          {/* Promo price */}
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 4, color: "var(--color-text-secondary)" }}>
              Precio promo{" "}
              <span style={{ fontWeight: 400, color: "var(--color-text-tertiary, #9ca3af)" }}>
                (opcional · debe ser menor al precio regular)
              </span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b style={{ color: "var(--color-text-secondary)" }}>$</b>
              <input
                className="form-input"
                type="number"
                min="0"
                value={promoPrice}
                onChange={e => setPromoPrice(e.target.value)}
                placeholder="Dejar vacío para desactivar"
                style={{ maxWidth: 200 }}
              />
            </div>
            {comboPriceNum > 0 && (
              <p style={{ marginTop: 6, fontSize: ".8rem", display: "flex", alignItems: "center", gap: 5,
                color: promoOk ? "var(--color-success, #16a34a)" : "var(--color-error, #dc2626)" }}>
                {promoOk
                  ? <><CheckCircle2 size={13} /> Precio promo válido · Se mostrará con badge de oferta</>
                  : comboPriceNum < minPrice
                    ? <><AlertTriangle size={13} /> El precio promo no puede ser menor al mínimo ({money(minPrice)})</>
                    : <><AlertTriangle size={13} /> El precio promo debe ser menor al precio regular ({money(comboPrice)})</>
                }
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 6, color: "var(--color-text-secondary)" }}>
              Descripción{" "}
              <span style={{ fontWeight: 400, color: "var(--color-text-tertiary, #9ca3af)" }}>
                (opcional · soporta texto enriquecido)
              </span>
            </label>
            <RichEditor value={desc} onChange={setDesc} productId={comboId} />
          </div>

          {/* Free shipping toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: freeShipping ? "var(--success-light, #d1fae5)" : "var(--surface-2, #f9fafb)" }}>
            <Truck size={16} color={freeShipping ? "var(--success, #059669)" : "var(--text-secondary)"} />
            <span style={{ flex: 1, fontSize: ".875rem", fontWeight: 500 }}>Envío gratis</span>
            <label className="toggle-switch" style={{ display: "flex", alignItems: "center" }}>
              <input type="checkbox" checked={freeShipping} onChange={e => setFreeShipping(e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {saveMsg && (
              <span style={{
                fontSize: ".85rem",
                color: saveMsg === "Guardado" ? "var(--color-success, #16a34a)" : "var(--color-error, #dc2626)",
              }}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div>
            <h2 style={{ marginBottom: 2 }}>Fotos del combo</h2>
            <p style={{ fontSize: ".85rem" }}>Se muestran en tu tienda junto al combo.</p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={13} />
            {uploading ? "Subiendo..." : "Subir fotos"}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleUpload} />

        {images.length === 0 ? (
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <Image className="upload-zone__icon" />
            <div className="upload-zone__title">Hacé clic para subir fotos del combo</div>
            <div className="upload-zone__sub">JPG, PNG, WEBP · máx. 8MB por imagen</div>
          </div>
        ) : (
          <div className="image-grid">
            {images.map((img, idx) => (
              <div key={img.key || idx} className="image-thumb">
                <img src={img.url || img.key} alt={`Foto ${idx + 1}`} />
                {idx === 0 && (
                  <div className="image-thumb__primary">
                    <span className="badge badge--brand">Principal</span>
                  </div>
                )}
                <button className="image-thumb__delete" onClick={() => handleDeleteImage(img.key)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products in combo */}
      {products.length > 0 && (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 2 }}>Productos incluidos</h2>
            <p style={{ fontSize: ".85rem" }}>Ajustá las cantidades de cada producto en el combo.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {products.map(p => {
              const min = productPrices[p.product_id] || 0;
              return (
                <div key={p.product_id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "var(--color-surface-alt, #f9fafb)",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--color-border, #e5e7eb)",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name || p.code || p.product_id}
                    </div>
                    {min > 0 && (
                      <div style={{ fontSize: ".78rem", color: "var(--color-text-secondary)", marginTop: 2 }}>
                        Mínimo: {money(min)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <label style={{ fontSize: ".8rem", color: "var(--color-text-secondary)" }}>Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={p.quantity || 1}
                      onChange={e => setProductQty(p.product_id, e.target.value)}
                      style={{
                        width: 60,
                        padding: "4px 8px",
                        border: "1px solid var(--color-border, #e5e7eb)",
                        borderRadius: 6,
                        fontSize: ".875rem",
                        textAlign: "center",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cantidades"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
