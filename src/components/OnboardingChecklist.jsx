// src/components/OnboardingChecklist.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp, Rocket, X } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "../styles/OnboardingChecklist.css";

const ML_OBJECTIVES = [
  {
    key:         "connect_ml",
    title:       "Conectá tu cuenta de Mercado Libre",
    description: "Autorizá a Ventaz a publicar en tu propia cuenta de Mercado Libre.",
    emoji:       "🔗",
    route:       () => `/mercado-libre`,
  },
  {
    key:         "save_card",
    title:       "Guardá una tarjeta para el cobro",
    description: "Se usa para cobrarte una vez al día el costo de tus ventas de Mercado Libre.",
    emoji:       "💳",
    route:       () => `/mercado-libre`,
  },
  {
    key:         "first_listing",
    title:       "Publicá tu primer producto",
    description: "Elegí un producto del catálogo y publicalo en tu cuenta de Mercado Libre.",
    emoji:       "📦",
    route:       () => `/mercado-libre?guide=true`,
  },
  {
    key:         "complete_profile",
    title:       "Completá tu perfil",
    description: "Subí foto de perfil y agregá tu teléfono.",
    emoji:       "👤",
    route:       () => `/profile?guide=true`,
  },
  {
    key:         "first_sale_ml",
    title:       "Generá tu primera venta",
    description: "Compartí tus publicaciones y recibí tu primer pedido por Mercado Libre.",
    emoji:       "🚀",
    route:       () => `/orders`,
  },
];

const ECOMMERCE_OBJECTIVES = [
  {
    key:         "create_page",
    title:       "Creá tu primera página",
    description: "Configurá tu tienda online con nombre y diseño personalizado.",
    emoji:       "🏪",
    route:       (_id) => `/pages?guide=true`,
  },
  {
    key:         "add_5_products",
    title:       "Sumá 5 productos a tu tienda",
    description: "Elegí y agregá al menos 5 productos del catálogo disponible.",
    emoji:       "📦",
    route:       (id) => id ? `/pages/${id}/products?guide=true` : `/pages?guide=true`,
  },
  {
    key:         "set_custom_prices",
    title:       "Fijá precios personalizados",
    description: "Ajustá el precio de venta de al menos 3 productos.",
    emoji:       "🏷️",
    route:       (id) => id ? `/pages/${id}/products?guide=true` : `/pages?guide=true`,
  },
  {
    key:         "create_discount",
    title:       "Configurá un descuento",
    description: "Creá una promoción por cantidad o por monto para tus clientes.",
    emoji:       "⚡",
    route:       (id) => id ? `/pages/${id}/discounts?guide=true` : `/pages?guide=true`,
  },
  {
    key:         "add_combo",
    title:       "Armá un combo de productos",
    description: "Combiná artículos en un paquete para aumentar el ticket promedio.",
    emoji:       "🎁",
    route:       (id) => id ? `/pages/${id}?guide=true` : `/pages?guide=true`,
  },
  {
    key:         "complete_profile",
    title:       "Completá tu perfil",
    description: "Subí foto de perfil, agregá teléfono y configurá tu CVU.",
    emoji:       "👤",
    route:       (_id) => `/profile?guide=true`,
  },
  {
    key:         "add_integration",
    title:       "Conectá una integración",
    description: "Activá Meta Pixel para medir tus campañas publicitarias.",
    emoji:       "🔌",
    route:       (id) => id ? `/pages/${id}/integrations?guide=true` : `/pages?guide=true`,
  },
  {
    key:         "first_sale",
    title:       "Generá tu primera venta",
    description: "Compartí tu tienda y recibí tu primer pedido pagado. ¡El momento clave!",
    emoji:       "🚀",
    route:       (_id) => `/orders`,
  },
  {
    key:         "request_payout",
    title:       "Cobrá tus ganancias",
    description: "Solicitá el pago de tu saldo disponible y recibilo en tu cuenta.",
    emoji:       "💰",
    route:       (_id) => `/cobros`,
  },
];

