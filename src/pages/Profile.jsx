// src/pages/Profile.jsx
// Perfil premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useMemo, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "../styles/Profile.css";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  User,
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
  const { updateSeller, refreshSeller } = useAuth();
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

  useEffect(() => {
    client
      .get("/seller/auth/profile")
      .then((res) => {
        const d = res.data;
        const fallbackName = splitName(d.name || "");

        setForm({
          first_name: d.first_name || d.firstName || fallbackName.first_name || "",
          last_name: d.last_name || d.lastName || fallbackName.last_name || "",
          email: d.email || d.seller_email || d.user_email || "",
          phone: d.phone || "",
          city: d.city || "",
          birth_date: d.birth_date || d.birthDate || "",
          avatar_url: d.avatar_url || "",
        });

        setPhoneVerified(!!d.phone_verified);
      })
      .finally(() => setLoading(false));
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
        done: form.phone.trim().length >= 6 && phoneVerified,
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

      setSaveMsg("Guardado correctamente");
      setTimeout(() => setSaveMsg(""), 3000);
      updateSeller(payload);
    } catch (err) {
      try {
        await client.put("/seller/auth/profile", {
          name: fullName,
          city: form.city.trim(),
          phone: form.phone.trim(),
          age,
        });

        setSaveMsg("Guardado correctamente");
        setTimeout(() => setSaveMsg(""), 3000);
        updateSeller(payload);
      } catch (fallbackErr) {
        setSaveMsg(fallbackErr.response?.data?.message || fallbackErr.message || "Error al guardar");
      }
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

            {phoneVerified ? (
              <div className="vtz-profile-ok">
                <CheckCircle2 size={18} />
                <span>Teléfono verificado</span>
              </div>
            ) : (
              <button
                type="button"
                className="vtz-profile-btn vtz-profile-btn--secondary"
                onClick={handleRequestOtp}
                disabled={otpLoading}
              >
                {otpLoading ? <Loader2 className="vtz-profile-spin" size={18} /> : null}
                {otpLoading ? "Enviando..." : "Enviar código por SMS"}
              </button>
            )}

            {otpMode && !phoneVerified && (
              <div className="vtz-profile-otp">
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Código de 6 dígitos"
                  maxLength={6}
                />

                <div>
                  <button
                    type="button"
                    className="vtz-profile-btn vtz-profile-btn--primary"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || !otpCode}
                  >
                    {otpLoading ? "Verificando..." : "Confirmar"}
                  </button>

                  <button
                    type="button"
                    className="vtz-profile-btn vtz-profile-btn--ghost"
                    onClick={handleRequestOtp}
                    disabled={otpLoading}
                  >
                    Reenviar
                  </button>
                </div>
              </div>
            )}

            {otpMsg && (
              <p className={`vtz-profile-message ${isSuccessMessage(otpMsg) ? "is-success" : "is-error"}`}>
                {otpMsg}
              </p>
            )}
          </section>

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
