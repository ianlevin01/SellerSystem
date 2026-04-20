// src/pages/StoreConfig.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";

export default function StoreConfig() {
  const { seller, refreshSeller } = useAuth();
  const [form, setForm] = useState({
    store_name: "", store_description: "", banner_color: "#5b52f0", pct_markup: 0,
    tagline: "", whatsapp: "", instagram: "", facebook: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    client.get("/seller/store/config").then(res => {
      const d = res.data;
      setForm({
        store_name:        d.store_name        || "",
        store_description: d.store_description || "",
        banner_color:      d.banner_color      || "#5b52f0",
        pct_markup:        d.pct_markup        || 0,
        tagline:           d.tagline           || "",
        whatsapp:          d.whatsapp          || "",
        instagram:         d.instagram         || "",
        facebook:          d.facebook          || "",
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSaving(true); setSaved(false);
    try {
      await client.put("/seller/store/config", { ...form, pct_markup: Number(form.pct_markup) });
      await refreshSeller();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const ejemploPrecio1 = 10000;
  const precioFinal = (ejemploPrecio1 * (1 + Number(form.pct_markup) / 100));

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Mi tienda</h1>
        <p>Personalizá cómo se ve tu tienda y configurá tus precios.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="config-grid">
          {/* Columna izquierda */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Info básica */}
            <div className="card">
              <h2 style={{ marginBottom: 18 }}>Información de la tienda</h2>

              <div className="form-group">
                <label className="form-label">Nombre de la tienda</label>
                <input className="form-input" value={form.store_name}
                  onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))}
                  placeholder="Mi tienda" />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" value={form.store_description}
                  onChange={e => setForm(p => ({ ...p, store_description: e.target.value }))}
                  placeholder="Breve descripción que aparece en tu tienda..." />
              </div>

              <div className="form-group">
                <label className="form-label">Tagline <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(subtítulo corto)</span></label>
                <input className="form-input" value={form.tagline}
                  onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="La mejor selección al mejor precio" maxLength={160} />
              </div>

              <div className="form-group">
                <label className="form-label">Color principal</label>
                <div className="color-picker-row">
                  <input type="color" value={form.banner_color}
                    onChange={e => setForm(p => ({ ...p, banner_color: e.target.value }))} />
                  <span className="color-picker-hex">{form.banner_color}</span>
                </div>
              </div>
            </div>

            {/* Contacto y redes */}
            <div className="card">
              <h2 style={{ marginBottom: 18 }}>Contacto y redes sociales</h2>
              <p style={{ fontSize: ".875rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                Estos datos aparecen en el footer de tu tienda y habilitan el botón de WhatsApp.
              </p>

              <div className="form-group">
                <label className="form-label">WhatsApp <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(sólo números, con código de país)</span></label>
                <input className="form-input" value={form.whatsapp}
                  onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                  placeholder="5491112345678" maxLength={30} />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(usuario sin @)</span></label>
                <input className="form-input" value={form.instagram}
                  onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                  placeholder="mitienda" maxLength={60} />
              </div>

              <div className="form-group">
                <label className="form-label">Facebook <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(URL de la página)</span></label>
                <input className="form-input" value={form.facebook}
                  onChange={e => setForm(p => ({ ...p, facebook: e.target.value }))}
                  placeholder="https://facebook.com/mitienda" maxLength={120} />
              </div>
            </div>

            {/* Precios */}
            <div className="card">
              <h2 style={{ marginBottom: 6 }}>Configuración de precios</h2>
              <p style={{ fontSize: ".875rem", marginBottom: 18 }}>
                El precio base (precio_1) ya incluye los márgenes del sistema.
                Tu porcentaje se suma por encima de ese precio.
              </p>

              <div className="form-group">
                <label className="form-label">
                  % de aumento sobre precio_1
                  <span style={{ float: "right", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {form.pct_markup}%
                  </span>
                </label>
                <input type="range" min={0} max={200} step={0.5}
                  value={form.pct_markup}
                  onChange={e => setForm(p => ({ ...p, pct_markup: e.target.value }))}
                  style={{ marginBottom: 8 }}
                />
              </div>

              <div className="card" style={{ background: "var(--bg)", boxShadow: "none", padding: "14px 16px" }}>
                <div style={{ fontSize: ".825rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                  Ejemplo con precio base = $10.000
                </div>
                <div className="calc-breakdown">
                  <div className="calc-breakdown__row">
                    <span className="calc-breakdown__label">Precio base</span>
                    <span className="calc-breakdown__value">${fmt(ejemploPrecio1)}</span>
                  </div>
                  <div className="calc-breakdown__row">
                    <span className="calc-breakdown__label">Tu precio de venta</span>
                    <span className="calc-breakdown__value" style={{ color: "var(--brand)" }}>${fmt(precioFinal)}</span>
                  </div>
                  {Number(form.pct_markup) > 0 && (
                    <div className="calc-breakdown__row">
                      <span className="calc-breakdown__label">Diferencia</span>
                      <span className="calc-breakdown__value" style={{ color: "var(--success)" }}>
                        +${fmt(precioFinal - ejemploPrecio1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="markup-note" style={{ marginTop: 14 }}>
                <strong>Tu ganancia</strong> es un porcentaje de la diferencia
                (precio venta − precio_1) que crece con el monto del pedido:
                40% · 45% · 50% · 60%
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="preview-card">
              <div className="preview-card__banner" style={{ background: form.banner_color }}>
                <h2 style={{ color: "#fff", marginBottom: 4, fontSize: "1.125rem" }}>
                  {form.store_name || "Mi tienda"}
                </h2>
                <p style={{ color: "rgba(255,255,255,.8)", fontSize: ".875rem", margin: 0 }}>
                  {form.store_description || "Descripción de tu tienda"}
                </p>
              </div>
              <div className="preview-card__body">
                <div style={{ fontSize: ".75rem", color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>
                  Vista previa
                </div>
                <div className="preview-product">
                  <div className="preview-product__img">📦</div>
                  <div className="preview-product__info">
                    <div className="preview-product__name">Nombre del producto</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: form.banner_color, letterSpacing: "-.02em" }}>
                      ${fmt(precioFinal)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: ".78rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  /store/{seller?.slug}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
          {error  && <span style={{ fontSize: ".875rem", color: "var(--danger)" }}>{error}</span>}
          {saved  && <span style={{ fontSize: ".875rem", color: "var(--success)", fontWeight: 500 }}>✓ Guardado</span>}
          <button type="submit" disabled={saving} className="btn btn--primary btn--lg">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
