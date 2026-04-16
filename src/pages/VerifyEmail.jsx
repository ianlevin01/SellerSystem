// src/pages/VerifyEmail.jsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import client from "../api/client";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [message, setMessage] = useState("");
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;
    const token = params.get("token");
    if (!token) { setStatus("error"); setMessage("Token no encontrado"); return; }
    client.get(`/seller/auth/verify?token=${token}`)
      .then(res => { setStatus("ok"); setMessage(res.data.message); })
      .catch(err => { setStatus("error"); setMessage(err.response?.data?.message || "Error al verificar"); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 12, padding: 40, maxWidth: 400, width: "100%", textAlign: "center", border: "1px solid var(--color-border-tertiary)" }}>
        {status === "loading" && <p style={{ color: "var(--color-text-secondary)" }}>Verificando...</p>}
        {status === "ok" && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontWeight: 500, marginBottom: 8 }}>¡Cuenta verificada!</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 20 }}>{message}</p>
            <Link to="/login" style={{ background: "#6366f1", color: "#fff", padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>
              Ir al login
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <h2 style={{ fontWeight: 500, marginBottom: 8 }}>Error de verificación</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
