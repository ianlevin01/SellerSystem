// src/pages/Login.jsx
// Login limpio y premium de Ventaz
// cambio hecho por Yolo

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { firebaseAuth } from "../firebase";
import "../styles/Login.css";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
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

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const errors = useMemo(() => {
    const next = {};

    if (!form.email.trim()) {
      next.email = "Ingresá tu email";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      next.email = "Ingresá un email válido";
    }

    if (!form.password) {
      next.password = "Ingresá tu contraseña";
    }

    return next;
  }, [form]);

  const canSubmit = Object.keys(errors).length === 0 && !loading && !success;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  }

  function markTouched(key) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setTouched({ email: true, password: true });

    if (Object.keys(errors).length > 0) {
      setError("Revisá los datos para ingresar.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(form.email.trim(), form.password);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 650);
    } catch (err) {
      setError(err.response?.data?.message || "Email o contraseña incorrectos");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 650);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setLoading(false);
        return;
      }

      setError(err.response?.data?.message || err.message || "Error al iniciar sesión con Google");
      setLoading(false);
    }
  }

  return (
    <main className="vtz-login">
      <section className="vtz-login-side">
        <div className="vtz-login-side__grid" />
        <div className="vtz-login-side__orb" />

        <Link to="/" className="vtz-login-brand">
          <span>
            <Zap size={18} />
          </span>
          Ventaz
        </Link>

        <div className="vtz-login-side__content">
          <div className="vtz-login-pill">
            <Sparkles size={15} />
            Portal de vendedores
          </div>

          <h1>Bienvenido</h1>

          <p>
            Entrá a tu panel para seguir configurando tu tienda, publicar productos
            y controlar tus ventas.
          </p>

          <div className="vtz-login-side__chips">
            <span><CheckCircle2 size={15} /> Tienda</span>
            <span><CheckCircle2 size={15} /> Productos</span>
            <span><CheckCircle2 size={15} /> Pedidos</span>
          </div>
        </div>

        <div className="vtz-login-side__footer">
          <ShieldCheck size={17} />
          <span>Acceso seguro al sistema Ventaz</span>
        </div>
      </section>

      <section className="vtz-login-form-section">
        <div className="vtz-login-form-wrap">
          <div className="vtz-login-mobile-brand">
            <span>
              <Zap size={16} />
            </span>
            Ventaz
          </div>

          <div className="vtz-login-head">
            <span className="vtz-login-kicker">Ingresar</span>
            <h2>Entrá a tu panel</h2>
            <p>Continuá gestionando tu tienda.</p>
          </div>

          {error && (
            <div className="vtz-login-alert">
              <ShieldCheck size={17} />
              {error}
            </div>
          )}

          {success && (
            <div className="vtz-login-success">
              <CheckCircle2 size={17} />
              Listo. Entrando...
            </div>
          )}

          <form className="vtz-login-form" onSubmit={handleSubmit} noValidate>
            <div className={`vtz-login-field ${touched.email && errors.email ? "has-error" : ""}`}>
              <label htmlFor="login-email">Email</label>
              <div className="vtz-login-input">
                <Mail size={18} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  disabled={loading || success}
                  onBlur={() => markTouched("email")}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              {touched.email && errors.email && <small>{errors.email}</small>}
            </div>

            <div className={`vtz-login-field ${touched.password && errors.password ? "has-error" : ""}`}>
              <label htmlFor="login-password">Contraseña</label>
              <div className="vtz-login-input">
                <LockKeyhole size={18} />
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={form.password}
                  disabled={loading || success}
                  onBlur={() => markTouched("password")}
                  onChange={(e) => updateField("password", e.target.value)}
                />
                <button
                  type="button"
                  className="vtz-login-eye"
                  onClick={() => setShowPass((value) => !value)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touched.password && errors.password && <small>{errors.password}</small>}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="vtz-login-btn vtz-login-btn--primary"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="vtz-login-spin" />
                  Ingresando...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={18} />
                  Entrando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {firebaseAuth && (
            <>
              <div className="vtz-login-divider">
                <span>o</span>
              </div>

              <button
                type="button"
                className="vtz-login-google"
                onClick={handleGoogle}
                disabled={loading || success}
              >
                <GoogleIcon />
                Continuar con Google
              </button>
            </>
          )}

          <p className="vtz-login-register">
            ¿Todavía no tenés tienda? <Link to="/register">Crear mi tienda</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
