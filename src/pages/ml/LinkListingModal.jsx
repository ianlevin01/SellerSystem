import { useEffect, useState } from "react";
import { Search, Loader2, AlertTriangle, Package } from "lucide-react";
import client from "../../api/client";
import { Modal, IconBadge } from "./mlShared";

// Vincular una publicación de Mercado Libre (traída en vivo, no lo que ya tenemos guardado) a
// un producto de Ventaz — para publicaciones hechas directo en ML, sin pasar por acá, que de
// otra forma quedan invisibles en "Tus publicaciones" para siempre. 3 pasos: elegir la
// publicación → (si ya estaba vinculada) confirmar el cambio → elegir el producto nuevo.
export default function LinkListingModal({ onClose, onLinked, initialListing }) {
  const [step, setStep] = useState(() => initialListing ? "loading" : "browse");
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [listingQuery, setListingQuery] = useState("");

  const [selected, setSelected] = useState(initialListing || null);

  const [query, setQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [pickError, setPickError] = useState("");

  function loadListings() {
    setLoadingList(true); setListError("");
    client.get("/seller/ml/listings/browse")
      .then(r => setItems(r.data.items))
      .catch(err => setListError(err.response?.data?.message || "No se pudieron traer tus publicaciones"))
      .finally(() => setLoadingList(false));
  }

  useEffect(() => { if (!initialListing) loadListings(); }, []);

  // Sin vincular primero (ya viene así del backend), y dentro de eso, lo que matchee la
  // búsqueda — todo en memoria, sin volver a pedirle nada a ML por cada letra tipeada.
  const filteredItems = listingQuery.trim()
    ? items.filter(i => i.title.toLowerCase().includes(listingQuery.trim().toLowerCase()))
    : items;

  // Al abrir desde "Cambiar producto asignado" (ver initialListing más arriba), la foto/título
  // que trae la fila de "Tus publicaciones" son los del producto de Ventaz ACTUALMENTE
  // vinculado, no los reales de la publicación en Mercado Libre — se pisan acá con un fetch en
  // vivo antes de mostrar nada, para que el vendedor confirme que está tocando la publicación
  // correcta. Si falla, seguimos con lo que ya teníamos en vez de trabar el flujo — la
  // corrección real (el PATCH final) igual revalida todo en vivo contra ML.
  useEffect(() => {
    if (!initialListing) return;
    let cancelled = false;
    client.get(`/seller/ml/listings/${initialListing.mlItemId}/live-preview`)
      .then(r => {
        if (cancelled) return;
        setSelected(prev => ({ ...prev, thumbnail: r.data.thumbnail, title: r.data.title || prev.title }));
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewError("No pudimos traer la foto/título actuales de Mercado Libre — se muestra la última información guardada.");
      })
      .finally(() => {
        if (!cancelled) setStep(initialListing.linkedProductId ? "warning" : "pick");
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "pick") return;
    if (!query.trim()) { setProductResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      client.get("/seller/ml/products/search-for-linking", { params: { q: query } })
        .then(r => setProductResults(r.data || []))
        .catch(() => setProductResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, step]);

  function pickListing(item) {
    setSelected(item);
    setStep(item.linkedProductId ? "warning" : "pick");
  }

  async function confirmLink(productId) {
    setLinking(true); setPickError("");
    try {
      await client.patch(`/seller/ml/listings/${selected.mlItemId}/link`, { productId });
      onLinked();
    } catch (err) {
      setPickError(err.response?.data?.message || "No se pudo vincular la publicación");
    } finally {
      setLinking(false);
    }
  }

  return (
    <Modal
      title={step === "pick" ? "Elegí el producto" : step === "warning" ? "Cambiar producto vinculado" : "Vincular publicación de Mercado Libre"}
      onClose={onClose}
      maxWidth={560}
    >
      {step === "loading" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
          <Loader2 size={20} className="spin" />
        </div>
      )}

      {step === "browse" && (
        <div>
          <p style={{ margin: "0 0 14px", fontSize: ".84rem", color: "var(--text-secondary)" }}>
            Elegí la publicación que querés vincular a un producto de tu catálogo. Las que todavía no tienen ningún producto asignado aparecen primero.
          </p>
          {!loadingList && !listError && items.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              <Search size={14} color="var(--text-secondary)" />
              <input
                placeholder="Buscar publicación por título..."
                value={listingQuery}
                onChange={e => setListingQuery(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: ".88rem", flex: 1, background: "transparent" }}
              />
            </div>
          )}
          {loadingList ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
              <Loader2 size={20} className="spin" />
            </div>
          ) : listError ? (
            <p style={{ fontSize: ".84rem", color: "var(--danger,#ef4444)" }}>{listError}</p>
          ) : items.length === 0 ? (
            <p style={{ fontSize: ".84rem", color: "var(--text-secondary)" }}>No encontramos publicaciones activas en tu cuenta de Mercado Libre.</p>
          ) : filteredItems.length === 0 ? (
            <p style={{ fontSize: ".84rem", color: "var(--text-secondary)" }}>Ninguna publicación coincide con esa búsqueda.</p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
                {filteredItems.map(item => (
                  <button
                    key={item.mlItemId}
                    type="button"
                    disabled={item.isCombo}
                    onClick={() => pickListing(item)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      border: "1px solid var(--border)", borderRadius: 12, background: "#fff",
                      textAlign: "left", cursor: item.isCombo ? "not-allowed" : "pointer", opacity: item.isCombo ? .55 : 1,
                    }}>
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" width={44} height={44} style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface-2,#f9fafb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Package size={18} color="var(--text-secondary)" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".86rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      <div style={{ fontSize: ".78rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        ${Number(item.price).toLocaleString("es-AR")}
                        {item.status !== "active" && ` · ${item.status === "paused" ? "Pausada" : "En revisión"}`}
                      </div>
                    </div>
                    {item.isCombo ? (
                      <span className="badge badge--gray" style={{ flexShrink: 0 }}>Es un combo</span>
                    ) : item.linkedProductName ? (
                      <span className="badge badge--green" style={{ flexShrink: 0, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.linkedProductName}>
                        {item.linkedProductName}
                      </span>
                    ) : (
                      <span className="badge badge--yellow" style={{ flexShrink: 0 }}>Sin vincular</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === "warning" && selected && (
        <div>
          {previewError && <p style={{ margin: "0 0 12px", fontSize: ".78rem", color: "var(--text-secondary)" }}>{previewError}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2,#f9fafb)" }}>
            {selected.thumbnail && <img src={selected.thumbnail} alt="" width={40} height={40} style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
            <strong style={{ fontSize: ".86rem" }}>{selected.title}</strong>
          </div>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 14,
            background: "rgba(217,119,6,.12)", border: "1px solid #d97706",
          }}>
            <IconBadge icon={AlertTriangle} color="#d97706" bg="rgba(217,119,6,.16)" size={38} iconSize={18} />
            <div>
              <strong style={{ fontSize: ".88rem", display: "block", marginBottom: 3 }}>Esta publicación ya está vinculada a otro producto</strong>
              <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Ahora mismo, cada venta de esta publicación despacha <strong>{selected.linkedProductName}</strong>. Si confirmás,
                eso cambia: de acá en adelante, esta publicación va a despachar el producto que elijas ahora en cada venta nueva.
                Los pedidos ya generados no se tocan — el cambio solo aplica a ventas futuras.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => {
              if (initialListing) { onClose(); return; }
              setSelected(null); setStep("browse");
            }}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep("pick")}>
              Entendido, cambiar producto vinculado
            </button>
          </div>
        </div>
      )}

      {step === "pick" && selected && (
        <div>
          {previewError && <p style={{ margin: "0 0 12px", fontSize: ".78rem", color: "var(--text-secondary)" }}>{previewError}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2,#f9fafb)" }}>
            {selected.thumbnail && <img src={selected.thumbnail} alt="" width={40} height={40} style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>Vinculando</div>
              <strong style={{ fontSize: ".86rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.title}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
            <Search size={14} color="var(--text-secondary)" />
            <input
              autoFocus
              placeholder="Buscar producto de tu catálogo..."
              value={query}
              disabled={linking}
              onChange={e => setQuery(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: ".88rem", flex: 1, background: "transparent" }}
            />
            {searching && <Loader2 size={14} className="spin" />}
          </div>

          {pickError && <p style={{ fontSize: ".82rem", color: "var(--danger,#ef4444)", marginBottom: 10 }}>{pickError}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
            {productResults.map(p => (
              <button
                key={p.id}
                type="button"
                disabled={linking}
                onClick={() => confirmLink(p.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  border: "1px solid var(--border)", borderRadius: 10, background: "#fff",
                  textAlign: "left", cursor: linking ? "default" : "pointer",
                }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" width={36} height={36} style={{ objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--surface-2,#f9fafb)", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".84rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize: ".74rem", color: "var(--text-secondary)" }}>SKU {p.sku}</div>}
                </div>
                {linking && <Loader2 size={14} className="spin" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
