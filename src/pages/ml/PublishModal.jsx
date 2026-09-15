import { useState, useEffect, useMemo } from "react";
import {
  Search, ArrowRight, Loader2, CheckCircle2,
  LayoutGrid, ListChecks, ImageIcon, Type, Sparkles, FileText, Tag,
} from "lucide-react";
import client from "../../api/client";
import { Modal, AttributeField, IconBadge, WizardProgress, AddressBlockNotice, AccountDataIncompleteNotice } from "./mlShared";
import { formatNumberUnitValue, readyImageCount, isValidAttrValue, FREE_SHIPPING_MANDATORY_THRESHOLD_MLA } from "./mlUtils";
import ImageOrderPicker from "./ImageOrderPicker";
import PriceStep from "./PriceStep";

const WIZARD_STEPS = ["Categoría", "Características principales", "Fotos", "Título", "Características secundarias", "Descripción", "Precio"];
const WIZARD_STEP_ICONS = [LayoutGrid, ListChecks, ImageIcon, Type, Sparkles, FileText, Tag];

// Wizard de publicación propia — extraído de MercadoLibre.jsx (donde vivía inline) para que
// PublishSessionContext pueda montarlo a nivel Layout y así sobrevivir a la navegación entre
// páginas cuando se minimiza (ver ese archivo). minimized/onMinimize son las dos props nuevas
// para eso — el resto del componente es exactamente el mismo wizard de siempre, sin cambios de
// comportamiento.
export default function PublishModal({ product, siteId, addressStatus, onClose, onPublished, minimized, onMinimize }) {
  const [localAddressStatus, setLocalAddressStatus] = useState(addressStatus);
  const [checkingAddress, setCheckingAddress] = useState(false);
  function recheckAddress() {
    setCheckingAddress(true);
    client.post("/seller/ml/shipping-address-ack")
      .then(r => setLocalAddressStatus(r.data))
      .catch(() => {})
      .finally(() => setCheckingAddress(false));
  }

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState(product.custom_name || product.name);
  const [suggestions, setSuggestions] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [attrDefs, setAttrDefs] = useState([]);
  const [attrValues, setAttrValues] = useState({});
  const [title, setTitle] = useState(product.custom_name || product.name || "");
  const [description, setDescription] = useState(product.custom_desc || product.description || "");
  const [price, setPrice] = useState("");
  const [priceFloor, setPriceFloor] = useState(null);
  const [weightGrams, setWeightGrams] = useState(0);
  const [volumeCm3, setVolumeCm3] = useState(0);
  const [shippingFree, setShippingFree] = useState(false);
  // "none" = sin cuotas (interés lo paga el comprador/banco) — o el id de una de las campañas
  // reales de ML que vengan en fees.installmentOptions (3x_campaign/9x_campaign/12x_campaign, pcj-co-funded).
  const [selectedInstallment, setSelectedInstallment] = useState("none");

  const shippingFreeMandatory = siteId === "MLA" && Number(price) >= FREE_SHIPPING_MANDATORY_THRESHOLD_MLA;

  // Si el precio cruza el umbral obligatorio, se tilda solo y no se puede destildar — evita que
  // el vendedor publique sin envío gratis creyendo que es opcional y que después ML se lo fuerce
  // en el reintento automático sin haberlo visto venir en el wizard.
  useEffect(() => {
    if (shippingFreeMandatory) setShippingFree(true);
  }, [shippingFreeMandatory]);
  const [existingImages, setExistingImages] = useState([]); // [{id, key, url}]
  const [newPictures, setNewPictures] = useState([]); // [{previewUrl, ref, uploading}]
  // Orden final en el que se publican las fotos (la primera es la portada en ML) — mezcla
  // imágenes del catálogo y subidas nuevas en una sola lista arrastrable, en vez de mandar
  // siempre "primero las del catálogo, después las nuevas" sin control del vendedor.
  const [imageOrder, setImageOrder] = useState([]); // [{ type: "existing", key } | { type: "new", previewUrl }]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [kycRequired, setKycRequired] = useState(null); // { message, kycUrl } | null
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [suggestingDesc, setSuggestingDesc] = useState(false);
  const [suggestingAttrs, setSuggestingAttrs] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  // Atributo puntual que ML rechazó al publicar y que no supimos completar solos (GTIN si falla
  // el auto-completado, o cualquier otro que aparezca en el futuro) — a diferencia de attrDefs,
  // este no necesariamente estaba en la lista de características de la categoría.
  const [mlMissingAttr, setMlMissingAttr] = useState(null);
  const [mlMissingValue, setMlMissingValue] = useState("");

  const categoryName = suggestions.find(s => s.categoryId === categoryId)?.categoryName;

  function searchCategories() {
    client.get("/seller/ml/categories/suggest", { params: { q: query } })
      .then(r => setSuggestions(r.data || []))
      .catch(() => setSuggestions([]));
  }

  useEffect(() => {
    searchCategories();
    client.get(`/seller/ml/products/${product.id}/price-floor`)
      .then(r => {
        setPriceFloor(r.data.floor);
        setWeightGrams(Number(r.data.weightGrams || 0));
        setVolumeCm3(Number(r.data.volumeCm3 || 0));
      })
      .catch(() => setPriceFloor(null));
    client.get(`/seller/images/${product.id}`, { params: { all: true } })
      .then(r => {
        const imgs = r.data || [];
        setExistingImages(imgs);
        setImageOrder(imgs.map(i => ({ type: "existing", key: i.key })));
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!categoryId) { setAttrDefs([]); return; }
    client.get(`/seller/ml/categories/${categoryId}/attributes`)
      .then(r => {
        const defs = r.data || [];
        setAttrDefs(defs);
        // La marca/modelo real casi nunca la sabe quien publica (no es el fabricante) — se
        // precarga un default razonable, editable por si en algún caso sí lo sabe.
        setAttrValues(prev => {
          const next = { ...prev };
          if (defs.some(a => a.id === "BRAND") && !next.BRAND) next.BRAND = "Genérica";
          if (defs.some(a => a.id === "MODEL") && !next.MODEL) next.MODEL = product.code || product.sku || product.name || "";
          return next;
        });
      })
      .catch(() => setAttrDefs([]));
  }, [categoryId]); // eslint-disable-line

  const requiredAttrs = attrDefs.filter(a => a.required);
  const optionalAttrs = attrDefs.filter(a => !a.required);

  const priceValid = useMemo(() => {
    const p = Number(price);
    if (!p || p <= 0) return false;
    if (priceFloor != null && p < priceFloor) return false;
    return true;
  }, [price, priceFloor]);

  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);

  // Recalcula "Recibís" cada vez que cambia precio/categoría — igual que la propia UI de ML.
  // El costo de envío se calcula siempre que haya peso/volumen (no solo cuando el checkbox está
  // tildado) para que el vendedor vea cuánto le costaría ANTES de decidir si lo ofrece.
  useEffect(() => {
    const p = Number(price);
    if (!categoryId || !p || p <= 0) { setFees(null); return; }
    let cancelled = false;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      client.get("/seller/ml/listing-fees", {
        params: {
          price: p, categoryId,
          ...(weightGrams > 0 ? { weightGrams, volumeCm3 } : {}),
        },
      })
        .then(r => { if (!cancelled) setFees(r.data); })
        .catch(() => { if (!cancelled) setFees(null); })
        .finally(() => { if (!cancelled) setFeesLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [price, categoryId, weightGrams, volumeCm3]);

  const missingAttrs = requiredAttrs.filter(a => !isValidAttrValue(a, attrValues[a.id]));

  const installmentOptions = fees?.installmentOptions || [];
  const selectedOption     = installmentOptions.find(o => o.id === selectedInstallment) || null;
  // shippingCostKnown se calcula siempre que ML haya podido cotizarlo (independiente de si el
  // checkbox está tildado) — shippingCost (el que realmente se descuenta de "Recibís") solo
  // aplica si además el vendedor decidió ofrecerlo.
  const shippingCostKnown = fees?.shippingCost != null;
  const shippingCost      = shippingFree && shippingCostKnown ? Number(fees.shippingCost) : 0;
  const installmentsCost  = selectedOption ? Number(selectedOption.extraCost || 0) : 0;
  const netFinal    = fees ? Number(fees.netAmount) - shippingCost - installmentsCost : null;
  // Ganancia real = lo que efectivamente deposita Mercado Pago menos el costo del producto
  // (antes solo se mostraba "Recibís", que el vendedor podía confundir con ganancia sin notar
  // que no restaba el costo). % sobre el precio de venta (margen), no sobre el costo.
  const ganancia    = netFinal != null && priceFloor != null ? netFinal - priceFloor : null;
  const gananciaPct = ganancia != null && Number(price) > 0 ? (ganancia / Number(price)) * 100 : null;
  const margenTier  = ganancia == null ? null : ganancia < 0 ? "loss" : gananciaPct >= 8 ? "good" : "thin";

  function goBack() { setError(""); setStep(s => Math.max(0, s - 1)); }

  function goNext() {
    setError("");
    if (step === 0 && !categoryId) { setError("Elegí una categoría de Mercado Libre"); return; }
    if (step === 1 && missingAttrs.length > 0) { setError(`Faltan completar: ${missingAttrs.map(a => a.name).join(", ")}`); return; }
    if (step === 2) {
      if (newPictures.some(p => p.uploading)) { setError("Esperá a que terminen de subirse las imágenes"); return; }
      if (readyImageCount(imageOrder, newPictures) === 0) { setError("Seleccioná o subí al menos una imagen — Mercado Libre no permite publicar sin fotos"); return; }
    }
    if (step === 3 && !title.trim()) { setError("Ingresá un título"); return; }
    setStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1));
  }

  async function suggestTitleAi() {
    setSuggestingTitle(true);
    try {
      const res = await client.post("/seller/ml/suggest/title", { productName: product.name, categoryName, adminInfo: product.admin_info });
      setTitle(res.data.title);
    } catch { setError("No se pudo generar el título"); }
    finally { setSuggestingTitle(false); }
  }

  async function suggestDescriptionAi() {
    setSuggestingDesc(true);
    try {
      const res = await client.post("/seller/ml/suggest/description", {
        productName: product.name, description,
        imageUrls: existingImages.map(i => i.url),
        adminInfo: product.admin_info,
      });
      setDescription(res.data.description);
    } catch { setError("No se pudo generar la descripción"); }
    finally { setSuggestingDesc(false); }
  }

  async function suggestAttrsAi(attrsToFill) {
    const pending = attrsToFill.filter(a => !isValidAttrValue(a, attrValues[a.id]));
    if (pending.length === 0) return;
    setSuggestingAttrs(true);
    try {
      const res = await client.post("/seller/ml/suggest/attributes", {
        productName: product.name, description, categoryName,
        attrDefs: pending.map(a => ({ id: a.id, name: a.name, values: a.values, valueType: a.valueType })),
        imageUrls: existingImages.map(i => i.url),
        adminInfo: product.admin_info,
      });
      setAttrValues(prev => ({ ...prev, ...res.data.values }));
    } catch { setError("No se pudieron sugerir las características"); }
    finally { setSuggestingAttrs(false); }
  }

  async function generateImageAi(userPrompt) {
    setGeneratingImage(true); setError("");
    try {
      const res = await client.post("/seller/ml/pictures/generate",
        { productName: product.name, description, imageUrls: existingImages.map(i => i.url), userPrompt, adminInfo: product.admin_info },
        { timeout: 90000 });
      // ImageOrderPicker dibuja imageOrder, no newPictures — sin esto la imagen se generaba y
      // quedaba guardada en el estado, pero nunca aparecía en pantalla ni contaba para validar
      // "al menos una foto seleccionada" (mismo patrón que ya usa handleFileUpload).
      setNewPictures(prev => [...prev, { previewUrl: res.data.previewUrl, ref: res.data.ref, uploading: false }]);
      setImageOrder(prev => [...prev, { type: "new", previewUrl: res.data.previewUrl }]);
    } catch (err) {
      console.error("[ml] generateImageAi:", err);
      setError(err.response?.data?.message || "No se pudo generar la imagen");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function publish() {
    if (!categoryId) { setError("Elegí una categoría de Mercado Libre"); return; }
    if (!priceValid) {
      setError(priceFloor != null
        ? `El precio no puede ser menor a $${Math.round(priceFloor).toLocaleString("es-AR")} (costo total del producto)`
        : "Ingresá un precio válido");
      return;
    }
    if (missingAttrs.length > 0) {
      setError(`Faltan completar: ${missingAttrs.map(a => a.name).join(", ")}`);
      return;
    }
    if (newPictures.some(p => p.uploading)) { setError("Esperá a que terminen de subirse las imágenes"); return; }
    if (readyImageCount(imageOrder, newPictures) === 0) { setError("Seleccioná o subí al menos una imagen — Mercado Libre no permite publicar sin fotos"); return; }

    if (mlMissingAttr && !mlMissingValue.trim()) {
      setError(`Completá "${mlMissingAttr.name}" para poder publicar`);
      return;
    }

    setSaving(true); setError(""); setKycRequired(null);
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
      // Se manda en el orden elegido por el vendedor (la primera es la portada en ML) — el
      // backend resuelve cada ítem en secuencia en vez de asumir "primero catálogo, después
      // subidas nuevas" como antes.
      const orderedImages = imageOrder
        .map(item => {
          if (item.type === "existing") return { type: "existing", key: item.key };
          const pic = newPictures.find(p => p.previewUrl === item.previewUrl);
          return pic?.ref ? { type: "new", ref: pic.ref } : null;
        })
        .filter(Boolean);

      const res = await client.post(`/seller/ml/products/${product.id}/publish`, {
        mlCategoryId: categoryId, price: Number(price), shippingFree, attributes,
        title, description,
        orderedImages,
        listingTypeId: selectedOption?.listingTypeId || "gold_special",
        installmentTags: selectedOption?.tags || [],
      });
      onPublished({ ...res.data, requestedShippingFree: shippingFree });
    } catch (err) {
      const missing = err.response?.data?.missingAttribute;
      if (err.response?.data?.accountDataIncomplete) {
        setKycRequired({ message: err.response.data.message, kycUrl: err.response.data.kycUrl });
      } else if (err.response?.data?.addressMismatch) {
        // El backend lo detectó recién ahora (el chequeo previo pudo quedar "unknown" o
        // desactualizado) — mostramos la misma pantalla de bloqueo en vez de un error suelto.
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
        setError(err.response?.data?.message || "No se pudo publicar el producto");
      }
    } finally {
      setSaving(false);
    }
  }

  if (localAddressStatus?.connected && localAddressStatus.valid === false) {
    return (
      <Modal title="Publicar en Mercado Libre" onClose={onClose} maxWidth={480}>
        <AddressBlockNotice addressStatus={localAddressStatus} onRecheck={recheckAddress} checking={checkingAddress} />
      </Modal>
    );
  }

  return (
    <Modal title="Publicar en Mercado Libre" onClose={onClose} maxWidth={820} minimized={minimized} onMinimize={onMinimize} footer={
      <>
        {kycRequired && <AccountDataIncompleteNotice message={kycRequired.message} kycUrl={kycRequired.kycUrl} />}
        {error && <p style={{ margin: "0 0 12px", fontSize: ".84rem", color: "var(--danger,#ef4444)" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button type="button" className="btn btn--ghost" style={{ padding: "13px 20px", fontSize: ".92rem" }} onClick={goBack} disabled={saving}>Atrás</button>
          )}
          {step < WIZARD_STEPS.length - 1 ? (
            <button type="button" className="btn btn--primary" style={{ flex: 1, padding: "13px", fontSize: ".96rem", justifyContent: "center" }} onClick={goNext}>
              Siguiente <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" className="btn btn--primary" style={{ flex: 1, padding: "13px", fontSize: ".96rem", justifyContent: "center" }} onClick={publish} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : mlMissingAttr ? "Reintentar publicación" : "Publicar"}
            </button>
          )}
        </div>
      </>
    }>
      <WizardProgress step={step} total={WIZARD_STEPS.length} steps={WIZARD_STEPS} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <IconBadge icon={WIZARD_STEP_ICONS[step]} size={40} iconSize={19} />
        <h4 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800 }}>{WIZARD_STEPS[step]}</h4>
      </div>

      {step === 0 && (
        <>
          <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Categoría de Mercado Libre</label>
          <div className="ml-category-search">
            <Search size={15} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchCategories()}
              placeholder="Palabras clave para buscar la categoría" />
            <button type="button" onClick={searchCategories}>Buscar</button>
          </div>
          {suggestions.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Buscá una categoría para ver las opciones.</p>
          ) : (
            <div className="ml-category-list">
              {suggestions.map(s => {
                const selected = s.categoryId === categoryId;
                return (
                  <button key={s.categoryId} type="button" onClick={() => setCategoryId(s.categoryId)}
                    className={`ml-category-option${selected ? " is-selected" : ""}`}>
                    <div>
                      <div className="ml-category-option__name">{s.categoryName}</div>
                      {s.path && <div className="ml-category-option__path">{s.path}</div>}
                    </div>
                    {selected && <CheckCircle2 size={17} />}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {step === 1 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>Datos requeridos por "{categoryName}"</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => suggestAttrsAi(requiredAttrs)} disabled={suggestingAttrs}>
              {suggestingAttrs ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          {requiredAttrs.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Esta categoría no pide datos obligatorios.</p>
          ) : (
            <div style={{ padding: "16px 18px", border: "1px solid var(--border)", borderRadius: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {requiredAttrs.map(a => (
                <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <ImageOrderPicker
          existingImages={existingImages}
          imageOrder={imageOrder} setImageOrder={setImageOrder}
          newPictures={newPictures} setNewPictures={setNewPictures}
          onGenerateAi={generateImageAi} generatingAi={generatingImage}
        />
      )}

      {step === 3 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: ".82rem", fontWeight: 700 }}>Título de la publicación</label>
            <button type="button" className="btn btn--ghost btn--sm" onClick={suggestTitleAi} disabled={suggestingTitle}>
              {suggestingTitle ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          <input className="form-input" style={{ padding: "13px 14px", fontSize: "1rem" }} maxLength={60} value={title} onChange={e => setTitle(e.target.value)} />
          <small style={{ display: "block", marginTop: 6, textAlign: "right", color: "var(--text-secondary)" }}>{title.length}/60</small>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>Opcional — mejora la exposición de la publicación</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => suggestAttrsAi(optionalAttrs)} disabled={suggestingAttrs || optionalAttrs.length === 0}>
              {suggestingAttrs ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          {optionalAttrs.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Esta categoría no tiene características opcionales.</p>
          ) : (
            <div style={{ padding: "16px 18px", border: "1px solid var(--border)", borderRadius: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {optionalAttrs.map(a => (
                <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: ".82rem", fontWeight: 700 }}>Descripción</label>
            <button type="button" className="btn btn--ghost btn--sm" onClick={suggestDescriptionAi} disabled={suggestingDesc}>
              {suggestingDesc ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          <textarea className="form-input" rows={8} style={{ resize: "vertical", padding: "13px 14px", fontSize: ".92rem", lineHeight: 1.5 }}
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      )}

      {step === 6 && (
        <PriceStep
          price={price} setPrice={setPrice} priceValid={priceValid} priceFloor={priceFloor}
          showShippingToggle={weightGrams > 0} shippingFree={shippingFree} setShippingFree={setShippingFree} shippingFreeMandatory={shippingFreeMandatory}
          feesLoading={feesLoading} fees={fees} shippingCostKnown={shippingCostKnown} shippingCost={shippingCost}
          installmentOptions={installmentOptions} selectedInstallment={selectedInstallment} setSelectedInstallment={setSelectedInstallment} installmentsCost={installmentsCost}
          hasCategory={!!categoryId} netFinal={netFinal} ganancia={ganancia} gananciaPct={gananciaPct} margenTier={margenTier}
        />
      )}

      {mlMissingAttr && step === WIZARD_STEPS.length - 1 && (
        <div style={{ margin: "16px 0 0", padding: "14px 16px", background: "rgba(217,119,6,.08)",
          border: "1px solid #f59e0b", borderRadius: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: ".82rem", color: "#92400e", fontWeight: 700 }}>
            Mercado Libre necesita este dato para publicar en esta categoría:
          </p>
          <AttributeField attr={mlMissingAttr} value={mlMissingValue} onChange={setMlMissingValue} />
        </div>
      )}
    </Modal>
  );
}
