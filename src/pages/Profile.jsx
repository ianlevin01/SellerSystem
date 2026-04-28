// src/pages/Profile.jsx
// Perfil premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "../styles/Profile.css";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  WandSparkles,
} from "lucide-react";

const HOW_FOUND_OPTIONS = [
  { value: "", label: "Seleccioná una opción" },
  { value: "redes_sociales", label: "Redes sociales" },
  { value: "conocido", label: "Un conocido me recomendó" },
  { value: "publicidad", label: "Publicidad" },
  { value: "busqueda", label: "Búsqueda en internet" },
  { value: "otro", label: "Otro" },
];

function isSuccessMessage(message) {
  return (
    message.includes("Guardado") ||
    message.includes("enviado") ||
    message.includes("verificado") ||
    message.includes("Verificado")
  );
}

export default function Profile() {
  const { refreshSeller } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    age: "",
    how_found_us: "",
  });

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        setForm({
          name: d.name || "",
          phone: d.phone || "",
          city: d.city || "",
          age: d.age != null ? String(d.age) : "",
          how_found_us: d.how_found_us || "",
        });

        setPhoneVerified(!!d.phone_verified);
      })
      .finally(() => setLoading(false));
  }, []);

  const progressItems = useMemo(
    () => [
      {
        key: "name",
        label: "Nombre",
        done: form.name.trim().length >= 2,
      },
      {
        key: "city",
        label: "Ciudad",
        done: form.city.trim().length >= 2,
      },
      {
        key: "age",
        label: "Edad",
        done: Number(form.age) >= 16,
      },
      {
        key: "source",
        label: "Origen",
        done: !!form.how_found_us,
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

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    try {
      await client.put("/seller/auth/profile", {
        ...form,
        name: form.name.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
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

      await refreshSeller();
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
          <span className="vtz-profile-kicker">
            <Sparkles size={16} />
            Mi perfil
          </span>

          <h1>Completá tus datos</h1>

          <p>
            Esta información ayuda a validar tu cuenta, ordenar el soporte y dejar tu
            perfil listo para operar dentro de Ventaz.
          </p>
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
              <span>Paso 1</span>
              <h2>Datos personales</h2>
            </div>

            <WandSparkles size={22} />
          </div>

          <div className="vtz-profile-fields">
            <label className="vtz-profile-field">
              <span>
                <User size={17} />
                Nombre completo
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Ej: Lucas Dercye"
              />
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
              <span>Edad</span>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                required
                min={16}
                max={99}
                placeholder="Ej: 28"
              />
            </label>

            <label className="vtz-profile-field">
              <span>¿Cómo nos conociste?</span>
              <select
                name="how_found_us"
                value={form.how_found_us}
                onChange={handleChange}
                required
              >
                {HOW_FOUND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <aside className="vtz-profile-side">
          <section className="vtz-profile-card">
            <div className="vtz-profile-card__head">
              <div>
                <span>Paso 2</span>
                <h2>Verificar teléfono</h2>
              </div>

              {phoneVerified ? (
                <BadgeCheck className="vtz-profile-verified-icon" size={24} />
              ) : (
                <Phone size={22} />
              )}
            </div>

            <p className="vtz-profile-note">
              Usá tu WhatsApp con código de país. Ejemplo: +54 9 11 1234-5678.
            </p>

            <label className="vtz-profile-field">
              <span>
                <Phone size={17} />
                Teléfono / WhatsApp
              </span>
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
                {otpLoading ? <Loader2 className="vtz-profile-spin" size={18} /> : <Phone size={18} />}
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
              <h3>Guardá los cambios</h3>
              <p>Cuando termines, guardá tu información para dejar el perfil actualizado.</p>
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

      <section className="vtz-profile-bottom-help">
        <CheckCircle2 size={18} />
        <span>
          Completá el perfil una sola vez. Después vas a poder concentrarte en configurar tu tienda,
          publicar productos y vender.
        </span>
        <ChevronRight size={18} />
      </section>
    </main>
  );
}
