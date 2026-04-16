// src/pages/Register.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { Zap, Mail } from "lucide-react";

export default function Register() {
  const [form, setForm]       = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await client.post("/seller/auth/register", form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  if (success) return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Mail size={22} color="var(--success)" />
        </div>
        <h1 style={{ marginBottom: 8 }}>¡Revisá tu email!</h1>
        <p style={{ marginBottom: 24 }}>
          Te enviamos un link de verificación. Hacé clic en él para activar tu cuenta.
        </p>
        <Link to="/login" className="btn btn--primary btn--full">Ir al login</Link>
      </div>
    </div>
  );

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon">
            <Zap size={18} />
          </div>
          <span className="auth-card__logo-text">Portal Vendedores</span>
        </div>

        <h1>Crear cuenta</h1>
        <p className="auth-card__sub">Empezá a vender en minutos</p>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <input
              type="text" required className="form-input"
              placeholder="Juan García"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email" required className="form-input"
              placeholder="tu@email.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input
              type="tel" className="form-input"
              placeholder="+54 11 ..."
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña * (mín. 8 caracteres)</label>
            <input
              type="password" required minLength={8} className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="btn btn--primary btn--full btn--lg"
            style={{ marginTop: 8 }}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-card__footer">
          ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
        </p>
      </div>
    </div>
  );
}
