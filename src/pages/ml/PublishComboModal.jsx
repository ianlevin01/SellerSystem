import { useState, useEffect, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import client from "../../api/client";
import { Modal, AttributeField, AddressBlockNotice } from "./mlShared";
import { formatNumberUnitValue, isValidAttrValue } from "./mlUtils";

// Modal de publicación de un combo — extraído de MercadoLibre.jsx (donde vivía inline) para que
// PublishSessionContext pueda montarlo a nivel Layout y así sobrevivir a la navegación entre
// páginas cuando se minimiza. minimized/onMinimize son las dos props nuevas para eso — el resto
// es el mismo flujo de siempre (categoría, atributos, precio, envío gratis), sin selector de
// fotos (se completan solas con las de cada producto del combo) y con un stepper de cantidad
// por producto; el precio piso es la suma de costos.
export default function PublishComboModal({ comboId, addressStatus, onClose, onPublished, minimized, onMinimize }) {
  const [localAddressStatus, setLocalAddressStatus] = useState(addressStatus);
  const [checkingAddress, setCheckingAddress] = useState(false);
  function recheckAddress() {
    setCheckingAddress(true);
    client.post("/seller/ml/shipping-address-ack")
      .then(r => setLocalAddressStatus(r.data))
      .catch(() => {})
      .finally(() => setCheckingAddress(false));
  }

  const [detail, setDetail] = useState(null); // { products, priceFloor }
  const [savingQty, setSavingQty] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [attrDefs, setAttrDefs] = useState([]);
  const [attrValues, setAttrValues] = useState({});
  const [showOptionalAttrs, setShowOptionalAttrs] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [shippingFree, setShippingFree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mlMissingAttr, setMlMissingAttr] = useState(null);
  const [mlMissingValue, setMlMissingValue] = useState("");

  const comboLabel = useMemo(() => (detail?.products || [])
    .map(p => `${p.quantity > 1 ? `${p.quantity}× ` : ""}${p.name}`).join(" + "), [detail]);

  function searchCategories(q) {
    client.get("/seller/ml/categories/suggest", { params: { q: q ?? query } })
      .then(r => setSuggestions(r.data || []))
      .catch(() => setSuggestions([]));
  }

  useEffect(() => {
    client.get(`/seller/ml/combos/${comboId}`).then(r => {
      setDetail(r.data);
      const label = r.data.products.map(p => `${p.quantity > 1 ? `${p.quantity}× ` : ""}${p.name}`).join(" + ");
      setTitle(label);
      setQuery(label);
      searchCategories(label);
    }).catch(() => setError("No se pudo cargar el combo"));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!categoryId) { setAttrDefs([]); return; }
    client.get(`/seller/ml/categories/${categoryId}/attributes`)
      .then(r => {
        const defs = r.data || [];
        setAttrDefs(defs);
        // Un combo no tiene un único código de producto — solo precargamos la marca.
        if (defs.some(a => a.id === "BRAND")) {
          setAttrValues(prev => prev.BRAND ? prev : { ...prev, BRAND: "Genérica" });
        }
      })
      .catch(() => setAttrDefs([]));
  }, [categoryId]);

  async function changeQuantity(productId, quantity) {
    if (quantity < 1) return;
    setSavingQty(true);
    try {
      const products = detail.products.map(p => ({ productId: p.productId, quantity: p.productId === productId ? quantity : p.quantity }));
      const res = await client.patch(`/seller/ml/combos/${comboId}`, { products });
      setDetail(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo actualizar la cantidad");
    } finally {
      setSavingQty(false);
    }
  }

  const requiredAttrs = attrDefs.filter(a => a.required);
  const optionalAttrs = attrDefs.filter(a => !a.required);
  const missingAttrs  = requiredAttrs.filter(a => !isValidAttrValue(a, attrValues[a.id]));

  const priceFloor = detail?.priceFloor ?? null;
  const priceValid = useMemo(() => {
    const p = Number(price);
    if (!p || p <= 0) return false;
    if (priceFloor != null && p < priceFloor) return false;
    return true;
  }, [price, priceFloor]);

  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);

  useEffect(() => {
    const p = Number(price);
    if (!categoryId || !p || p <= 0) { setFees(null); return; }
    let cancelled = false;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      client.get("/seller/ml/listing-fees", { params: { price: p, categoryId } })
        .then(r => { if (!cancelled) setFees(r.data); })
        .catch(() => { if (!cancelled) setFees(null); })
        .finally(() => { if (!cancelled) setFeesLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [price, categoryId]);

  async function publish() {
    if (!categoryId) { setError("Elegí una categoría de Mercado Libre"); return; }
    if (!priceValid) {
      setError(priceFloor != null
        ? `El precio no puede ser menor a $${Math.round(priceFloor).toLocaleString("es-AR")} (costo total del combo)`
        : "Ingresá un precio válido");
      return;
    }
    if (missingAttrs.length > 0) {
      setError(`Faltan completar: ${missingAttrs.map(a => a.name).join(", ")}`);
      return;
    }
    if (mlMissingAttr && !mlMissingValue.trim()) {
      setError(`Completá "${mlMissingAttr.name}" para poder publicar`);
      return;
    }

    setSaving(true); setError("");
    try {
      const attributes = attrDefs
        .filter(a => isValidAttrValue(a, attrValues[a.id]))
        .map(a => ({
          id: a.id,
          value_name: a.valueType === "number_unit" ? formatNumberUnitValue(a, attrValues[a.id]) : attrValues[a.id],
        }));
      if (mlMissingAttr && mlMissingValue.trim()) {
        attributes.push({
          id: mlMissingAttr.id,
          value_name: mlMissingAttr.valueType === "number_unit" ? formatNumberUnitValue(mlMissingAttr, mlMissingValue) : mlMissingValue,
        });
      }

      const res = await client.post(`/seller/ml/combos/${comboId}/publish`, {
        mlCategoryId: categoryId, price: Number(price), shippingFree, attributes,
        title, description,
      });
      onPublished({ ...res.data, requestedShippingFree: shippingFree });
    } catch (err) {
      const missing = err.response?.data?.missingAttribute;
      if (err.response?.data?.addressMismatch) {
        setLocalAddressStatus({
          connected: true, valid: false,
          currentAddress: err.response.data.currentAddress,
          warehouseAddress: err.response.data.warehouseAddress,
          changeAddressUrl: err.response.data.changeAddressUrl,
        });
      } else if (missing) {
        setMlMissingAttr(missing);
        setMlMissingValue("");
        setError("");
      } else {
        setError(err.response?.data?.message || "No se pudo publicar el combo");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!detail) {
    return (
      <Modal title="Publicar combo en Mercado Libre" onClose={onClose} maxWidth={560} minimized={minimized} onMinimize={onMinimize}>
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <Loader2 size={20} className="spin" />
        </div>
      </Modal>
    );
  }

  if (localAddressStatus?.connected && localAddressStatus.valid === false) {
    return (
      <Modal title="Publicar combo en Mercado Libre" onClose={onClose} maxWidth={480} minimized={minimized} onMinimize={onMinimize}>
        <AddressBlockNotice addressStatus={localAddressStatus} onRecheck={recheckAddress} checking={checkingAddress} />
      </Modal>
    );
  }

  return (
    <Modal title="Publicar combo en Mercado Libre" onClose={onClose} maxWidth={560} minimized={minimized} onMinimize={onMinimize}>
      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Productos del combo</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {detail.products.map(p => (
          <div key={p.productId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface-2,#f9fafb)", borderRadius: 8 }}>
            <span style={{ flex: 1, fontSize: ".84rem", fontWeight: 600 }}>{p.name}</span>
            <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>Stock: {p.availableStock}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button type="button" className="btn btn--ghost btn--sm" disabled={savingQty || p.quantity <= 1}
                onClick={() => changeQuantity(p.productId, p.quantity - 1)} style={{ padding: "2px 8px" }}>−</button>
              <span style={{ minWidth: 18, textAlign: "center", fontSize: ".84rem", fontWeight: 700 }}>{p.quantity}</span>
              <button type="button" className="btn btn--ghost btn--sm" disabled={savingQty}
                onClick={() => changeQuantity(p.productId, p.quantity + 1)} style={{ padding: "2px 8px" }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "0 0 16px", fontSize: ".76rem", color: "var(--text-secondary)" }}>
        Las fotos de la publicación se completan automáticamente con las fotos de estos productos — no hace falta subir nada nuevo.
      </p>

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Título de la publicación</label>
      <input className="form-input" style={{ marginBottom: 14 }} value={title} onChange={e => setTitle(e.target.value)} />

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Descripción</label>
      <textarea className="form-input" rows={4} style={{ marginBottom: 16, resize: "vertical" }}
        value={description} onChange={e => setDescription(e.target.value)} placeholder={`Combo: ${comboLabel}`} />

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Categoría de Mercado Libre</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input className="form-input" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchCategories()}
          placeholder="Palabras clave para buscar la categoría" />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => searchCategories()}><Search size={13} /></button>
      </div>
      <select className="form-input" style={{ marginBottom: 16 }} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        <option value="">Seleccioná...</option>
        {suggestions.map(s => <option key={s.categoryId} value={s.categoryId}>{s.categoryName}</option>)}
      </select>

      {requiredAttrs.length > 0 && (
        <div style={{ marginBottom: 12, padding: "12px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9 }}>
          <p style={{ margin: "0 0 10px", fontSize: ".78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Datos requeridos por esta categoría
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requiredAttrs.map(a => (
              <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
            ))}
          </div>
        </div>
      )}

      {optionalAttrs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button type="button" onClick={() => setShowOptionalAttrs(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand,#4db81a)", fontSize: ".8rem", fontWeight: 600, padding: 0 }}>
            {showOptionalAttrs ? "Ocultar" : "Mostrar"} características opcionales ({optionalAttrs.length})
          </button>
          {showOptionalAttrs && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, display: "flex", flexDirection: "column", gap: 8 }}>
              {optionalAttrs.map(a => (
                <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
              ))}
            </div>
          )}
        </div>
      )}

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Precio en Mercado Libre</label>
      <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)}
        style={{ marginBottom: 4, borderColor: price && !priceValid ? "var(--danger,#ef4444)" : undefined }} />
      {priceFloor != null && (
        <small style={{ display: "block", marginBottom: 12, color: "var(--text-secondary)" }}>
          Costo total: ${Math.round(priceFloor).toLocaleString("es-AR")}
        </small>
      )}

      {priceValid && categoryId && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, marginBottom: 16 }}>
          {feesLoading ? (
            <span style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={12} className="spin" /> Calculando comisión...
            </span>
          ) : fees ? (
            <>
              <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>
                Cargo por vender: ${Math.round(fees.saleFeeAmount).toLocaleString("es-AR")}
              </span>
              <span style={{ fontSize: ".92rem", fontWeight: 700, color: "var(--success,#059669)" }}>
                Recibís: ${Math.round(fees.netAmount).toLocaleString("es-AR")}
              </span>
            </>
          ) : (
            <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>No se pudo calcular la comisión</span>
          )}
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".84rem", marginBottom: 16 }}>
        <input type="checkbox" checked={shippingFree} onChange={e => setShippingFree(e.target.checked)} />
        Ofrecer envío gratis (Mercado Libre descuenta su costo automáticamente de la venta)
      </label>

      {mlMissingAttr && (
        <div style={{ margin: "0 0 12px", padding: "12px 14px", background: "rgba(217,119,6,.08)",
          border: "1px solid #f59e0b", borderRadius: 9 }}>
          <p style={{ margin: "0 0 8px", fontSize: ".8rem", color: "#92400e", fontWeight: 600 }}>
            Mercado Libre necesita este dato para publicar en esta categoría:
          </p>
          <AttributeField attr={mlMissingAttr} value={mlMissingValue} onChange={setMlMissingValue} />
        </div>
      )}

      {error && <p style={{ margin: "0 0 12px", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{error}</p>}

      <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={publish} disabled={saving}>
        {saving ? <Loader2 size={14} className="spin" /> : mlMissingAttr ? "Reintentar publicación" : "Publicar combo"}
      </button>
    </Modal>
  );
}
