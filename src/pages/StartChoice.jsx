import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Loader2, ArrowRight } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

const OPTIONS = [
  {
    track: "ecommerce",
    icon: Store,
    color: "#4db81a",
    title: "Mi propia tienda online",
    description: "Armá tu tienda con tu marca, compartí el link y vendé el catálogo de Ventaz a tus clientes.",
    cta: "Empezar mi tienda",
  },
  {
    track: "mercadolibre",
    logo: "/mercadolibre-logo.png",
    color: "#FFE600",
    textColor: "#2D3277",
    title: "Vender por Mercado Libre",
    description: "Publicá el catálogo de Ventaz directo en tu propia cuenta de Mercado Libre.",
    cta: "Empezar con Mercado Libre",
  },
];

export default function StartChoice() {
  const navigate = useNavigate();
  const { updateSeller } = useAuth();
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");

  async function choose(track) {
    setSaving(track); setError("");
    try {
      await client.patch("/seller/onboarding/track", { track });
      updateSeller({ onboarding_track: track });
      // Sin ?new=true: ese param abre el modal de "crear tienda" automáticamente, lo que
      // chocaba con el tooltip de la guía apuntando al botón real (quedaban los dos
      // superpuestos, tapándose entre sí) — la guía ya lleva de la mano al botón visible.
      navigate(track === "mercadolibre" ? "/mercado-libre?guide=true" : "/pages?guide=true", { replace: true });
    } catch {
      setError("No se pudo guardar tu elección. Probá de nuevo.");
      setSaving(null);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 24, background: "var(--bg, #f6f7f4)",
    }}>
      <div style={{ textAlign: "center", marginBottom: 36, maxWidth: 560 }}>
        <h1 style={{ margin: "0 0 10px", fontSize: "1.6rem", fontWeight: 800 }}>¿Cómo querés empezar?</h1>
        <p style={{ margin: 0, color: "var(--text-secondary, #666)", fontSize: ".95rem" }}>
          Elegí por dónde arrancar — más adelante vas a poder activar la otra opción también, sin perder nada de lo que armes acá.
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 760 }}>
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          const isSaving = saving === opt.track;
          return (
            <button
              key={opt.track}
              type="button"
              disabled={!!saving}
              onClick={() => choose(opt.track)}
              className="card"
              style={{
                width: 320, textAlign: "left", padding: 26, cursor: saving ? "default" : "pointer",
                border: "1px solid var(--border)", background: "#fff", opacity: saving && !isSaving ? .5 : 1,
                display: "flex", flexDirection: "column", gap: 14,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: opt.color, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center", padding: opt.logo ? 8 : 0,
              }}>
                {opt.logo
                  ? <img src={opt.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <Icon size={22} color={opt.textColor || "#fff"} />}
              </div>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700 }}>{opt.title}</h3>
                <p style={{ margin: 0, fontSize: ".85rem", color: "var(--text-secondary, #666)", lineHeight: 1.5 }}>
                  {opt.description}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".85rem", fontWeight: 700, color: "var(--brand, #4db81a)", marginTop: "auto" }}>
                {isSaving ? <><Loader2 size={14} className="spin" /> Guardando...</> : <>{opt.cta} <ArrowRight size={14} /></>}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p style={{ marginTop: 20, color: "var(--danger, #ef4444)", fontSize: ".85rem" }}>{error}</p>}
    </div>
  );
}
