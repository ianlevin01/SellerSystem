import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import client from "../../api/client";

// Selector + reordenador de fotos para una publicación de Mercado Libre — extraído del paso
// "Fotos" del wizard de publicar un producto (antes vivía inline ahí) para poder usarlo también
// en la vista de variantes, donde hace falta una instancia por cada variante en vez de una sola.
//
// Controlado por el padre: recibe `imageOrder`/`newPictures` y sus setters, en vez de manejar
// su propio estado — así el padre siempre puede leer el resultado final (para armar
// `orderedImages` al mandar el publish) sin tener que levantarlo por un callback aparte.
//
// existingImages: [{ id, key, url }] — el pool completo de fotos que ya tiene el producto.
// imageOrder/setImageOrder: [{ type: "existing", key } | { type: "new", previewUrl }]
// newPictures/setNewPictures: [{ previewUrl, ref, uploading, failed? }]
// onGenerateAi: opcional — si se pasa, muestra el botón "Generar con IA" (la llamada en sí
// depende del contexto del producto, así que la arma el que use este componente).
export default function ImageOrderPicker({
  existingImages, imageOrder, setImageOrder, newPictures, setNewPictures,
  onGenerateAi, generatingAi,
}) {
  const [dragImgIndex, setDragImgIndex] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");

  function toggleImage(key) {
    setImageOrder(prev => {
      const isIncluded = prev.some(item => item.type === "existing" && item.key === key);
      if (isIncluded) return prev.filter(item => !(item.type === "existing" && item.key === key));
      return [...prev, { type: "existing", key }];
    });
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      const entry = { previewUrl, ref: null, uploading: true };
      setNewPictures(prev => [...prev, entry]);
      setImageOrder(prev => [...prev, { type: "new", previewUrl }]);
      try {
        const form = new FormData();
        form.append("image", file);
        const res = await client.post("/seller/ml/pictures/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setNewPictures(prev => prev.map(p => p.previewUrl === previewUrl ? { ...p, ref: res.data.ref, uploading: false } : p));
      } catch {
        setNewPictures(prev => prev.map(p => p.previewUrl === previewUrl ? { ...p, uploading: false, failed: true } : p));
      }
    }
  }

  function removeNewPicture(previewUrl) {
    setNewPictures(prev => prev.filter(p => p.previewUrl !== previewUrl));
    setImageOrder(prev => prev.filter(item => !(item.type === "new" && item.previewUrl === previewUrl)));
  }

  function moveImage(fromIndex, toIndex) {
    setImageOrder(prev => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return (
    <div>
      {imageOrder.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}
          onDragOver={e => e.preventDefault()}
          onDrop={() => {
            // Soltar en el espacio vacío del contenedor (después de la última imagen) la manda
            // al final — sin esto, no había forma de soltar pasado el último ítem.
            if (dragImgIndex !== null) moveImage(dragImgIndex, imageOrder.length - 1);
            setDragImgIndex(null);
          }}
        >
          {imageOrder.map((item, index) => {
            const isExisting = item.type === "existing";
            const src = isExisting
              ? existingImages.find(i => i.key === item.key)?.url
              : newPictures.find(p => p.previewUrl === item.previewUrl)?.previewUrl;
            const newPic = isExisting ? null : newPictures.find(p => p.previewUrl === item.previewUrl);
            if (!src) return null;
            return (
              <div key={isExisting ? `e:${item.key}` : `n:${item.previewUrl}`}
                draggable
                onDragStart={() => setDragImgIndex(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.stopPropagation(); // si no, el drop también burbujea al contenedor y mueve dos veces
                  if (dragImgIndex !== null && dragImgIndex !== index) moveImage(dragImgIndex, index);
                  setDragImgIndex(null);
                }}
                onDragEnd={() => setDragImgIndex(null)}
                style={{
                  position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden",
                  border: index === 0 ? "2px solid var(--brand,#4db81a)" : "2px solid var(--border)",
                  cursor: "grab", opacity: dragImgIndex === index ? .45 : 1,
                }}>
                <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                {index === 0 && (
                  <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.65)", color: "#fff", fontSize: ".58rem", fontWeight: 700, textAlign: "center", padding: "2px 0" }}>
                    PORTADA
                  </span>
                )}
                {newPic?.uploading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 size={16} className="spin" />
                  </div>
                )}
                {newPic?.failed && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,.15)" }} title="No se pudo subir" />
                )}
                <button type="button"
                  onClick={() => isExisting ? toggleImage(item.key) : removeNewPicture(item.previewUrl)}
                  style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 99, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={10} color="#fff" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ margin: "0 0 10px", fontSize: ".76rem", color: "var(--text-secondary)" }}>
        Arrastrá las imágenes para cambiar el orden — la primera es la portada en Mercado Libre.
      </p>

      {existingImages.some(img => !imageOrder.some(item => item.type === "existing" && item.key === img.key)) && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: ".74rem", color: "var(--text-secondary)" }}>
            Imágenes del catálogo sin incluir — clickeá para sumarlas:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {existingImages.filter(img => !imageOrder.some(item => item.type === "existing" && item.key === img.key)).map(img => (
              <button key={img.id || img.key} type="button" onClick={() => toggleImage(img.key)}
                style={{
                  position: "relative", width: 72, height: 72, padding: 0, borderRadius: 8, overflow: "hidden",
                  border: "2px dashed var(--border)", opacity: .45, cursor: "pointer", background: "none",
                }}>
                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label className="btn btn--ghost btn--sm" style={{ display: "inline-flex", cursor: "pointer" }}>
          <Plus size={13} /> Subir imagen nueva
          <input type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: "none" }} />
        </label>
      </div>

      {onGenerateAi && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2,#f9fafb)" }}>
          <label style={{ fontSize: ".76rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
            ✨ Generar foto con IA
          </label>
          <textarea
            className="form-input"
            rows={2}
            placeholder='Qué querés que muestre la foto — ej. "sobre una mesada de cocina" o "primer plano de la pantalla". Si lo dejás vacío, se genera con fondo blanco de estudio.'
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            disabled={generatingAi}
            style={{ resize: "vertical", fontSize: ".82rem", marginBottom: 8 }}
          />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGenerateAi(aiPrompt.trim())} disabled={generatingAi}>
            {generatingAi ? <><Loader2 size={13} className="spin" /> Generando...</> : "Generar imagen"}
          </button>
        </div>
      )}
    </div>
  );
}
