// src/pages/ProductEditor.jsx
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { Trash2, Upload, ArrowLeft, Image, Sparkles, X, Loader2, Plus, Palette } from "lucide-react";
import RichEditor from "../components/RichEditor";

export default function ProductEditor() {
  const { productId, pageId } = useParams();
  const navigate = useNavigate();
  const fileInputRef      = useRef(null);
  const nameBeforeEditRef = useRef("");

  const [product, setProduct]       = useState(null);
  const [sellerImages, setSellerImages] = useState([]);
  const [systemImages, setSystemImages] = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [dirty, setDirty]           = useState(false);
  const [colorsEnabled, setColorsEnabled] = useState(false);
  const [colors, setColors]               = useState([]);

  // IA: verificación de nombre
  const [aiNameError, setAiNameError]     = useState("");
  const [aiNameChecking, setAiNameChecking] = useState(false);

  // IA: verificación de imagen
  const [aiImgError, setAiImgError]       = useState("");

  // IA: generación de descripción
  const [showAiDesc, setShowAiDesc]         = useState(false);
  const [aiDescBrief, setAiDescBrief]       = useState("");
  const [aiDescGenerating, setAiDescGenerating] = useState(false);
  const [aiDescError, setAiDescError]       = useState("");

  useEffect(() => {
    const productFetch = pageId
      ? client.get(`/seller/store/pages/${pageId}/products/${productId}`)
      : client.get(`/seller/products/${productId}`);
    const imagesFetch = client.get(`/seller/images/${productId}`, pageId ? { params: { pageId } } : {});

    Promise.all([productFetch, imagesFetch]).then(([productRes, imagesRes]) => {
      const found = productRes.data;
      setProduct(found || null);
      setSystemImages(found?.system_images || []);
      setSellerImages(imagesRes.data);
      setCustomName(found?.custom_name || "");
      setCustomDesc(found?.custom_desc || "");
      setColorsEnabled(found?.colors_enabled ?? false);
      setColors(Array.isArray(found?.colors) ? found.colors : []);
      setDirty(false);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [productId, pageId]);

  async function handleSaveCustom() {
    setSaving(true); setSaveMsg("");
    try {
      const descText = customDesc.replace(/<[^>]*>/g, "").trim();
      const endpoint = pageId
        ? `/seller/store/pages/${pageId}/products/${productId}/customize`
        : `/seller/products/${productId}/customize`;
      await client.patch(endpoint, {
        custom_name:    customName.trim() || null,
        custom_desc:    descText ? customDesc : null,
        colors_enabled: colorsEnabled,
        colors:         colorsEnabled ? colors.filter(c => c.name.trim()) : [],
      });
      setSaveMsg("Guardado");
      setDirty(false);
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleNameBlur() {
    const val = customName.trim();
    if (!val || val === product.name) { setAiNameError(""); return; }
    setAiNameChecking(true);
    setAiNameError("");
    try {
      const res = await client.post(`/seller/products/${productId}/ai/verify-name`, { customName: val });
      if (!res.data.valid) {
        setAiNameError(res.data.reason || "El nombre no coincide con el producto original.");
        // Revertir al valor que tenía antes de empezar a editar
        setCustomName(nameBeforeEditRef.current);
        setDirty(nameBeforeEditRef.current !== (product?.custom_name || ""));
      }
    } catch { /* silencioso */ }
    finally { setAiNameChecking(false); }
  }

  async function handleGenerateDesc() {
    if (!aiDescBrief.trim()) return;
    setAiDescGenerating(true);
    setAiDescError("");
    try {
      const name = customName.trim() || product.name;
      const res = await client.post("/seller/products/ai/generate-description", { productName: name, brief: aiDescBrief });
      setCustomDesc(res.data.description);
      setDirty(true);
      setShowAiDesc(false);
      setAiDescBrief("");
    } catch (err) {
      setAiDescError(err.response?.data?.message || "Error al generar la descripción.");
    } finally {
      setAiDescGenerating(false);
    }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const MAX_MB = 10;
    const oversized = files.find(f => f.size > MAX_MB * 1024 * 1024);
    if (oversized) {
      const mb = (oversized.size / (1024 * 1024)).toFixed(1);
      setError(`La imagen "${oversized.name}" pesa ${mb} MB y supera el tamaño máximo permitido (${MAX_MB} MB). Comprimila o usá una imagen más liviana.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true); setError(""); setAiImgError("");
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        if (pageId) formData.append("pageId", pageId);
        const res = await client.post(`/seller/images/${productId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // Verificar antes de agregar al estado
        try {
          const verify = await client.post(`/seller/products/${productId}/ai/verify-image`, { imageUrl: res.data.url });
          if (!verify.data.valid) {
            // Eliminar la imagen de S3 y no agregarla al estado
            client.delete(`/seller/images/${productId}`, { data: { key: res.data.key } }).catch(() => {});
            setAiImgError(verify.data.reason || "La imagen no corresponde al producto original. No fue guardada.");
          } else {
            setSellerImages(prev => [...prev, { key: res.data.key, url: res.data.url }]);
          }
        } catch {
          // Si la verificación falla por error de red, dejamos pasar la imagen
          setSellerImages(prev => [...prev, { key: res.data.key, url: res.data.url }]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error al subir imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(key) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    try {
      await client.delete(`/seller/images/${productId}`, { data: { key } });
      setSellerImages(prev => prev.filter(img => img.key !== key));
    } catch (err) {
      setError(err.response?.data?.message || "Error al eliminar");
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );
  if (!product) return <div className="empty-state">Producto no encontrado.</div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn--ghost btn--sm" onClick={() => pageId ? navigate(`/pages/${pageId}/products`, { state: { returnToMine: true } }) : navigate(-1)} style={{ padding: "6px 8px" }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ marginBottom: 2 }}>{customName || product.name}</h1>
            <p>Editor de producto</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {saveMsg && (
            <span style={{ fontSize: ".82rem", fontWeight: 500, color: saveMsg === "Guardado" ? "#16a34a" : "#dc2626" }}>
              {saveMsg}
            </span>
          )}
          <button className="btn btn--primary btn--sm" onClick={handleSaveCustom} disabled={saving || !dirty}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Personalización de título y descripción */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 2 }}>Personalizar nombre y descripción</h2>
          <p style={{ fontSize: ".85rem" }}>Se muestra en tu tienda en lugar del original.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 4, color: "var(--color-text-secondary)" }}>Nombre</label>
            <div style={{ position: "relative" }}>
              <input
                className={`form-input${aiNameError ? " form-input--error" : ""}`}
                value={customName}
                onChange={e => { setCustomName(e.target.value); setDirty(true); setAiNameError(""); }}
                onFocus={() => { nameBeforeEditRef.current = customName; }}
                onBlur={handleNameBlur}
                placeholder={product.name}
                style={aiNameError ? { borderColor: "#dc2626" } : {}}
              />
              {aiNameChecking && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "#9ca3af" }} />
                </span>
              )}
            </div>
            {aiNameError && (
              <p style={{ marginTop: 6, fontSize: ".8rem", color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                <span>⚠</span> {aiNameError}
              </p>
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: ".85rem", color: "var(--color-text-secondary)" }}>
                Descripción <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(soporta texto enriquecido, imágenes y GIFs)</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowAiDesc(true); setAiDescError(""); setAiDescBrief(""); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)",
                  color: "#fff", fontSize: ".78rem", fontWeight: 600, letterSpacing: ".02em",
                  boxShadow: "0 2px 12px rgba(99,102,241,.35)",
                  transition: "opacity .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <Sparkles size={13} />
                Generar con IA
              </button>
            </div>
            <RichEditor value={customDesc} onChange={v => { setCustomDesc(v); setDirty(true); }} productId={productId} />
          </div>
        </div>
      </div>

      {/* Mis fotos */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div>
            <h2 style={{ marginBottom: 2 }}>Mis fotos personalizadas</h2>
            <p style={{ fontSize: ".85rem" }}>Reemplazan las originales solo en tu tienda.</p>
          </div>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={13} />
            {uploading ? "Subiendo..." : "Subir fotos"}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleUpload} />
        {aiImgError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 12 }}>
            <span style={{ fontSize: ".85rem", color: "#dc2626", flex: 1 }}>⚠ {aiImgError}</span>
            <button type="button" onClick={() => setAiImgError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {sellerImages.length === 0 ? (
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <Image className="upload-zone__icon" />
            <div className="upload-zone__title">Hacé clic para subir fotos</div>
            <div className="upload-zone__sub">JPG, PNG, WEBP · máx. 10MB por imagen</div>
          </div>
        ) : (
          <div className="image-grid">
            {sellerImages.map((img, idx) => (
              <div key={img.key} className="image-thumb">
                <img src={img.url || img.key} alt={`Foto ${idx + 1}`} />
                {idx === 0 && (
                  <div className="image-thumb__primary">
                    <span className="badge badge--brand">Principal</span>
                  </div>
                )}
                <button className="image-thumb__delete" onClick={() => handleDelete(img.key)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fotos originales */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 2 }}>Fotos originales del sistema</h2>
          <p style={{ fontSize: ".85rem" }}>Se muestran cuando no tenés fotos propias.</p>
        </div>
        {systemImages.length === 0 ? (
          <div className="empty-state">Este producto no tiene fotos en el sistema.</div>
        ) : (
          <div className="image-grid">
            {systemImages.map((key, idx) => (
              <div key={key} className="image-thumb image-thumb--dim">
                <img src={key} alt={`Original ${idx + 1}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Colores disponibles */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: colorsEnabled ? 20 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Palette size={15} color="#6366f1" />
            </div>
            <div>
              <h2 style={{ marginBottom: 1 }}>Colores disponibles</h2>
              <p style={{ fontSize: ".82rem" }}>El comprador podrá elegir el color antes de agregar al carrito.</p>
            </div>
          </div>
          {/* Toggle switch */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <span style={{ fontSize: ".85rem", color: "var(--color-text-secondary)" }}>
              {colorsEnabled ? "Activo" : "Inactivo"}
            </span>
            <div
              onClick={() => { setColorsEnabled(v => !v); setDirty(true); }}
              style={{
                width: 40, height: 22, borderRadius: 11, position: "relative", cursor: "pointer",
                background: colorsEnabled ? "var(--brand, #4db81a)" : "#d1d5db",
                transition: "background .2s",
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: colorsEnabled ? 21 : 3,
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .2s",
              }} />
            </div>
          </label>
        </div>

        {colorsEnabled && (
          <div>
            {colors.length === 0 && (
              <p style={{ fontSize: ".85rem", color: "var(--color-text-secondary)", marginBottom: 12 }}>
                No hay colores agregados. Usá el botón de abajo para agregar.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {colors.map((color, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={color.hex || "#000000"}
                    onChange={e => {
                      const next = [...colors];
                      next[idx] = { ...next[idx], hex: e.target.value };
                      setColors(next); setDirty(true);
                    }}
                    style={{ width: 40, height: 36, padding: 2, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", background: "none" }}
                  />
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: color.hex || "#000", border: "2px solid #e5e7eb", flexShrink: 0 }} />
                  <input
                    className="form-input"
                    value={color.name}
                    onChange={e => {
                      const next = [...colors];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setColors(next); setDirty(true);
                    }}
                    placeholder="Nombre del color (ej: Rojo, Azul marino...)"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => { setColors(colors.filter((_, i) => i !== idx)); setDirty(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
                    title="Eliminar color"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setColors([...colors, { hex: "#000000", name: "" }]); setDirty(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={13} /> Agregar color
            </button>
          </div>
        )}
      </div>

      {/* Guardar cambios — al final de la página */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 style={{ marginBottom: 1 }}>Guardar cambios</h2>
          <p style={{ fontSize: ".82rem" }}>Nombre y descripción personalizados para tu tienda.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {saveMsg && (
            <span style={{ fontSize: ".82rem", fontWeight: 500, color: saveMsg === "Guardado" ? "#16a34a" : "#dc2626" }}>
              {saveMsg}
            </span>
          )}
          <button className="btn btn--primary" onClick={handleSaveCustom} disabled={saving || !dirty}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Modal: Generar descripción con IA — renderizado en document.body con portal */}
      {showAiDesc && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowAiDesc(false); }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div style={{
            width: "100%", maxWidth: 480,
            borderRadius: "var(--radius-xl, 20px)",
            background: "#fff",
            border: "1px solid var(--border, #e5e7eb)",
            boxShadow: "0 20px 60px rgba(0,0,0,.15)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "18px 20px 14px",
              background: "var(--brand-light, #edfbe5)",
              borderBottom: "1px solid var(--border, #e5e7eb)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "var(--brand, #4db81a)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(77,184,26,.35)",
                  }}>
                    <Sparkles size={14} color="#fff" />
                  </div>
                  <span style={{ fontSize: ".95rem", fontWeight: 700, color: "var(--brand-text, #1a5e08)" }}>Generar descripción con IA</span>
                </div>
                <p style={{ fontSize: ".8rem", color: "var(--brand-text, #1a5e08)", opacity: .7, margin: 0, paddingLeft: 36 }}>
                  Escribí un resumen y la IA genera la descripción completa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiDesc(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, #6b7280)", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 20px 20px" }}>
              <p style={{ fontSize: ".82rem", color: "var(--text-secondary, #6b7280)", marginBottom: 8 }}>
                Producto: <strong style={{ color: "var(--text-primary, #111)" }}>{customName || product.name}</strong>
              </p>
              <textarea
                value={aiDescBrief}
                onChange={e => setAiDescBrief(e.target.value)}
                placeholder="Ej: Silla ergonómica con soporte lumbar, altura ajustable y ruedas. Ideal para oficina."
                rows={4}
                disabled={aiDescGenerating}
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: "var(--radius-md, 10px)",
                  background: "#f9fafb", border: "1.5px solid var(--border, #e5e7eb)",
                  color: "var(--text-primary, #111)", fontSize: ".88rem", lineHeight: 1.55,
                  resize: "vertical", outline: "none", fontFamily: "inherit", transition: "border-color .15s",
                }}
                onFocus={e => e.target.style.borderColor = "var(--brand, #4db81a)"}
                onBlur={e => e.target.style.borderColor = "var(--border, #e5e7eb)"}
              />

              {aiDescError && (
                <p style={{ marginTop: 8, fontSize: ".8rem", color: "#dc2626" }}>⚠ {aiDescError}</p>
              )}

              <button
                type="button"
                onClick={handleGenerateDesc}
                disabled={aiDescGenerating || !aiDescBrief.trim()}
                className="btn btn--primary"
                style={{
                  marginTop: 14, width: "100%", padding: "11px 0",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontSize: ".9rem", opacity: aiDescGenerating || !aiDescBrief.trim() ? .5 : 1,
                }}
              >
                {aiDescGenerating
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generando...</>
                  : <><Sparkles size={15} /> Generar descripción</>
                }
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
