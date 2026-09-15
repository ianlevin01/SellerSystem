import { useEffect, useState } from "react";
import { Search, ArrowRight, Loader2, PackageSearch, Tag, CheckCircle2 } from "lucide-react";
import client from "../../api/client";
import { Modal, IconBadge, AttributeField, WizardProgress, AddressBlockNotice, AccountDataIncompleteNotice } from "./mlShared";
import PriceStep from "./PriceStep";
import { formatNumberUnitValue } from "./mlUtils";

const CATALOG_WIZARD_STEPS = ["Buscar en el catálogo", "Precio"];
const CATALOG_WIZARD_STEP_ICONS = [PackageSearch, Tag];

// "Publicación de catálogo" — versión corta del wizard, linkeada al catálogo compartido de
// Mercado Libre (compite por el buy box). A diferencia de PublishModal: sin paso de categoría
// manual, fotos, título ni descripción — todo eso lo completa Mercado Libre solo a partir del
// catalog_product_id elegido (confirmado empíricamente, ver createCatalogItem en mlService.js).
export default function PublishCatalogModal({ product, siteId, addressStatus, onClose, onPublished, onSwitchToOwn, minimized, onMinimize }) {
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
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  const [price, setPrice] = useState("");
  const [priceFloor, setPriceFloor] = useState(null);
  const [weightGrams, setWeightGrams] = useState(0);
  const [volumeCm3, setVolumeCm3] = useState(0);
  const [shippingFree, setShippingFree] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState("none");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [kycRequired, setKycRequired] = useState(null); // { message, kycUrl } | null
  const [mlMissingAttr, setMlMissingAttr] = useState(null);
  const [mlMissingValue, setMlMissingValue] = useState("");

  function searchCatalog() {
    setSearching(true);
    client.get("/seller/ml/catalog/search", { params: { q: query } })
      .then(r => setResults(r.data || []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }

  useEffect(() => {
    searchCatalog();
    client.get(`/seller/ml/products/${product.id}/price-floor`)
      .then(r => {
        setPriceFloor(r.data.floor);
        setWeightGrams(Number(r.data.weightGrams || 0));
        setVolumeCm3(Number(r.data.volumeCm3 || 0));
      })
      .catch(() => setPriceFloor(null));
  }, []); // eslint-disable-line

  const shippingFreeMandatory = siteId === "MLA" && Number(price) >= 33000;
  useEffect(() => {
    if (shippingFreeMandatory) setShippingFree(true);
  }, [shippingFreeMandatory]);

  const priceValid = (() => {
    const p = Number(price);
    if (!p || p <= 0) return false;
    if (priceFloor != null && p < priceFloor) return false;
    return true;
  })();

  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);

  useEffect(() => {
    const p = Number(price);
    if (!picked?.categoryId || !p || p <= 0) { setFees(null); return; }
    let cancelled = false;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      client.get("/seller/ml/listing-fees", {
        params: { price: p, categoryId: picked.categoryId, ...(weightGrams > 0 ? { weightGrams, volumeCm3 } : {}) },
      })
        .then(r => { if (!cancelled) setFees(r.data); })
        .catch(() => { if (!cancelled) setFees(null); })
        .finally(() => { if (!cancelled) setFeesLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [price, picked, weightGrams, volumeCm3]);

  const installmentOptions = fees?.installmentOptions || [];
  const selectedOption     = installmentOptions.find(o => o.id === selectedInstallment) || null;
  const shippingCostKnown  = fees?.shippingCost != null;
  const shippingCost       = shippingFree && shippingCostKnown ? Number(fees.shippingCost) : 0;
  const installmentsCost  = selectedOption ? Number(selectedOption.extraCost || 0) : 0;
  const netFinal    = fees ? Number(fees.netAmount) - shippingCost - installmentsCost : null;
  const ganancia    = netFinal != null && priceFloor != null ? netFinal - priceFloor : null;
  const gananciaPct = ganancia != null && Number(price) > 0 ? (ganancia / Number(price)) * 100 : null;
  const margenTier  = ganancia == null ? null : ganancia < 0 ? "loss" : gananciaPct >= 8 ? "good" : "thin";

  function goBack() { setError(""); setStep(0); }
  function goNext() {
    setError("");
    if (!picked) { setError("Elegí una coincidencia del catálogo"); return; }
    setStep(1);
  }

  async function publish() {
    if (!picked) { setError("Elegí una coincidencia del catálogo"); return; }
    if (!priceValid) {
      setError(priceFloor != null
        ? `El precio no puede ser menor a $${Math.round(priceFloor).toLocaleString("es-AR")} (costo total del producto)`
        : "Ingresá un precio válido");
      return;
    }
    if (mlMissingAttr && !mlMissingValue.trim()) {
      setError(`Completá "${mlMissingAttr.name}" para poder publicar`);
      return;
    }

    setSaving(true); setError(""); setKycRequired(null);
    try {
      // Normalmente vacío — ML completa los atributos solo desde el catalog_product_id. Solo
      // se llena si Mercado Libre pidió un atributo puntual que no supimos resolver solos.
      const attributes = mlMissingAttr && mlMissingValue.trim()
        ? [{ id: mlMissingAttr.id, value_name: mlMissingAttr.valueType === "number_unit" ? formatNumberUnitValue(mlMissingAttr, mlMissingValue) : mlMissingValue }]
        : [];
      const res = await client.post(`/seller/ml/products/${product.id}/publish-catalog`, {
        catalogProductId: picked.catalogProductId, categoryId: picked.categoryId,
        price: Number(price), shippingFree, attributes,
        listingTypeId: selectedOption?.listingTypeId || "gold_special",
        installmentTags: selectedOption?.tags || [],
      });
      onPublished({ ...res.data, requestedShippingFree: shippingFree });
    } catch (err) {
      const missing = err.response?.data?.missingAttribute;
      if (err.response?.data?.accountDataIncomplete) {
        setKycRequired({ message: err.response.data.message, kycUrl: err.response.data.kycUrl });
      } else if (err.response?.data?.addressMismatch) {
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
      <Modal title="Publicar en Mercado Libre" onClose={onClose} maxWidth={480} minimized={minimized} onMinimize={onMinimize}>
        <AddressBlockNotice addressStatus={localAddressStatus} onRecheck={recheckAddress} checking={checkingAddress} />
      </Modal>
    );
  }

  return (
    <Modal title="Publicación de catálogo — Mercado Libre" onClose={onClose} maxWidth={820} minimized={minimized} onMinimize={onMinimize} footer={
      <>
        {kycRequired && <AccountDataIncompleteNotice message={kycRequired.message} kycUrl={kycRequired.kycUrl} />}
        {error && <p style={{ margin: "0 0 12px", fontSize: ".84rem", color: "var(--danger,#ef4444)" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button type="button" className="btn btn--ghost" style={{ padding: "13px 20px", fontSize: ".92rem" }} onClick={goBack} disabled={saving}>Atrás</button>
          )}
          {step === 0 ? (
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
      <WizardProgress step={step} total={CATALOG_WIZARD_STEPS.length} steps={CATALOG_WIZARD_STEPS} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <IconBadge icon={CATALOG_WIZARD_STEP_ICONS[step]} size={40} iconSize={19} />
        <h4 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800 }}>{CATALOG_WIZARD_STEPS[step]}</h4>
      </div>

      {step === 0 && (
        <>
          <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Buscá tu producto en el catálogo de Mercado Libre</label>
          <div className="ml-category-search">
            <Search size={15} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchCatalog()}
              placeholder="Nombre del producto" />
            <button type="button" onClick={searchCatalog}>Buscar</button>
          </div>

          {searching ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={13} className="spin" /> Buscando...
            </p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>No se encontraron coincidencias — probá con otras palabras.</p>
          ) : (
            <div className="ml-category-list">
              {results.map(r => {
                const selected = r.catalogProductId === picked?.catalogProductId;
                return (
                  <button key={r.catalogProductId} type="button" onClick={() => setPicked(r)}
                    className={`ml-category-option${selected ? " is-selected" : ""}`}
                    style={{ alignItems: "flex-start" }}>
                    {r.pictures?.[0] && (
                      <img src={r.pictures[0]} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", marginRight: 10, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="ml-category-option__name">{r.name}</div>
                      {r.attributes?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                          {r.attributes.slice(0, 6).map(a => (
                            <span key={a.id} className="badge badge--gray" style={{ fontSize: ".72rem" }}>{a.name}: {a.valueName}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {selected && <CheckCircle2 size={17} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}

          <button type="button" onClick={onSwitchToOwn}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 14, fontSize: ".82rem", color: "var(--text-secondary)", textDecoration: "underline" }}>
            Ninguna coincide — publicar como producto propio
          </button>
        </>
      )}

      {step === 1 && (
        <>
          {picked && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", borderRadius: 12, background: "var(--surface-2,#f9fafb)" }}>
              {picked.pictures?.[0] && (
                <img src={picked.pictures[0]} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div>
                <strong style={{ fontSize: ".84rem", display: "block" }}>{picked.name}</strong>
                <span style={{ fontSize: ".76rem", color: "var(--text-secondary)" }}>Vinculado al catálogo de Mercado Libre</span>
              </div>
            </div>
          )}
          <PriceStep
            price={price} setPrice={setPrice} priceValid={priceValid} priceFloor={priceFloor}
            showShippingToggle={weightGrams > 0} shippingFree={shippingFree} setShippingFree={setShippingFree} shippingFreeMandatory={shippingFreeMandatory}
            feesLoading={feesLoading} fees={fees} shippingCostKnown={shippingCostKnown} shippingCost={shippingCost}
            installmentOptions={installmentOptions} selectedInstallment={selectedInstallment} setSelectedInstallment={setSelectedInstallment} installmentsCost={installmentsCost}
            hasCategory={!!picked?.categoryId} netFinal={netFinal} ganancia={ganancia} gananciaPct={gananciaPct} margenTier={margenTier}
          />
        </>
      )}

      {mlMissingAttr && step === 1 && (
        <div style={{ margin: "16px 0 0", padding: "14px 16px", background: "rgba(217,119,6,.08)", border: "1px solid #f59e0b", borderRadius: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: ".82rem", color: "#92400e", fontWeight: 700 }}>
            Mercado Libre necesita este dato para publicar en esta categoría:
          </p>
          <AttributeField attr={mlMissingAttr} value={mlMissingValue} onChange={setMlMissingValue} />
        </div>
      )}
    </Modal>
  );
}
