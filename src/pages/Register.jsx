// src/pages/Register.jsx
// Registro premium de Ventaz con progreso por líneas
// cambio hecho por Yolo

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { firebaseAuth } from "../firebase";
import "../styles/Register.css";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

const BENEFITS = [
  "Catálogo listo para vender",
  "Tienda propia con tu marca",
  "Tutorial inicial paso a paso",
  "Soporte ante problemas",
];

const HOW_FOUND_OPTIONS = [
  { value: "", label: "Seleccioná una opción" },
  { value: "redes_sociales", label: "Redes sociales" },
  { value: "conocido", label: "Un conocido me recomendó" },
  { value: "publicidad", label: "Publicidad" },
  { value: "busqueda", label: "Búsqueda en internet" },
  { value: "otro", label: "Otro" },
];

function cleanDni(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidDni(value) {
  return /^\d{7,8}$/.test(cleanDni(value));
}

function getPasswordScore(password) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}

function passwordLabel(score, password) {
  if (!password) return "Usá mínimo 8 caracteres";
  if (score <= 1) return "Muy débil";
  if (score === 2) return "Aceptable";
  if (score === 3) return "Buena";
  return "Muy segura";
}

export default function Register() {
  const { loginWithGoogle } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dni: "",
    how_found_us: "",
  });

  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const passwordScore = useMemo(() => getPasswordScore(form.password), [form.password]);

  const completionSteps = useMemo(() => [
    {
      key: "name",
      label: "Nombre",
      done: form.name.trim().length >= 2,
    },
    {
      key: "email",
      label: "Email",
      done: /\S+@\S+\.\S+/.test(form.email),
    },
    {
      key: "phone",
      label: "WhatsApp",
      done: form.phone.trim().length >= 6,
    },
    {
      key: "dni",
      label: "DNI",
      done: isValidDni(form.dni),
    },
    {
      key: "source",
      label: "Origen",
      done: !!form.how_found_us,
    },
    {
      key: "password",
      label: "Contraseña",
      done: form.password.length >= 8,
    },
  ], [form]);

  const errors = useMemo(() => {
    const next = {};

    if (!form.name.trim()) {
      next.name = "Ingresá tu nombre completo";
    }

    if (!form.email.trim()) {
      next.email = "Ingresá tu email";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      next.email = "Ingresá un email válido";
    }

    if (!form.phone.trim()) {
      next.phone = "Ingresá tu WhatsApp";
    }

    if (!form.dni.trim()) {
      next.dni = "Ingresá tu DNI";
    } else if (!isValidDni(form.dni)) {
      next.dni = "El DNI debe tener 7 u 8 números";
    }

    if (!form.how_found_us) {
      next.how_found_us = "Seleccioná cómo nos conociste";
    }

    if (!form.password) {
      next.password = "Ingresá una contraseña";
    } else if (form.password.length < 8) {
      next.password = "La contraseña debe tener mínimo 8 caracteres";
    } else if (!/[A-Z]/.test(form.password)) {
      next.password = "La contraseña debe tener al menos una mayúscula";
    } else if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password)) {
      next.password = "La contraseña debe tener al menos un número o carácter especial";
    }

    return next;
  }, [form]);

  const canSubmit = Object.keys(errors).length === 0 && !loading;

  async function handleGoogle() {
    setError("");
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error al registrarse con Google");
    } finally {
      setLoadingGoogle(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  }

  function markTouched(key) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      phone: true,
      dni: true,
      how_found_us: true,
      password: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Revisá los datos marcados para crear tu tienda.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dni: cleanDni(form.dni),
        how_found_us: form.how_found_us,
        password: form.password,
      };

      try {
        await client.post("/seller/auth/register", payload);
      } catch (registerErr) {
        const msg = registerErr.response?.data?.message || "";
        const mayBeStrictBackend = /dni|how_found_us|how_found|campo|field|unknown|unexpected/i.test(msg);

        if (!mayBeStrictBackend) throw registerErr;

        await client.post("/seller/auth/register", {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          password: payload.password,
        });
      }

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear tu tienda. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="vtz-register">
        <section className="vtz-register-success">
          <div className="vtz-success-card">
            <div className="vtz-success-card__icon">
              <Mail size={28} />
            </div>

            <span className="vtz-register-kicker">Último paso</span>
            <h1>Revisá tu email</h1>
            <p>
              Te enviamos un link de verificación. Activá tu cuenta para entrar al panel.
              Después vas a ver una guía inicial que te explica todo paso a paso.
            </p>

            <div className="vtz-success-card__email">
              <Mail size={17} />
              <span>{form.email}</span>
            </div>

            <Link to="/login" className="vtz-register-btn vtz-register-btn--primary">
              Ir al login <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="vtz-register">
      <section className="vtz-register-panel">
        <div className="vtz-register-panel__glow" />

        <Link to="/" className="vtz-register-brand">
          <img src="/ventaz.png" alt="Ventaz" style={{ height: 30, objectFit: "contain" }} />
        </Link>

        <div className="vtz-register-panel__content">
          <div className="vtz-register-pill">
            <Sparkles size={16} />
            Crear tienda en minutos
          </div>

          <h1>
            Creá tu tienda y empezá con una estructura lista para vender.
          </h1>

          <p>
            No necesitás comprar stock, guardar mercadería ni resolver toda la operación.
            Ventaz te da la base para enfocarte en conseguir clientes.
          </p>

          <div className="vtz-register-benefits">
            {BENEFITS.map((benefit) => (
              <div key={benefit}>
                <CheckCircle2 size={17} />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="vtz-register-proof">
          <ShieldCheck size={18} />
          <span>
            Plataforma pensada para vender online con control, soporte y reglas claras.
          </span>
        </div>
      </section>

      <section className="vtz-register-form-section">
        <div className="vtz-register-form-wrap">
          <div className="vtz-register-mobile-brand">
            <img src="/ventaz.png" alt="Ventaz" style={{ height: 24, objectFit: "contain" }} />
          </div>

          <div className="vtz-register-head">
            <span className="vtz-register-kicker">Nuevo vendedor</span>
            <h2>Crear mi tienda</h2>
            <p>Completá tus datos para activar tu cuenta de vendedor.</p>
          </div>

          <div className="vtz-register-completion-lines" aria-label="Progreso del formulario">
            {completionSteps.map((step) => (
              <span
                key={step.key}
                className={step.done ? "is-active" : ""}
                title={step.label}
              />
            ))}
          </div>

          <div className="vtz-register-onboarding">
            <Sparkles size={18} />
            <div>
              <strong>Después del registro te guiamos paso a paso</strong>
              <span>
                Vas a tener una introducción para entender cómo elegir productos, configurar tu tienda,
                publicar y empezar a vender.
              </span>
            </div>
          </div>

          {error && (
            <div className="vtz-register-alert">
              <ShieldCheck size={17} />
              {error}
            </div>
          )}

          {firebaseAuth && (
            <button
              type="button"
              className="vtz-login-google"
              onClick={handleGoogle}
              disabled={loadingGoogle || loading}
            >
              {loadingGoogle ? <Loader2 size={18} className="vtz-register-spin" /> : <GoogleIcon />}
              Registrarse con Google
            </button>
          )}

          {firebaseAuth && (
            <div className="vtz-register-divider">
              <span>o completá tus datos</span>
            </div>
          )}

          <form className="vtz-register-form" onSubmit={handleSubmit} noValidate>
            <div className={`vtz-register-field ${touched.name && errors.name ? "has-error" : ""}`}>
              <label htmlFor="reg-name">Nombre completo</label>
              <div className="vtz-register-input">
                <User size={18} />
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ej: Lucas Dercye"
                  value={form.name}
                  onBlur={() => markTouched("name")}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              {touched.name && errors.name && <small>{errors.name}</small>}
            </div>

            <div className={`vtz-register-field ${touched.email && errors.email ? "has-error" : ""}`}>
              <label htmlFor="reg-email">Email</label>
              <div className="vtz-register-input">
                <Mail size={18} />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onBlur={() => markTouched("email")}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              {touched.email && errors.email && <small>{errors.email}</small>}
            </div>

            <div className={`vtz-register-field ${touched.phone && errors.phone ? "has-error" : ""}`}>
              <label htmlFor="reg-phone">WhatsApp</label>
              <div className="vtz-register-input">
                <Phone size={18} />
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+54 11 1234-5678"
                  value={form.phone}
                  onBlur={() => markTouched("phone")}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
              {touched.phone && errors.phone && <small>{errors.phone}</small>}
            </div>

            <div className={`vtz-register-field ${touched.dni && errors.dni ? "has-error" : ""}`}>
              <label htmlFor="reg-dni">DNI</label>
              <div className="vtz-register-input">
                <BadgeCheck size={18} />
                <input
                  id="reg-dni"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej: 12345678"
                  value={form.dni}
                  onBlur={() => markTouched("dni")}
                  onChange={(e) => updateField("dni", e.target.value)}
                />
              </div>
              {touched.dni && errors.dni && <small>{errors.dni}</small>}
            </div>

            <div className={`vtz-register-field ${touched.how_found_us && errors.how_found_us ? "has-error" : ""}`}>
              <label htmlFor="reg-how-found">¿Cómo nos conociste?</label>
              <div className="vtz-register-input vtz-register-input--select">
                <Store size={18} />
                <select
                  id="reg-how-found"
                  value={form.how_found_us}
                  onBlur={() => markTouched("how_found_us")}
                  onChange={(e) => updateField("how_found_us", e.target.value)}
                >
                  {HOW_FOUND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {touched.how_found_us && errors.how_found_us && <small>{errors.how_found_us}</small>}
            </div>

            <div className={`vtz-register-field ${touched.password && errors.password ? "has-error" : ""}`}>
              <label htmlFor="reg-password">Contraseña</label>
              <div className="vtz-register-input">
                <LockKeyhole size={18} />
                <input
                  id="reg-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onBlur={() => markTouched("password")}
                  onChange={(e) => updateField("password", e.target.value)}
                />
                <button
                  type="button"
                  className="vtz-register-eye"
                  onClick={() => setShowPass((value) => !value)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <small className={touched.password && errors.password ? "" : "is-muted"}>
                {touched.password && errors.password
                  ? errors.password
                  : passwordLabel(passwordScore, form.password)}
              </small>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="vtz-register-btn vtz-register-btn--primary"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="vtz-register-spin" />
                  Creando tienda...
                </>
              ) : (
                <>
                  Crear mi tienda
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="vtz-register-bottom">
            <div>
              <Store size={17} />
              <span>Después vas a ver una guía inicial para configurar tu tienda, productos y precios sin perderte.</span>
            </div>

            <p>
              ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
