import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import client from "../api/client";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import "../styles/Login.css";

export default function ResetPassword() {
  const [params]       = useSearchParams();
  const token          = params.get("token") || "";

  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");

  if (!token) {
    return (
      <main className="vtz-login">
        <section className="vtz-login-form-section" style={{ gridColumn: "1 / -1" }}>
          <div className="vtz-login-form-wrap" style={{ textAlign: "center" }}>
            <ShieldCheck size={40} color="#e53e3e" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ color: "#0f172a", margin: "0 0 10px" }}>Link inválido</h2>
            <p style={{ color: "#647067", marginBottom: 24 }}>Este link de recuperación no es válido o ya fue utilizado.</p>
            <Link to="/forgot-password" className="vtz-login-btn vtz-login-btn--primary">
              Solicitar uno nuevo
            </Link>
          </div>
        </section>
      </main>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden"); return; }
    setError("");
    setLoading(true);
    try {
      await client.post("/seller/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "No pudimos actualizar la contraseña. Intentá de nuevo.");
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
            Nueva contraseña
          </div>
          <h1>Elegí una contraseña segura.</h1>
          <p>Usá al menos 8 caracteres. Combiná letras, números y símbolos para mayor seguridad.</p>
        </div>
        <div className="vtz-login-proof">
          <ShieldCheck size={18} />
          <span>Una vez cambiada, el link deja de ser válido.</span>
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
              <h2 style={{ margin: "0 0 10px", fontSize: "1.5rem", color: "#0f172a" }}>¡Contraseña actualizada!</h2>
              <p style={{ color: "#4b6f43", lineHeight: 1.6, margin: "0 0 24px" }}>
                Ya podés iniciar sesión con tu nueva contraseña.
              </p>
              <Link to="/login" className="vtz-login-btn vtz-login-btn--primary">
                Ir al login <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <div className="vtz-login-head">
                <span className="vtz-login-kicker">Restablecer contraseña</span>
                <h2>Nueva contraseña</h2>
                <p>Ingresá tu nueva contraseña dos veces para confirmar.</p>
              </div>

              {error && (
                <div className="vtz-login-alert">
                  <ShieldCheck size={17} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="vtz-login-field">
                  <label htmlFor="rp-pass">Nueva contraseña</label>
                  <div className="vtz-login-input">
                    <LockKeyhole size={18} />
                    <input
                      id="rp-pass"
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(""); }}
                      disabled={loading}
                    />
                    <button type="button" className="vtz-login-eye" onClick={() => setShowPass(v => !v)} aria-label="Mostrar contraseña">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="vtz-login-field">
                  <label htmlFor="rp-pass2">Repetir contraseña</label>
                  <div className="vtz-login-input">
                    <LockKeyhole size={18} />
                    <input
                      id="rp-pass2"
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repetí la contraseña"
                      value={password2}
                      onChange={e => { setPassword2(e.target.value); setError(""); }}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !password2}
                  className="vtz-login-btn vtz-login-btn--primary"
                  style={{ marginTop: 4 }}
                >
                  {loading
                    ? <><Loader2 size={18} className="vtz-login-spin" /> Guardando...</>
                    : <>Guardar nueva contraseña <ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
