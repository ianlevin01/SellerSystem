import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, Layers, Lock } from "lucide-react";
import client from "../../api/client";
import { Modal, AttributeField } from "./mlShared";
import ImageOrderPicker from "./ImageOrderPicker";
import { readyImageCount } from "./mlUtils";

function fmt(n) { return Math.round(Number(n || 0)).toLocaleString("es-AR"); }

function makeRow(imageOrder, price) {
  return {
    key: Math.random().toString(36).slice(2), // solo para React, nunca se manda al backend
    value: "", price: price || "",
    imageOrder: imageOrder || [], newPictures: [],
  };
}

// Prefijo sintético para distinguir, dentro del pool de "existing" que recibe ImageOrderPicker,
// una foto que ya está subida a ESTA publicación en Mercado Libre (identificada por su
// picture_id real de ML) de una del catálogo de Ventaz (identificada por su key de S3) — ver
// buildRootImagePool más abajo.
const ML_PICTURE_PREFIX = "ml-picture:";

// Fotos con las que arranca una fila de variante NUEVA — las mismas que ya tiene la publicación
// real en ML (mlPics), y solo si no se pudieron traer cae al pool genérico del catálogo. Nunca
// arranca vacía: la idea es que una variante nueva se vea "igual" a la que ya existe salvo por
// el valor que la distingue (ej. el color), no que el vendedor tenga que rearmar fotos de cero.
function buildDefaultVariantImageOrder(mlPics, catalogImgs) {
  if (mlPics?.length) return mlPics.map(p => ({ type: "existing", key: `${ML_PICTURE_PREFIX}${p.id}` }));
  return (catalogImgs || []).map(i => ({ type: "existing", key: i.key }));
}

// Arma el array orderedImages que espera el backend a partir del estado de una fila —
// mismo formato que ya usa PublishModal/PublishComboModal. Una foto ya subida a ML (prefijo
// ML_PICTURE_PREFIX) no necesita subirse de nuevo: se referencia directo por su picture_id,
// igual que hace buildPictureRef del lado del backend para una foto ya conocida por ML.
function buildOrderedImages(imageOrder, newPictures) {
  return imageOrder
    .map(item => {
      if (item.type === "existing" && item.key.startsWith(ML_PICTURE_PREFIX)) {
        return { type: "new", ref: { id: item.key.slice(ML_PICTURE_PREFIX.length) } };
      }
      if (item.type === "existing") return { type: "existing", key: item.key };
      const pic = newPictures.find(p => p.previewUrl === item.previewUrl);
      return pic?.ref ? { type: "new", ref: pic.ref } : null;
    })
    .filter(Boolean);
}

