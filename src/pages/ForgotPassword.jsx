import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import "../styles/Login.css";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Ingresá tu email"); return; }
    setError("");
    setLoading(true);
    try {
      await client.post("/seller/auth/forgot-password", { email: email.trim() });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "No pudimos procesar la solicitud. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="vtz-login">
      <section className="vtz-login-panel">
        <div className="vtz-login-panel__glow" />
        <Link to="/" className="vtz-login-brand">
          <img src="/ventaz.png" alt="Ventaz" style={{ height: 30, objectFit: "contain" }} />
        </Link>
        <div className="vtz-login-panel__content">
          <div className="vtz-login-pill">
            <ShieldCheck size={16} />
            Seguridad de cuenta
          </div>
          <h1>Recuperá el acceso a tu tienda.</h1>
          <p>Te mandamos un link a tu email para que puedas crear una nueva contraseña.</p>
        </div>
        <div className="vtz-login-proof">
          <ShieldCheck size={18} />
          <span>El link expira en 1 hora por seguridad.</span>
        </div>
      </section>

      <section className="vtz-login-form-section">
        <div className="vtz-login-form-wrap">
          <div className="vtz-login-mobile-brand">
            <img src="/ventaz.png" alt="Ventaz" style={{ height: 24, objectFit: "contain" }} />
          </div>

          {done ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eefbe7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 size={28} color="#329f10" />
              </div>
              <h2 style={{ margin: "0 0 10px", fontSize: "1.5rem", color: "#0f172a" }}>Revisá tu email</h2>
              <p style={{ color: "#4b6f43", lineHeight: 1.6, margin: "0 0 24px" }}>
                Si el email <strong>{email}</strong> tiene una cuenta en Ventaz, vas a recibir el link para restablecer tu contraseña.
              </p>
              <Link to="/login" className="vtz-login-btn vtz-login-btn--primary">
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <div className="vtz-login-head">
                <span className="vtz-login-kicker">Olvidé mi contraseña</span>
                <h2>Restablecer contraseña</h2>
                <p>Ingresá el email con el que te registraste.</p>
              </div>

              {error && (
                <div className="vtz-login-alert">
                  <ShieldCheck size={17} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="vtz-login-field">
                  <label htmlFor="fp-email">Email</label>
                  <div className="vtz-login-input">
                    <Mail size={18} />
                    <input
                      id="fp-email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || !email.trim()} className="vtz-login-btn vtz-login-btn--primary">
                  {loading ? <><Loader2 size={18} className="vtz-login-spin" /> Enviando...</> : <>Enviar link de recuperación</>}
                </button>
              </form>

              <p style={{ marginTop: 20, textAlign: "center", color: "#647067", fontWeight: 800, fontSize: ".9rem" }}>
                <Link to="/login" style={{ color: "#329f10", fontWeight: 1000, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ArrowLeft size={15} /> Volver al login
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
