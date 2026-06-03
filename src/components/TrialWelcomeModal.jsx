import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";

const PLANS = [
  {
    id: "inicial", name: "Plan Inicial", price: "$9.999", tag: null,
    features: ["1 tienda activa", "Productos ilimitados", "MercadoPago incluido", "Ganancias en 14 días"],
  },
  {
    id: "pro", name: "Plan Pro", price: "$24.999", tag: "Más popular",
    features: ["Hasta 4 tiendas", "Carga masiva de productos", "IA para tu tienda", "Ganancias en 7 días"],
  },
  {
    id: "max", name: "Plan Max", price: "$49.999", tag: null,
    features: ["Tiendas ilimitadas", "Carga masiva de productos", "IA para tu tienda", "Ganancias el mismo día"],
  },
];

export default function TrialWelcomeModal({ onClose, days = 15 }) {
  const navigate = useNavigate();

  function handleVerPlanes() {
    onClose();
    navigate("/subscription");
  }

  return createPortal(
    <div className="twm-overlay" onClick={onClose}>
      <div className="twm-modal" onClick={e => e.stopPropagation()}>
        <button className="twm-close" onClick={onClose}><X size={16} /></button>

        <div className="twm-header">
          <span className="twm-kicker">Bienvenido a Ventaz</span>
          <h2 className="twm-title">{days} {days === 1 ? "día" : "días"} gratis del <strong>Plan Inicial</strong></h2>
          <p className="twm-sub">Explorá la plataforma sin costo. Pasados los {days} días, elegís si continuás o cancelás.</p>
        </div>

        <div className="twm-plans">
          {PLANS.map(plan => (
            <div key={plan.id} className={`twm-plan ${plan.id === "pro" ? "twm-plan--highlight" : ""}`}>
              {plan.tag && <span className="twm-plan__tag">{plan.tag}</span>}
              <div className="twm-plan__name">{plan.name}</div>
              <div className="twm-plan__price">{plan.price}<span>/mes</span></div>
              <ul className="twm-plan__features">
                {plan.features.map(f => (
                  <li key={f}><Check size={11} />{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="twm-footer">
          <button className="twm-btn twm-btn--primary" onClick={handleVerPlanes}>Ver todos los planes</button>
          <button className="twm-btn twm-btn--ghost" onClick={onClose}>Explorar la plataforma</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TrialExpiredModal({ onClose }) {
  const navigate = useNavigate();

  function handleVerPlanes() {
    onClose();
    navigate("/subscription");
  }

  return createPortal(
    <div className="twm-overlay" onClick={onClose}>
      <div className="twm-modal twm-modal--expired" onClick={e => e.stopPropagation()}>
        <div className="twm-header">
          <div className="twm-expired-icon">⏰</div>
          <span className="twm-kicker twm-kicker--red">Período de prueba finalizado</span>
          <h2 className="twm-title twm-title--dark">Te quedaste sin días gratis</h2>
          <p className="twm-sub">Tu período de prueba gratuito terminó. Para seguir usando Ventaz, elegí el plan que mejor se adapte a tu negocio.</p>
        </div>

        <div className="twm-plans">
          {PLANS.map(plan => (
            <div key={plan.id} className={`twm-plan ${plan.id === "pro" ? "twm-plan--highlight" : ""}`}>
              {plan.tag && <span className="twm-plan__tag">{plan.tag}</span>}
              <div className="twm-plan__name">{plan.name}</div>
              <div className="twm-plan__price">{plan.price}<span>/mes</span></div>
              <ul className="twm-plan__features">
                {plan.features.map(f => (
                  <li key={f}><Check size={11} />{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="twm-footer">
          <button className="twm-btn twm-btn--primary" onClick={handleVerPlanes}>Elegir un plan ahora</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
