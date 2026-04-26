// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { firebaseAuth } from "../firebase";
import { Zap } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") return;
      setError(err.response?.data?.message || err.message || "Error al iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon">
            <Zap size={18} />
          </div>
          <span className="auth-card__logo-text">Portal Vendedores</span>
        </div>

        <h1>Bienvenido</h1>
        <p className="auth-card__sub">Ingresá a tu panel de vendedor</p>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="tu@email.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn--primary btn--full btn--lg"
            style={{ marginTop: 8 }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {firebaseAuth && (
          <>
            <div className="auth-divider">
              <span>o</span>
            </div>

            <button
              type="button"
              className="btn btn--secondary btn--full btn--lg auth-google-btn"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </>
        )}

        <p className="auth-card__footer">
          ¿No tenés cuenta?{" "}
          <Link to="/register">Registrate</Link>
        </p>
      </div>
    </div>
  );
}
