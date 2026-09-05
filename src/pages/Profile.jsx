// src/pages/Profile.jsx
// Perfil premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useMemo, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { trackEvent } from "../utils/pixel";
import "../styles/Profile.css";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  Upload,
  User,
  BadgeCheck,
  Clock,
  ArrowRight,
} from "lucide-react";

function isSuccessMessage(message) {
  return (
    message.includes("Guardado") ||
    message.includes("enviado") ||
    message.includes("verificado") ||
    message.includes("Verificado")
  );
}

function splitName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first_name: parts[0] || "", last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1).join(""),
  };
}

function calculateAge(birthDate) {
  if (!birthDate) return null;

  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export default function Profile() {
  const { seller, updateSeller, refreshSeller } = useAuth();
  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    birth_date: "",
    avatar_url: "",
  });

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");

  const [saveMsg, setSaveMsg] = useState("");
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");

  // CVU
  const [cvuData, setCvuData]       = useState(null);  // { cvu, cvu_alias, cvu_holder_name, cvu_verified }
  const [cvuForm, setCvuForm]       = useState({ cvu: "", alias: "", holderName: "" });
  const [cvuSaving, setCvuSaving]   = useState(false);
  const [cvuMsg, setCvuMsg]         = useState("");

  useEffect(() => {
    Promise.all([
      client.get("/seller/auth/profile"),
      client.get("/seller/payouts/summary").catch(() => null),
    ]).then(([profileRes, payoutsRes]) => {
      const d = profileRes.data;
      const fallbackName = splitName(d.name || "");

      setForm({
        first_name: d.first_name || d.firstName || fallbackName.first_name || "",
        last_name: d.last_name || d.lastName || fallbackName.last_name || "",
        email: d.email || d.seller_email || d.user_email || "",
        phone: d.phone || "",
        city: d.city || "",
        birth_date: (d.birth_date || d.birthDate || "").toString().slice(0, 10),
        avatar_url: d.avatar_url || "",
      });

      setPhoneVerified(!!d.phone_verified);

      const cvuInfo = payoutsRes?.data?.cvu_info;
      if (cvuInfo) {
        setCvuData(cvuInfo);
        setCvuForm({
          cvu:        cvuInfo.cvu || "",
          alias:      cvuInfo.cvu_alias || "",
          holderName: cvuInfo.cvu_holder_name || "",
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const fullName = `${form.first_name} ${form.last_name}`.trim();
  const age = calculateAge(form.birth_date);

  const progressItems = useMemo(
    () => [
      {
        key: "first_name",
        label: "Nombre",
        done: form.first_name.trim().length >= 2,
      },
      {
        key: "last_name",
        label: "Apellido",
        done: form.last_name.trim().length >= 2,
      },
      {
        key: "email",
        label: "Email",
        done: /\S+@\S+\.\S+/.test(form.email),
      },
      {
        key: "city",
        label: "Ciudad",
        done: form.city.trim().length >= 2,
      },
      {
        key: "birth_date",
        label: "Nacimiento",
        done: !!form.birth_date && calculateAge(form.birth_date) >= 16,
      },
      {
        key: "phone",
        label: "Teléfono",
        done: form.phone.trim().length >= 6, // verificación desactivada temporalmente
      },
    ],
    [form, phoneVerified]
  );

  const completedCount = progressItems.filter((item) => item.done).length;
  const profileReady = completedCount === progressItems.length;

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((f) => ({ ...f, [name]: value }));

    if (name === "phone") {
      setPhoneVerified(false);
      setOtpMode(false);
      setOtpCode("");
      setOtpMsg("");
    }

    if (saveMsg) setSaveMsg("");
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarMsg("");

    try {
      const data = new FormData();
      data.append("image", file);

      const res = await client.post("/seller/auth/avatar", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const nextAvatar = res.data?.avatar_url || "";
      setForm((f) => ({ ...f, avatar_url: nextAvatar }));
      updateSeller?.(res.data || { avatar_url: nextAvatar });
      setAvatarMsg("Foto actualizada");
      setTimeout(() => setAvatarMsg(""), 3000);
    } catch (err) {
      setAvatarMsg(err.response?.data?.message || "No se pudo subir la foto");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      name: fullName,
      city: form.city.trim(),
      phone: form.phone.trim(),
      birth_date: form.birth_date || null,
      age,
    };

    try {
      await client.put("/seller/auth/profile", payload);
      trackEvent("Configuracion_Perfil");
      setSaveMsg("Guardado correctamente");
      setTimeout(() => setSaveMsg(""), 3000);
      updateSeller(payload);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestOtp() {
    if (!form.phone.trim()) {
      setOtpMsg("Ingresá tu teléfono primero");
      return;
    }

    setOtpLoading(true);
    setOtpMsg("");

    try {
      await client.put("/seller/auth/profile", {
        phone: form.phone.trim(),
      });

      await client.post("/seller/auth/phone/request-otp");

      setOtpMode(true);
      setOtpMsg("Código enviado por SMS");
    } catch (err) {
      setOtpMsg(err.response?.data?.message || "Error al enviar SMS");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSaveCvu() {
    setCvuSaving(true);
    setCvuMsg("");
    try {
      const { data } = await client.put("/seller/payouts/cvu", {
        cvu:          cvuForm.cvu,
        alias:        cvuForm.alias,
        holderName:   cvuForm.holderName,
      });
      setCvuData(prev => ({ ...(prev || {}), cvu: cvuForm.cvu, cvu_alias: cvuForm.alias, cvu_holder_name: cvuForm.holderName, cvu_verified: data.verified }));
      setCvuMsg(data.verified ? "success" : "info");
    } catch (err) {
      setCvuMsg("error");
    } finally {
      setCvuSaving(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) return;

    setOtpLoading(true);
    setOtpMsg("");

    try {
      await client.post("/seller/auth/phone/verify-otp", {
        otp: otpCode.trim(),
      });

      setPhoneVerified(true);
      setOtpMode(false);
      setOtpCode("");
      setOtpMsg("Teléfono verificado");
      refreshSeller?.().catch(() => {});
    } catch (err) {
      setOtpMsg(err.response?.data?.message || "Código incorrecto");
    } finally {
      setOtpLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="vtz-profile">
        <section className="vtz-profile-hero">
          <div className="vtz-profile-skeleton vtz-profile-skeleton--title" />
          <div className="vtz-profile-skeleton vtz-profile-skeleton--text" />
        </section>

        <section className="vtz-profile-grid">
          <div className="vtz-profile-skeleton vtz-profile-skeleton--card" />
          <div className="vtz-profile-skeleton vtz-profile-skeleton--card" />
        </section>
      </main>
    );
  }

  return (
    <main className="vtz-profile">
      <section className="vtz-profile-hero">
        <div>
          <span className="vtz-profile-kicker">Mi perfil</span>

          <h1>Completá tus datos</h1>
        </div>

        <div className={`vtz-profile-status ${profileReady ? "is-ready" : ""}`}>
          {profileReady ? <CheckCircle2 size={22} /> : <CircleAlert size={22} />}
          <div>
            <strong>{profileReady ? "Perfil completo" : "Perfil pendiente"}</strong>
            <span>
              {completedCount} de {progressItems.length} pasos listos
            </span>
          </div>
        </div>
      </section>

      <section className="vtz-profile-progress" aria-label="Progreso del perfil">
        {progressItems.map((item) => (
          <div key={item.key} className={item.done ? "is-done" : ""}>
            <span />
            <strong>{item.label}</strong>
          </div>
        ))}
      </section>

      <form className="vtz-profile-grid" onSubmit={handleSave}>
        <section className="vtz-profile-card vtz-profile-card--main">
          <div className="vtz-profile-card__head">
            <div>
              <span>Datos</span>
              <h2>Información personal</h2>
            </div>
          </div>

          <div className="vtz-profile-fields">
            <label className="vtz-profile-field">
              <span>
                <User size={17} />
                Nombre/s
              </span>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                placeholder="Ej: Martín"
              />
            </label>

            <label className="vtz-profile-field">
              <span>
                <User size={17} />
                Apellido/s
              </span>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                placeholder="Ej: González"
              />
            </label>

            <label className="vtz-profile-field">
              <span>
                <Mail size={17} />
                Email de la cuenta
              </span>
              <input
                name="email"
                value={form.email}
                readOnly
                disabled
                placeholder="tu@email.com"
              />
              <small>Se usa para ingresar y recibir avisos importantes.</small>
            </label>

            <label className="vtz-profile-field">
              <span>
                <MapPin size={17} />
                Ciudad
              </span>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                placeholder="Ej: Buenos Aires"
              />
            </label>

            <label className="vtz-profile-field">
              <span>Fecha de nacimiento</span>
              <input
                type="date"
                name="birth_date"
                value={form.birth_date}
                onChange={handleChange}
                required
              />
              {form.birth_date && age !== null && age < 16 && (
                <small>Tenés que tener al menos 16 años.</small>
              )}
            </label>
          </div>
        </section>

        <aside className="vtz-profile-side">
          <section className="vtz-profile-card vtz-profile-card--avatar">
            <div className="vtz-profile-avatar-box">
              <div className="vtz-profile-avatar-preview">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt={fullName || "Foto de perfil"} />
                ) : (
                  <User size={36} />
                )}
              </div>

              <div>
                <span className="vtz-profile-avatar-kicker">Mi foto</span>
                <h2>Imagen de usuario</h2>
                <p>Esta foto se muestra en tu panel, en el menú y en tu usuario.</p>
              </div>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleAvatarUpload}
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="vtz-profile-btn vtz-profile-btn--secondary"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
            >
              {avatarUploading ? <Loader2 className="vtz-profile-spin" size={18} /> : <Camera size={18} />}
              {avatarUploading ? "Subiendo..." : form.avatar_url ? "Cambiar foto" : "Subir foto"}
            </button>

            {avatarMsg && (
              <p className={`vtz-profile-message ${isSuccessMessage(avatarMsg) ? "is-success" : "is-error"}`}>
                {avatarMsg}
              </p>
            )}
          </section>

          <section className="vtz-profile-card">
            <div className="vtz-profile-card__head">
              <div>
                <span>Teléfono</span>
                <h2>Verificación</h2>
              </div>
            </div>

            <label className="vtz-profile-field">
              <span>Teléfono / WhatsApp</span>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+54 9 11 1234-5678"
                required
              />
            </label>

            {/* Verificación de teléfono desactivada temporalmente — código preservado para uso futuro
            {phoneVerified ? (
              <div className="vtz-profile-ok">
                <CheckCircle2 size={18} />
                <span>Teléfono verificado</span>
              </div>
            ) : (
              <button type="button" className="vtz-profile-btn vtz-profile-btn--secondary" onClick={handleRequestOtp} disabled={otpLoading}>
                {otpLoading ? <Loader2 className="vtz-profile-spin" size={18} /> : null}
                {otpLoading ? "Enviando..." : "Enviar código por SMS"}
              </button>
            )}
            {otpMode && !phoneVerified && (
              <div className="vtz-profile-otp">
                <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Código de 6 dígitos" maxLength={6} />
                <div>
                  <button type="button" className="vtz-profile-btn vtz-profile-btn--primary" onClick={handleVerifyOtp} disabled={otpLoading || !otpCode}>
                    {otpLoading ? "Verificando..." : "Confirmar"}
                  </button>
                  <button type="button" className="vtz-profile-btn vtz-profile-btn--ghost" onClick={handleRequestOtp} disabled={otpLoading}>Reenviar</button>
                </div>
              </div>
            )}
            {otpMsg && <p className={`vtz-profile-message ${isSuccessMessage(otpMsg) ? "is-success" : "is-error"}`}>{otpMsg}</p>}
            */}
          </section>

          {/* ── CVU / CBU ── */}
          {/* Los vendedores 100% Mercado Libre cobran directo por MP de ML, no por el circuito
              de payouts con CVU de Ventaz (ese es solo para ventas de tienda propia) — pedirles
              un CVU que nunca van a usar es confuso. */}
          {seller?.onboarding_track !== "mercadolibre" && (
          <section className="vtz-profile-card">
            <div className="vtz-profile-card__head">
              <div>
                <span>Cuenta bancaria</span>
                <h2>CVU / CBU</h2>
              </div>
              {cvuData?.cvu_verified && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light, #f0fdf4)", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: 99 }}>
                  <BadgeCheck size={13} /> Verificado
                </span>
              )}
            </div>

            {cvuData?.cvu_verified ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#374151" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#9ca3af", minWidth: 70 }}>CVU</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{cvuData.cvu?.slice(0,4)} •••• •••• •••• {cvuData.cvu?.slice(-4)}</span>
                </div>
                {cvuData.cvu_alias && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#9ca3af", minWidth: 70 }}>Alias</span>
                    <span style={{ fontWeight: 600 }}>{cvuData.cvu_alias}</span>
                  </div>
                )}
                {cvuData.cvu_holder_name && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#9ca3af", minWidth: 70 }}>Titular</span>
                    <span style={{ fontWeight: 600 }}>{cvuData.cvu_holder_name}</span>
                  </div>
                )}
              </div>
            ) : cvuData?.cvu && !cvuData?.cvu_verified ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400e", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px" }}>
                  <Clock size={14} style={{ flexShrink: 0 }} />
                  <span>CVU <strong>pendiente de verificación</strong>. Lo revisamos en las próximas horas.</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#374151" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#9ca3af", minWidth: 70 }}>CVU</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{cvuData.cvu?.slice(0,4)} •••• •••• •••• {cvuData.cvu?.slice(-4)}</span>
                  </div>
                  {cvuData.cvu_alias && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "#9ca3af", minWidth: 70 }}>Alias</span>
                      <span style={{ fontWeight: 600 }}>{cvuData.cvu_alias}</span>
                    </div>
                  )}
                  {cvuData.cvu_holder_name && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "#9ca3af", minWidth: 70 }}>Titular</span>
                      <span style={{ fontWeight: 600 }}>{cvuData.cvu_holder_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label className="vtz-profile-field">
                  <span>CVU / CBU <small style={{ fontWeight: 400, color: "#9ca3af" }}>(22 dígitos)</small></span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={22}
                    placeholder="0000000000000000000000"
                    value={cvuForm.cvu}
                    onChange={e => setCvuForm(f => ({ ...f, cvu: e.target.value.replace(/\D/g, "").slice(0, 22) }))}
                  />
                </label>
                <label className="vtz-profile-field">
                  <span>Nombre titular</span>
                  <input
                    type="text"
                    placeholder="Como aparece en tu cuenta"
                    value={cvuForm.holderName}
                    onChange={e => setCvuForm(f => ({ ...f, holderName: e.target.value }))}
                  />
                </label>
                <label className="vtz-profile-field">
                  <span>Alias <small style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</small></span>
                  <input
                    type="text"
                    placeholder="nombre.apellido.banco"
                    value={cvuForm.alias}
                    onChange={e => setCvuForm(f => ({ ...f, alias: e.target.value }))}
                  />
                </label>

                {cvuMsg === "error" && (
                  <p className="vtz-profile-message is-error">Error al guardar el CVU</p>
                )}
                {cvuMsg === "info" && (
                  <p className="vtz-profile-message is-success">CVU guardado. Lo verificamos pronto.</p>
                )}

                <button
                  type="button"
                  className="vtz-profile-btn vtz-profile-btn--primary"
                  onClick={handleSaveCvu}
                  disabled={cvuSaving || cvuForm.cvu.length !== 22 || !cvuForm.holderName.trim()}
                >
                  {cvuSaving ? <><Loader2 className="vtz-profile-spin" size={16} /> Guardando...</> : <>Guardar CVU <ArrowRight size={15} /></>}
                </button>
              </div>
            )}
          </section>
          )}

          <section className="vtz-profile-card vtz-profile-card--save">
            <ShieldCheck size={22} />

            <div>
              <h3>Guardar perfil</h3>
              <p>Revisá tus datos y guardá los cambios.</p>
            </div>

            <button className="vtz-profile-btn vtz-profile-btn--primary" type="submit" disabled={saving}>
              {saving ? <Loader2 className="vtz-profile-spin" size={18} /> : <Save size={18} />}
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>

            {saveMsg && (
              <span className={`vtz-profile-save-msg ${isSuccessMessage(saveMsg) ? "is-success" : "is-error"}`}>
                {saveMsg}
              </span>
            )}
          </section>
        </aside>
      </form>
    </main>
  );
}
