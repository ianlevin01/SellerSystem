import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Loader2, ArrowRight, History, Sparkles } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

const LANDING_TRACK_KEY = "ventaz_landing_track";
const LANDING_TRACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Si la persona llegó por /ml o /ecom (landings de campaña, ver LandingMl.jsx/LandingEcom.jsx),
// esas páginas dejan la pista acá antes de ir a /register. Como el registro por email pasa por
// la verificación de mail (puede tardar minutos/horas y a veces abre en otra pestaña del mismo
// navegador), localStorage es lo único que sobrevive ese salto — sessionStorage no, porque no
// se comparte entre pestañas. Se limpia siempre al leerla, y se ignora si tiene más de un día
// (evita aplicar una elección vieja de una visita anterior a otra landing).
function consumeLandingTrackHint() {
  try {
    const raw = localStorage.getItem(LANDING_TRACK_KEY);
    localStorage.removeItem(LANDING_TRACK_KEY);
    if (!raw) return null;
    const { track, ts } = JSON.parse(raw);
    if ((track === "ecommerce" || track === "mercadolibre") && Date.now() - ts < LANDING_TRACK_MAX_AGE_MS) {
      return track;
    }
  } catch {
    // ignore
  }
  return null;
}

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
  // Al elegir Mercado Libre no navegamos todavía — primero preguntamos si ya vendía por ML,
  // para guardarlo en la cuenta y en el futuro poder adaptar la guía de onboarding según
  // si es alguien nuevo en ML o ya tiene experiencia.
  const [step, setStep] = useState("choose"); // "choose" | "ml-experience"
  const [autoHint] = useState(consumeLandingTrackHint);

  // Si vino de una landing específica, ya sabemos la elección — se aplica sola, sin mostrarle
  // las dos tarjetas (igual va a ver la pregunta de "¿ya vendiste por ML?" si corresponde, esa
  // no se saltea nunca).
  useEffect(() => {
    if (autoHint) choose(autoHint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(track) {
    setSaving(track); setError("");
    try {
      await client.patch("/seller/onboarding/track", { track });
      updateSeller({ onboarding_track: track });
      if (track === "mercadolibre") {
        setSaving(null);
        setStep("ml-experience");
        return;
      }
      // Sin ?new=true: ese param abre el modal de "crear tienda" automáticamente, lo que
      // chocaba con el tooltip de la guía apuntando al botón real (quedaban los dos
      // superpuestos, tapándose entre sí) — la guía ya lleva de la mano al botón visible.
      navigate("/pages?guide=true", { replace: true });
    } catch {
      setError("No se pudo guardar tu elección. Probá de nuevo.");
      setSaving(null);
    }
  }

  async function answerSoldBefore(soldBefore) {
    setSaving("ml-experience"); setError("");
    try {
      await client.patch("/seller/onboarding/sold-before", { soldBefore });
      navigate("/mercado-libre?guide=true", { replace: true });
    } catch {
      setError("No se pudo guardar tu respuesta. Probá de nuevo.");
      setSaving(null);
    }
  }

  // Mientras se aplica la elección automática (o si por algún motivo tarda), no mostrar las
  // tarjetas de elegir — solo si falla (error) se cae al "choose" normal para que la persona
  // pueda elegir a mano.
  if (step === "choose" && autoHint && !error) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg, #f6f7f4)",
      }}>
        <Loader2 size={28} className="spin" />
      </div>
    );
  }

  if (step === "ml-experience") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, background: "var(--bg, #f6f7f4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 36, maxWidth: 560 }}>
          <h1 style={{ margin: "0 0 10px", fontSize: "1.6rem", fontWeight: 800 }}>¿Ya vendiste antes por Mercado Libre?</h1>
          <p style={{ margin: 0, color: "var(--text-secondary, #666)", fontSize: ".95rem" }}>
            Nos ayuda a mostrarte la guía justa para vos, seas nuevo en Mercado Libre o ya tengas experiencia vendiendo.
          </p>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 760 }}>
          {[
            { value: true, icon: History, title: "Sí, ya vendía por Mercado Libre", description: "Ya tengo experiencia publicando y vendiendo en mi cuenta.", cta: "Sí, ya vendía" },
            { value: false, icon: Sparkles, title: "No, es mi primera vez", description: "Nunca vendí por Mercado Libre — quiero empezar desde cero.", cta: "Es mi primera vez" },
          ].map(opt => {
            const Icon = opt.icon;
            const isSaving = saving === "ml-experience";
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={!!saving}
                onClick={() => answerSoldBefore(opt.value)}
                className="card"
                style={{
                  width: 320, textAlign: "left", padding: 26, cursor: saving ? "default" : "pointer",
                  border: "1px solid var(--border)", background: "#fff", opacity: saving && !isSaving ? .5 : 1,
                  display: "flex", flexDirection: "column", gap: 14,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: "#2D3277", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={22} color="#fff" />
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
