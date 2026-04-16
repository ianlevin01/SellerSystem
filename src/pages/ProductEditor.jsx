// src/pages/ProductEditor.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { Trash2, Upload, ArrowLeft, Image } from "lucide-react";

export default function ProductEditor() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [product, setProduct]           = useState(null);
  const [sellerImages, setSellerImages] = useState([]);
  const [systemImages, setSystemImages] = useState([]);
  const [uploading, setUploading]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [customName, setCustomName]     = useState("");
  const [customDesc, setCustomDesc]     = useState("");
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState("");

  useEffect(() => {
    Promise.all([
      client.get("/seller/products", { params: { only_mine: "true", limit: 200 } }),
      client.get(`/seller/images/${productId}`),
    ]).then(([productsRes, imagesRes]) => {
      const found = productsRes.data.products.find(p => p.id === productId);
      setProduct(found);
      setSystemImages(found?.system_images || []);
      setSellerImages(imagesRes.data);
      setCustomName(found?.custom_name || "");
      setCustomDesc(found?.custom_desc || "");
    }).finally(() => setLoading(false));
  }, [productId]);

  async function handleSaveCustom() {
    setSaving(true); setSaveMsg("");
    try {
      await client.patch(`/seller/products/${productId}/customize`, {
        custom_name: customName.trim() || null,
        custom_desc: customDesc.trim() || null,
      });
      setSaveMsg("Guardado");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Error al guardar");
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
        const formData = new FormData();
        formData.append("image", file);
        const res = await client.post(`/seller/images/${productId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSellerImages(prev => [...prev, { key: res.data.key, url: res.data.url }]);
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
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate("/products")} style={{ padding: "6px 8px" }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ marginBottom: 2 }}>{customName || product.name}</h1>
          <p>Editor de producto</p>
        </div>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Personalización de título y descripción */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 2 }}>Personalizar nombre y descripción</h2>
          <p style={{ fontSize: ".85rem" }}>Se muestra en tu tienda en lugar del original. Dejá el campo vacío para usar el original.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 4, color: "var(--color-text-secondary)" }}>Nombre</label>
            <input
              className="form-input"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={product.name}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".85rem", marginBottom: 4, color: "var(--color-text-secondary)" }}>Descripción</label>
            <textarea
              className="form-input"
              rows={3}
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
              placeholder={product.description || "Sin descripción original"}
              style={{ resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn--primary btn--sm" onClick={handleSaveCustom} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {saveMsg && <span style={{ fontSize: ".85rem", color: saveMsg === "Guardado" ? "var(--color-success)" : "var(--color-error)" }}>{saveMsg}</span>}
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

        {sellerImages.length === 0 ? (
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <Image className="upload-zone__icon" />
            <div className="upload-zone__title">Hacé clic para subir fotos</div>
            <div className="upload-zone__sub">JPG, PNG, WEBP · máx. 8MB por imagen</div>
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
      <div className="card">
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
    </div>
  );
}
