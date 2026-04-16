// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { CheckCircle, Phone } from "lucide-react";

const HOW_FOUND_OPTIONS = [
  { value: "", label: "Seleccioná una opción" },
  { value: "redes_sociales",  label: "Redes sociales" },
  { value: "conocido",        label: "Un conocido me recomendó" },
  { value: "publicidad",      label: "Publicidad" },
  { value: "busqueda",        label: "Búsqueda en internet" },
  { value: "otro",            label: "Otro" },
];

export default function Profile() {
  const { refreshSeller } = useAuth();

  const [form, setForm] = useState({ name: "", phone: "", city: "", age: "", how_found_us: "" });
  const [phoneVerified, setPhoneVerified]   = useState(false);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [saveMsg, setSaveMsg]               = useState("");

  const [otpMode, setOtpMode]       = useState(false);
  const [otpCode, setOtpCode]       = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg]         = useState("");

  useEffect(() => {
    client.get("/seller/auth/profile").then(res => {
      const d = res.data;
      setForm({
        name:        d.name || "",
        phone:       d.phone || "",
        city:        d.city || "",
        age:         d.age != null ? String(d.age) : "",
        how_found_us: d.how_found_us || "",
      });
      setPhoneVerified(!!d.phone_verified);
    }).finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === "phone") setPhoneVerified(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaveMsg("");
    try {
      await client.put("/seller/auth/profile", {
        ...form,
        age: form.age ? Number(form.age) : null,
      });
      await refreshSeller();
      setSaveMsg("Guardado correctamente");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestOtp() {
    if (!form.phone) { setOtpMsg("Guardá tu teléfono primero"); return; }
    setOtpLoading(true); setOtpMsg("");
    try {
      await client.put("/seller/auth/profile", { phone: form.phone });
      await client.post("/seller/auth/phone/request-otp");
      setOtpMode(true);
      setOtpMsg("Código enviado por SMS");
    } catch (err) {
      setOtpMsg(err.response?.data?.message || "Error al enviar SMS");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode) return;
    setOtpLoading(true); setOtpMsg("");
    try {
      await client.post("/seller/auth/phone/verify-otp", { otp: otpCode });
      setPhoneVerified(true);
      setOtpMode(false);
      setOtpCode("");
      setOtpMsg("Teléfono verificado");
      await refreshSeller();
    } catch (err) {
      setOtpMsg(err.response?.data?.message || "Código incorrecto");
    } finally {
      setOtpLoading(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Mi perfil</h1>
        <p>Completá tu información para usar el portal.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16 }}>Datos personales</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="form-label">Nombre completo *</label>
              <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label className="form-label">Ciudad *</label>
              <input className="form-input" name="city" value={form.city} onChange={handleChange} required placeholder="Ej: Buenos Aires" />
            </div>
            <div>
              <label className="form-label">Edad *</label>
              <input className="form-input" type="number" name="age" value={form.age} onChange={handleChange} required min={16} max={99} placeholder="Ej: 28" />
            </div>
            <div>
              <label className="form-label">¿Cómo nos conociste? *</label>
              <select className="form-input" name="how_found_us" value={form.how_found_us} onChange={handleChange} required>
                {HOW_FOUND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 8 }}>Teléfono</h2>
          <p style={{ fontSize: ".85rem", color: "var(--color-text-secondary)", marginBottom: 16 }}>
            Ingresá tu número con código de país (ej: +54 9 11 1234-5678). Necesitás verificarlo.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                className="form-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+54 9 11 1234-5678"
                required
              />
            </div>
            {phoneVerified ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-success, #16a34a)", paddingTop: 8 }}>
                <CheckCircle size={16} />
                <span style={{ fontSize: ".9rem" }}>Verificado</span>
              </div>
            ) : (
              <button type="button" className="btn btn--secondary btn--sm" onClick={handleRequestOtp} disabled={otpLoading} style={{ paddingTop: 10, paddingBottom: 10 }}>
                <Phone size={13} />
                {otpLoading ? "Enviando..." : "Verificar por SMS"}
              </button>
            )}
          </div>

          {otpMode && !phoneVerified && (
            <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="form-input"
                style={{ maxWidth: 160 }}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                maxLength={6}
              />
              <button type="button" className="btn btn--primary btn--sm" onClick={handleVerifyOtp} disabled={otpLoading || !otpCode}>
                {otpLoading ? "Verificando..." : "Confirmar código"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleRequestOtp} disabled={otpLoading}>
                Reenviar
              </button>
            </div>
          )}

          {otpMsg && (
            <p style={{ marginTop: 10, fontSize: ".85rem", color: otpMsg.includes("nviado") || otpMsg.includes("verificado") ? "var(--color-success, #16a34a)" : "var(--color-error, #dc2626)" }}>
              {otpMsg}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
          {saveMsg && (
            <span style={{ fontSize: ".9rem", color: saveMsg.includes("Error") ? "var(--color-error, #dc2626)" : "var(--color-success, #16a34a)" }}>
              {saveMsg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