export default function OnboardingChecklist({ onHide }) {
  const navigate = useNavigate();
  const { seller } = useAuth();
  const OBJECTIVES = seller?.onboarding_track === "mercadolibre" ? ML_OBJECTIVES : ECOMMERCE_OBJECTIVES;
  const [progress,   setProgress]   = useState(null);
  const [loading,    setLoading]     = useState(true);
  const [collapsed,  setCollapsed]   = useState(false);
  const [dismissing, setDismissing]  = useState(false);

  const fetchProgress = useCallback(() => {
    client.get("/seller/onboarding/progress")
      .then(res => {
        setProgress(res.data);
        setLoading(false);
        if (res.data?.dismissed) onHide?.();
      })
      .catch(() => { setLoading(false); onHide?.(); });
  }, [onHide]);

  useEffect(() => {
    fetchProgress();
    const id = setInterval(fetchProgress, 60_000);
    return () => clearInterval(id);
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="vtz-ob">
        <div className="vtz-ob__header" style={{ cursor: "default" }}>
          <div className="vtz-ob__header-left">
            <span className="vtz-ob__header-icon"><Rocket size={16} /></span>
            <div className="vtz-ob__header-text">
              <strong className="vtz-ob__title">Primeros pasos en Ventaz</strong>
              <span className="vtz-ob__subtitle">Cargando tu progreso...</span>
            </div>
          </div>
        </div>
        <div className="vtz-ob__bar"><div className="vtz-ob__bar-fill" style={{ width: 0 }} /></div>
        <div className="vtz-ob__skeleton">
          {[80, 70, 90, 60, 75].map((w, i) => (
            <div key={i} className="vtz-ob__skel-row">
              <div className="vtz-ob__skel-circle" />
              <div className="vtz-ob__skel-line" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!progress || progress.dismissed) return null;

  const completedCount = OBJECTIVES.filter(o => progress[o.key]).length;
  const allDone        = completedCount === OBJECTIVES.length;
  const pct            = Math.round((completedCount / OBJECTIVES.length) * 100);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await client.post("/seller/onboarding/dismiss");
      setProgress(p => ({ ...p, dismissed: true }));
      onHide?.();
    } catch {
      setDismissing(false);
    }
  }

  function handleObjectiveClick(obj) {
    navigate(obj.route(progress.suggested_page_id));
  }

  return (
    <div className={`vtz-ob${collapsed ? " vtz-ob--collapsed" : ""}${allDone ? " vtz-ob--complete" : ""}`}>

      {/* ── Header ── */}
      <div className="vtz-ob__header" onClick={() => setCollapsed(c => !c)} role="button" tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setCollapsed(c => !c)}>
        <div className="vtz-ob__header-left">
          <span className="vtz-ob__header-icon">
            {allDone ? "🎉" : <Rocket size={16} />}
          </span>
          <div className="vtz-ob__header-text">
            <strong className="vtz-ob__title">Primeros pasos en Ventaz</strong>
            <span className="vtz-ob__subtitle">{completedCount} de {OBJECTIVES.length} completados</span>
          </div>
        </div>
        <div className="vtz-ob__header-right">
          <span className="vtz-ob__pct">{pct}%</span>
          {collapsed
            ? <ChevronDown size={18} className="vtz-ob__chevron" />
            : <ChevronUp   size={18} className="vtz-ob__chevron" />}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="vtz-ob__bar">
        <div className="vtz-ob__bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div className="vtz-ob__body">

          {/* All-done celebration banner */}
          {allDone && (
            <div className="vtz-ob__celebration">
              <p className="vtz-ob__celebration-text">
                <strong>🎉 ¡Lo lograste!</strong> Tu tienda está 100% configurada y lista para vender.
              </p>
              <button className="vtz-ob__dismiss-btn" onClick={handleDismiss} disabled={dismissing}>
                <X size={14} />
                {dismissing ? "Ocultando..." : "Ocultar este panel"}
              </button>
            </div>
          )}

          {/* Objectives list */}
          {OBJECTIVES.map((obj, index) => {
            const done = !!progress[obj.key];
            return (
              <div
                key={obj.key}
                className={`vtz-ob__item vtz-ob__item--${done ? "done" : "pending"}`}
              >
                <div className="vtz-ob__step">
                  {done
                    ? <CheckCircle2 size={24} className="vtz-ob__check" />
                    : <span className="vtz-ob__num">{index + 1}</span>}
                </div>

                <div className="vtz-ob__item-body">
                  <strong className="vtz-ob__item-title">{obj.emoji} {obj.title}</strong>
                  <span className="vtz-ob__item-desc">{obj.description}</span>
                </div>

                <div className="vtz-ob__action">
                  {done
                    ? <span className="vtz-ob__done-label">Listo ✓</span>
                    : (
                      <button
                        type="button"
                        className="vtz-ob__go-btn"
                        onClick={() => handleObjectiveClick(obj)}
                      >
                        Ir →
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