// Vista para agregar variantes (ej. colores) a una publicación de Mercado Libre — se abre desde
// dos lugares: la tarjeta de éxito al terminar de publicar un producto, o el menú "..." de una
// publicación ya existente en "Tus publicaciones". En los dos casos ya se tiene la fila completa
// de ml_listings (rootListing) y sus hermanas si ya tenía (siblings), sin necesidad de un fetch
// nuevo para eso.
export default function PublishVariantsModal({ rootListing, siblings = [], onClose, onSaved }) {
  const productId = rootListing.product_id;
  const needsRootValue = !rootListing.variant_value;

  const [loading, setLoading] = useState(true);
  const [existingImages, setExistingImages] = useState([]);
  const [rootMlImages, setRootMlImages] = useState(null); // null = todavía no se sabe / no se pudo traer
  const [priceFloor, setPriceFloor] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const [variantAttributeId, setVariantAttributeId] = useState(rootListing.variant_attribute_id || "");
  const [variantAttributeName, setVariantAttributeName] = useState(rootListing.variant_attribute_name || "");
  const [attributeConfirmed, setAttributeConfirmed] = useState(!!rootListing.variant_attribute_id);
  const [customAttributeName, setCustomAttributeName] = useState("");
  // Lista real de valores válidos de ML para el atributo elegido (ej. los colores exactos que
  // Mercado Libre reconoce para MAIN_COLOR) — cuando existe, el campo "Valor" de cada variante
  // se restringe a elegir de acá en vez de texto libre. Varios atributos de este estilo (sobre
  // todo MAIN_COLOR) rechazan cualquier string que no coincida EXACTO con uno de estos valores
  // ("Roja" no es lo mismo que "Rojo" para ML, aunque para una persona sí).
  const [variantAttrDef, setVariantAttrDef] = useState(null);

  const rootPrice = rootListing.price ? String(Math.round(Number(rootListing.price))) : "";
  const [rootRow, setRootRow] = useState(() => makeRow(null, rootPrice));
  const [rows, setRows] = useState([makeRow()]);
  const [sharedPrice, setSharedPrice] = useState(rootPrice);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // respuesta del backend — puede venir con "failed" parcial

  useEffect(() => {
    const calls = [
      client.get(`/seller/ml/products/${productId}/price-floor`),
      client.get(`/seller/images/${productId}`, { params: { all: true } }),
      client.get(`/seller/ml/variant-eligibility`),
      rootListing.ml_category_id
        ? client.get(`/seller/ml/categories/${rootListing.ml_category_id}/attributes`)
        : Promise.resolve({ data: [] }),
      // Solo hace falta si la raíz todavía va a mostrarse editable — si ya es parte de una
      // familia (needsRootValue false) no se toca su imageOrder para nada.
      needsRootValue
        ? client.get(`/seller/ml/listings/${rootListing.ml_item_id}/pictures`).catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
    ];
    Promise.all(calls).then(([floorRes, imgRes, eligRes, attrRes, picsRes]) => {
      setPriceFloor(floorRes.data.floor);
      const imgs = imgRes.data || [];
      setExistingImages(imgs);
      setEligibility(eligRes.data);

      // Tanto la raíz como la primera fila de variante nueva arrancan con lo mismo que ya está
      // publicado de verdad (fotos reales de ML si se pudieron traer, si no el pool del
      // catálogo) y el mismo precio — así una variante nueva se ve "igual" a la que ya existe,
      // salvo por el valor que todavía falta (el color/tamaño en sí). Si no se pudo traer nada
      // (cuenta desconectada, error de red), cae al pool del catálogo para las dos.
      const mlPics = picsRes.data;
      const defaultImageOrder = buildDefaultVariantImageOrder(mlPics, imgs);
      if (mlPics?.length) setRootMlImages(mlPics);
      setRootRow(r => ({ ...r, imageOrder: defaultImageOrder }));
      setRows([{ ...makeRow(defaultImageOrder, rootPrice) }]);

      const defs = attrRes.data || [];
      if (!variantAttributeId) {
        const suggested = defs.find(a => a.variationAttribute) || defs.find(a => a.allowVariations);
        if (suggested) { setVariantAttributeId(suggested.id); setVariantAttributeName(suggested.name); setVariantAttrDef(suggested); }
      } else {
        // Reabriendo el modal para sumar más variantes a una familia que ya existía — el
        // atributo ya viene confirmado (variant_attribute_id de la raíz), pero igual hace falta
        // su lista de valores reales para validar lo que se tipee acá.
        const known = defs.find(a => a.id === variantAttributeId);
        if (known) setVariantAttrDef(known);
      }
    }).catch(() => setError("No se pudo cargar la información del producto"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pool de fotos para la fila de la raíz: lo que ya está publicado en ML + el catálogo de
  // Ventaz (por si el vendedor quiere sumar una foto del catálogo que todavía no subió a esa
  // publicación puntual). Las filas de variantes nuevas siguen usando solo `existingImages`.
  const rootImagePool = [
    ...(rootMlImages || []).map(p => ({ id: `${ML_PICTURE_PREFIX}${p.id}`, key: `${ML_PICTURE_PREFIX}${p.id}`, url: p.url })),
    ...existingImages,
  ];

  function confirmAttribute() {
    if (!variantAttributeId && customAttributeName.trim()) {
      setVariantAttributeId(customAttributeName.trim().toUpperCase().replace(/\s+/g, "_"));
      setVariantAttributeName(customAttributeName.trim());
    }
    setAttributeConfirmed(true);
  }

  function addRow() {
    setRows(prev => [...prev, makeRow(buildDefaultVariantImageOrder(rootMlImages, existingImages), rootPrice)]);
  }
  function removeRow(key) {
    setRows(prev => prev.filter(r => r.key !== key));
  }
  function updateRow(key, patch) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  }

  const perVariantPrice = !!eligibility?.eligible;

  const rootReady = !needsRootValue || (rootRow.value.trim() && readyImageCount(rootRow.imageOrder, rootRow.newPictures) > 0);
  const rowsReady = rows.length > 0 && rows.every(r => r.value.trim() && readyImageCount(r.imageOrder, r.newPictures) > 0);
  const priceReady = perVariantPrice
    ? rows.every(r => Number(r.price) >= (priceFloor || 0)) && (!needsRootValue || Number(rootRow.price) >= (priceFloor || 0))
    : Number(sharedPrice) >= (priceFloor || 0);
  const canSubmit = attributeConfirmed && !!variantAttributeId && rootReady && rowsReady && priceReady && !saving;

  async function submit() {
    setSaving(true); setError(""); setResult(null);
    try {
      const payload = {
        variantAttributeId, variantAttributeName,
        variants: rows.map(r => ({
          value: r.value.trim(),
          price: perVariantPrice ? Number(r.price) : undefined,
          orderedImages: buildOrderedImages(r.imageOrder, r.newPictures),
        })),
      };
      if (!perVariantPrice) payload.sharedPrice = Number(sharedPrice);
      if (needsRootValue) {
        payload.rootValue = rootRow.value.trim();
        payload.rootOrderedImages = buildOrderedImages(rootRow.imageOrder, rootRow.newPictures);
        if (perVariantPrice) payload.rootPrice = Number(rootRow.price);
      }

      const res = await client.post(`/seller/ml/listings/${rootListing.ml_item_id}/variants`, payload);
      setResult(res.data);
      if (!res.data.failed) onSaved?.(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron publicar las variantes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Modal title="Agregar variantes" onClose={onClose} maxWidth={520}>
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
          <Loader2 size={22} className="spin" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Agregar variantes" onClose={onClose} maxWidth={attributeConfirmed ? 720 : 520} footer={attributeConfirmed && (
      <>
        {error && <p style={{ color: "var(--danger,#ef4444)", fontSize: ".84rem", margin: "0 0 12px" }}>{error}</p>}
        {result?.failed && (
          <p style={{ color: "var(--danger,#ef4444)", fontSize: ".84rem", margin: "0 0 12px" }}>
            "{result.failed.value}" no se pudo publicar: {result.failed.message}. Las variantes anteriores ya quedaron publicadas.
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {result && !result.failed ? "Cerrar" : "Cancelar"}
          </button>
          {(!result || result.failed) && (
            <button type="button" className="btn btn--primary btn--sm" disabled={!canSubmit} onClick={submit}>
              {saving ? <Loader2 size={13} className="spin" /> : `Publicar ${rows.length} variante${rows.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </>
    )}>
      {siblings.length > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, fontSize: ".8rem", color: "var(--text-secondary)" }}>
          Esta publicación ya tiene {siblings.length} variante{siblings.length === 1 ? "" : "s"}: {siblings.map(s => s.variant_value).join(", ")}.
        </div>
      )}

      {!attributeConfirmed ? (
        <div style={{ textAlign: "center", maxWidth: 420, margin: "0 auto", padding: "8px 4px 16px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: "var(--brand-light,#eafbe0)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
          }}>
            <Layers size={26} color="var(--brand,#4db81a)" />
          </div>
          <h4 style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 800 }}>¿Qué varía entre las variantes?</h4>
          <p style={{ margin: "0 0 26px", fontSize: ".92rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Elegí el atributo que las va a diferenciar entre sí — por ejemplo, el color.
          </p>

          {variantAttributeId ? (
            <>
              <div style={{
                padding: "20px 22px", borderRadius: 14, border: "2px solid var(--brand,#4db81a)",
                background: "var(--brand-light,#f3fbee)", textAlign: "left",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{variantAttributeName}</div>
                  <div style={{ fontSize: ".82rem", color: "var(--text-secondary)", marginTop: 3 }}>
                    Sugerido por Mercado Libre para esta categoría
                  </div>
                </div>
                <span style={{
                  fontSize: ".72rem", fontWeight: 700, color: "var(--brand,#4db81a)", background: "#fff",
                  padding: "5px 12px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  Recomendado
                </span>
              </div>
              <button type="button" className="btn btn--primary" style={{ width: "100%", marginTop: 18, padding: "13px", fontSize: ".96rem", justifyContent: "center" }}
                onClick={confirmAttribute}>
                Confirmar y continuar
              </button>
              <button type="button" onClick={() => { setVariantAttributeId(""); setVariantAttributeName(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".84rem", color: "var(--text-secondary)", marginTop: 14, textDecoration: "underline" }}>
                Elegir otro atributo
              </button>
            </>
          ) : (
            <>
              <input className="form-input" style={{ textAlign: "center", fontSize: "1.02rem", padding: "13px 14px" }}
                placeholder="Ej. Color" value={customAttributeName} onChange={e => setCustomAttributeName(e.target.value)} autoFocus />
              <button type="button" className="btn btn--primary" style={{ width: "100%", marginTop: 14, padding: "13px", fontSize: ".96rem", justifyContent: "center" }}
                disabled={!customAttributeName.trim()} onClick={confirmAttribute}>
                Confirmar y continuar
              </button>
            </>
          )}

          <p style={{ margin: "24px 0 0", fontSize: ".8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Mercado Libre no siempre puede confirmar cuál es el atributo correcto para esta categoría — si no es el que esperabas, se puede escribir a mano.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: ".84rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>Variando por:</span>
          <span className="badge badge--green">{variantAttributeName}</span>
          <button type="button" onClick={() => setAttributeConfirmed(false)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".78rem", color: "var(--brand,#4db81a)" }}>
            cambiar
          </button>
        </div>
      )}

      {attributeConfirmed && (
        <>
          {!perVariantPrice && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", marginBottom: 16, borderRadius: 9, background: "rgba(217,119,6,.08)", border: "1px solid #f59e0b" }}>
              <AlertTriangle size={16} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: ".8rem", color: "#92400e" }}>
                Tu cuenta de Mercado Libre todavía no tiene habilitado precio distinto por variante — todas van a salir con el mismo precio.
                <div style={{ marginTop: 8, maxWidth: 200 }}>
                  <label style={{ fontSize: ".74rem", display: "block", marginBottom: 3 }}>Precio (todas las variantes)</label>
                  <input className="form-input" type="number" value={sharedPrice} onChange={e => setSharedPrice(e.target.value)} />
                  {priceFloor != null && <span style={{ fontSize: ".72rem" }}>Mínimo: ${fmt(priceFloor)}</span>}
                </div>
              </div>
            </div>
          )}

          {needsRootValue && (
            <VariantRow
              label="Esta publicación (ya existe)"
              badge="Ya publicada"
              valuePlaceholder="¿Qué es esta publicación? (ej. Rojo)"
              row={rootRow} onChange={patch => setRootRow(r => ({ ...r, ...patch }))}
              existingImages={rootImagePool} perVariantPrice={perVariantPrice} priceFloor={priceFloor}
              sharedPrice={sharedPrice} attrDef={variantAttrDef} isRoot
              imagesHint={rootMlImages?.length
                ? "Estas son las fotos que ya tiene esta publicación en Mercado Libre — también podés sumar fotos del catálogo."
                : null}
              onRemove={null}
            />
          )}

          {rows.map((row, i) => (
            <VariantRow
              key={row.key}
              label={rows.length > 1 ? `Variante nueva ${i + 1}` : "Variante nueva"}
              valuePlaceholder="Ej. Azul"
              row={row} onChange={patch => updateRow(row.key, patch)}
              existingImages={rootImagePool} perVariantPrice={perVariantPrice} priceFloor={priceFloor}
              sharedPrice={sharedPrice} attrDef={variantAttrDef}
              onRemove={rows.length > 1 ? () => removeRow(row.key) : null}
              result={result?.created?.find(c => c.variant_value === row.value.trim())}
              failed={result?.failed?.value === row.value.trim() ? result.failed : null}
            />
          ))}

          <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} style={{ marginBottom: 16 }}>
            <Plus size={13} /> Agregar otra variante
          </button>
        </>
      )}
    </Modal>
  );
}

function VariantRow({ label, badge, valuePlaceholder, row, onChange, existingImages, perVariantPrice, priceFloor, sharedPrice, attrDef, isRoot, imagesHint, onRemove, result, failed }) {
  const hasKnownValues = attrDef?.values?.length > 0;
  return (
    <div style={{
      border: isRoot ? "1px solid var(--border)" : "1px solid var(--border)",
      borderLeft: isRoot ? "3px solid var(--text-secondary,#6b7280)" : "3px solid var(--brand,#4db81a)",
      borderRadius: 10, padding: 14, marginBottom: 12,
      background: isRoot ? "var(--surface-2,#f9fafb)" : "transparent",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: ".76rem", color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
          {badge && <span className="badge badge--gray" style={{ fontSize: ".68rem" }}>{badge}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {result && <CheckCircle2 size={16} color="var(--success,#059669)" />}
          {failed && <XCircle size={16} color="var(--danger,#ef4444)" />}
          {onRemove && (
            <button type="button" onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 160px" }}>
          {hasKnownValues ? (
            <AttributeField attr={{ ...attrDef, name: "Valor" }} value={row.value} onChange={v => onChange({ value: v })} />
          ) : (
            <>
              <label style={{ fontSize: ".74rem", display: "block", marginBottom: 3 }}>Valor</label>
              <input className="form-input" value={row.value} onChange={e => onChange({ value: e.target.value })} placeholder={valuePlaceholder || "Ej. Rojo"} />
            </>
          )}
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={{ fontSize: ".74rem", display: "block", marginBottom: 3 }}>Precio</label>
          {perVariantPrice ? (
            <>
              <input className="form-input" type="number" value={row.price} onChange={e => onChange({ price: e.target.value })} />
              {priceFloor != null && <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>Mínimo: ${fmt(priceFloor)}</span>}
            </>
          ) : (
            <div className="form-input" style={{
              display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)",
              background: "var(--surface-2,#f3f4f6)", cursor: "not-allowed",
            }}>
              <Lock size={12} /> ${fmt(sharedPrice)}
            </div>
          )}
        </div>
      </div>
      {imagesHint && (
        <p style={{ margin: "0 0 8px", fontSize: ".74rem", color: "var(--text-secondary)" }}>{imagesHint}</p>
      )}
      <ImageOrderPicker
        existingImages={existingImages}
        imageOrder={row.imageOrder} setImageOrder={imgs => onChange({ imageOrder: typeof imgs === "function" ? imgs(row.imageOrder) : imgs })}
        newPictures={row.newPictures} setNewPictures={pics => onChange({ newPictures: typeof pics === "function" ? pics(row.newPictures) : pics })}
      />
    </div>
  );
}
