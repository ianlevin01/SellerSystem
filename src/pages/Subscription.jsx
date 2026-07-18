import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import client from "../api/client";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, X, Check,
  TrendingUp, TrendingDown,
} from "lucide-react";
import "../styles/Subscription.css";

// Bullets que van dentro de la card (cortos) — se muestran a todos los vendedores sin
// importar si venden por tienda propia o por Mercado Libre (o ambos), para que cada uno vea
// el valor completo del plan.
const PLAN_HIGHLIGHTS = {
  inicial: ["1 tienda activa",       "Productos ilimitados", "MercadoPago incluido", "Ganancias en 14 días", "Hasta 10 publicaciones en ML"],
  pro:     ["Hasta 4 tiendas",       "Carga masiva de productos", "IA para tu tienda",   "Ganancias en 7 días", "Hasta 50 publicaciones en ML"],
  max:     ["Tiendas ilimitadas",    "Carga masiva de productos", "IA para tu tienda",   "Ganancias el mismo día", "Publicaciones ilimitadas en ML"],
};

// Grid de comparación (abajo de los cards) — se muestra completa a todos los vendedores,
// tienda propia y Mercado Libre son dos canales del mismo plan, no dos productos separados.
const FEATURE_GROUPS = [
  {
    group: "Tiendas y productos",
    features: [
      { label: "Tiendas activas",             values: { inicial: "1",           pro: "4",    max: "Ilimitadas" } },
      { label: "Productos en catálogo",        values: { inicial: true,          pro: true,   max: true } },
      { label: "Carga masiva de productos",    values: { inicial: false,         pro: true,   max: true } },
    ]
  },
  {
    group: "Mercado Libre",
    features: [
      { label: "Publicaciones activas en ML",  values: { inicial: "10",          pro: "50",   max: "Ilimitadas" } },
    ]
  },
  {
    group: "Pagos y ganancias",
    features: [
      { label: "Integración MercadoPago",      values: { inicial: true,          pro: true,   max: true } },
      { label: "Descuento en costo (tienda y Mercado Libre)", values: { inicial: "—", pro: "5%", max: "10%" } },
      { label: "Disponibilidad de ganancias",  values: { inicial: "14 días",     pro: "7 días", max: "Mismo día" } },
      { label: "Envío prioritario a clientes", values: { inicial: false,         pro: true,   max: true } },
    ]
  },
  {
    group: "Herramientas",
    features: [
      { label: "IA para configurar tu tienda", values: { inicial: false,         pro: true,   max: true } },
      { label: "Academia Ventaz",              values: { inicial: false,         pro: true,   max: true } },
    ]
  },
];

// Para los modales de downgrade (qué se pierde)
const PLAN_EXTRAS = {
  pro:  ["Hasta 4 tiendas", "Carga masiva de productos", "IA para tu tienda", "Academia Ventaz", "Ganancias en 7 días", "Envío prioritario", "Hasta 50 publicaciones en ML"],
  max:  ["Tiendas ilimitadas", "Descuento 10% en costo", "Ganancias el mismo día", "Publicaciones ilimitadas en ML"],
};

function getPlanOrder(planId) {
  return { inicial: 1, pro: 2, max: 3 }[planId] || 0;
}

function getDiff(currentId, targetId) {
  const currentOrder = getPlanOrder(currentId);
  const targetOrder  = getPlanOrder(targetId);
  if (targetOrder > currentOrder) {
    // upgrade: mostrar lo que se gana
    const gains = [];
    if (targetOrder >= 2) gains.push(...PLAN_EXTRAS.pro);
    if (targetOrder >= 3) gains.push(...PLAN_EXTRAS.max);
    const currentGains = currentOrder >= 2 ? PLAN_EXTRAS.pro : [];
    return { type: "upgrade", items: gains.filter(f => !currentGains.includes(f)) };
  } else {
    // downgrade: mostrar lo que se pierde
    const losses = [];
    if (currentOrder >= 3) losses.push(...PLAN_EXTRAS.max);
    if (currentOrder >= 2 && targetOrder < 2) losses.push(...PLAN_EXTRAS.pro);
    return { type: "downgrade", items: losses };
  }
}

const PLAN_DESC = {
  inicial: "Para quienes están empezando a vender online.",
  pro:     "Para negocios que quieren crecer con más herramientas.",
  max:     "Para operaciones sin restricciones ni límites.",
};

function money(n) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "—";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(date) {
  if (!date) return null;
  return Math.max(0, Math.ceil((new Date(date) - new Date()) / 86400000));
}

function trialDaysLeft(d) {
  if (!d) return 0;
  return Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));
}

function StatusBadge({ status }) {
  const cfg = {
    trial:           { label: "En período de prueba", color: "amber" },
    active:          { label: "Activo",           color: "green" },
    cancelled:       { label: "Cancelado",        color: "gray"  },
    expired:         { label: "Expirado",         color: "red"   },
    pending_payment: { label: "Pago pendiente",   color: "orange"},
  }[status] || { label: status, color: "gray" };
  return <span className={`sub-badge sub-badge--${cfg.color}`}>{cfg.label}</span>;
}

// ── Grid de comparación ───────────────────────────────────────

function FeatureGrid({ plans }) {
  const ids = plans.map(p => p.id);
  function cell(val, planId) {
    if (val === true)  return <span className="sub-grid__check"><Check size={14}/></span>;
    if (val === false) return <span className="sub-grid__cross">—</span>;
    return <span className="sub-grid__text">{val}</span>;
  }
  return (
    <div className="sub-grid">
      {/* Cabecera */}
      <div className="sub-grid__header">
        <div className="sub-grid__row-label" />
        {ids.map(id => (
          <div key={id} className="sub-grid__col-name">
            {plans.find(p=>p.id===id)?.name || id}
          </div>
        ))}
      </div>
      {FEATURE_GROUPS.map(grp => (
        <div key={grp.group} className="sub-grid__group">
          <div className="sub-grid__group-title">{grp.group}</div>
          {grp.features.map(f => (
            <div key={f.label} className="sub-grid__row">
              <div className="sub-grid__row-label">{f.label}</div>
              {ids.map(id => (
                <div key={id} className="sub-grid__cell">
                  {cell(f.values[id], id)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Vista: plan activo ────────────────────────────────────────

function ActiveView({ current, plans, payments, onChangePlan, onCancel, actionLoading, confirmPlan, msg, setMsg }) {
  const days = daysUntil(current.plan_period_end);
  const currentPlanOrder = plans.find(p => p.id === current.plan_id)?.sort_order || 0;

  return (
    <div className="sub-active">

      {/* Mensaje */}
      {msg && (
        <div className={`sub-msg sub-msg--${msg.type}`}>
          {msg.type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}><X size={13} /></button>
        </div>
      )}

      {/* Banner de downgrade pendiente */}
      {current.pending_plan_id && (
        <div className="sub-pending-downgrade">
          <TrendingDown size={14} />
          <span>
            Tu plan cambiará a <strong>{plans.find(p => p.id === current.pending_plan_id)?.name || current.pending_plan_id}</strong> el{" "}
            {current.plan_period_end ? fmtDate(current.plan_period_end) : "fin del período actual"}.
            Hasta entonces seguís con tu plan actual.
          </span>
        </div>
      )}

      {/* Tarjeta principal del plan */}
      <div className="sub-active__card">
        <div className="sub-active__card-left">
          <div>
            <p className="sub-active__label">Tu plan actual</p>
            <h2 className="sub-active__plan-name">{current.plan_name}</h2>
            <StatusBadge status={current.pending_plan_id ? "cancelled" : current.plan_status} />
          </div>
        </div>

        <div className="sub-active__card-right">
          <div className="sub-active__stat">
            <span className="sub-active__stat-label">Precio mensual</span>
            <span className="sub-active__stat-value">{money(current.price_ars)}</span>
            <span className="sub-active__stat-days">por mes</span>
          </div>
          {current.plan_period_end && (
            <div className="sub-active__stat sub-active__stat--border">
              <span className="sub-active__stat-label">
                {(current.plan_status === "cancelled" || current.pending_plan_id) ? "Acceso hasta" : "Próximo cobro"}
              </span>
              <span className="sub-active__stat-value">{fmtDate(current.plan_period_end)}</span>
              {days !== null && current.plan_status !== "cancelled" && (
                <span className="sub-active__stat-days">en {days} días</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acciones: cambiar plan */}
      <div className="sub-active__section">
        <h3 className="sub-active__section-title">Cambiar de plan</h3>
        <div className="sub-change-grid">
          {plans.filter(p => p.id !== current.plan_id).map(plan => {
            const diff = getDiff(current.plan_id, plan.id);
            const isUpgrade = diff.type === "upgrade";
            const isPending = current.pending_plan_id === plan.id;
            return (
              <div key={plan.id} className={`sub-change-card ${isUpgrade ? "sub-change-card--up" : "sub-change-card--down"} ${isPending ? "sub-change-card--pending" : ""}`}>
                <div className="sub-change-card__top">
                  <div className="sub-change-card__header">
                    <div>
                      <span className="sub-change-card__name">{plan.name}</span>
                      <span className="sub-change-card__price">{money(plan.price_ars)}/mes</span>
                    </div>
                    <div className="sub-change-card__actions">
                      {isPending ? (
                        <span className="sub-change-card__pending-label">
                          Activo el {current.plan_period_end ? fmtDate(current.plan_period_end) : "próximo período"}
                        </span>
                      ) : (
                        <button
                          className={`sub-change-card__btn ${isUpgrade ? "sub-change-card__btn--up" : "sub-change-card__btn--down"}`}
                          onClick={() => onChangePlan(plan.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading && confirmPlan === plan.id
                            ? <Loader2 size={13} className="spin" />
                            : isUpgrade ? "Subir plan" : "Bajar plan"}
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="sub-change-card__features">
                    {diff.items.map(f => (
                      <li key={f} className={isUpgrade ? "sub-change-card__feat--gain" : "sub-change-card__feat--loss"}>
                        {isUpgrade
                          ? <Check size={11} strokeWidth={3} className="sub-feat-icon sub-feat-icon--green" />
                          : <X size={11} strokeWidth={3} className="sub-feat-icon sub-feat-icon--red" />}
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial de pagos */}
      {payments.length > 0 && (
        <div className="sub-active__section">
          <h3 className="sub-active__section-title">Historial de pagos</h3>
          <div className="sub-history__table">
            <div className="sub-history__head">
              <span>Fecha</span>
              <span>Plan</span>
              <span>Monto</span>
              <span>Estado</span>
            </div>
            {payments.map(p => (
              <div key={p.id} className="sub-history__row">
                <span>{fmtDate(p.payment_date)}</span>
                <span>{p.plan_name || p.plan_id || "—"}</span>
                <span>{p.amount ? money(p.amount) : "—"}</span>
                <span className={`sub-pay-status sub-pay-status--${p.status}`}>
                  {p.status === "approved" && "Aprobado"}
                  {p.status === "rejected" && "Rechazado"}
                  {p.status === "cancelled" && "Cancelado"}
                  {!["approved","rejected","cancelled"].includes(p.status) && p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancelar */}
      {(current.plan_status === "active" || current.plan_status === "pending_payment") && (
        <div className="sub-active__cancel">
          <button className="sub-cancel-link" onClick={onCancel}>
            Cancelar suscripción
          </button>
          <p className="sub-active__cancel-note">
            Mantenés el acceso hasta el {current.plan_period_end ? fmtDate(current.plan_period_end) : "fin del período"}.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Vista: período de prueba / sin plan ───────────────────────

function TrialView({ current, plans, onSelect, actionLoading, confirmPlan, msg, setMsg }) {
  const daysLeft = trialDaysLeft(current?.trial_ends_at);

  return (
    <>
      {/* Hero */}
      <section className="sub-hero">
        <div className="sub-hero__body">
          <span className="sub-kicker">Planes Ventaz</span>
          <div className="sub-hero__text">
            <h1 className="sub-hero__title">Elegí tu plan</h1>
            <p className="sub-hero__sub">Comenzá gratis. Cambiá o cancelá cuando quieras.</p>
          </div>
        </div>

        {current?.plan_status === "trial" && (
          <div className="sub-hero__status">
            <div className="sub-hero__status-left">
              <p className="sub-hero__status-label">Tu plan</p>
              <p className="sub-hero__status-plan">{current.plan_name || "Plan Inicial"}</p>
              <StatusBadge status="trial" />
            </div>
            <div className="sub-hero__status-right">
              <span className="sub-trial-countdown__num">{daysLeft}</span>
              <span className="sub-trial-countdown__label">días de prueba restantes</span>
              {current.trial_ends_at && (
                <>
                  <span className="sub-billing-info__label" style={{ marginTop: 8 }}>Prueba hasta</span>
                  <span className="sub-billing-info__date">{fmtDate(current.trial_ends_at)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Mensaje */}
      {msg && (
        <div className={`sub-msg sub-msg--${msg.type}`}>
          {msg.type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}><X size={13} /></button>
        </div>
      )}

      {/* Planes */}
      <section className="sub-plans-section">
        <div className="sub-plans-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={["spc", plan.id === "pro" ? "spc--pro" : "", plan.id === "max" ? "spc--max" : ""].filter(Boolean).join(" ")}
            >
              {plan.id === "pro" && <span className="spc__tag">Más popular</span>}
              <div className="spc__body">
                <h3 className="spc__name">{plan.name}</h3>
                <div className="spc__price-wrap">
                  <span className="spc__price">{money(plan.price_ars)}</span>
                  <span className="spc__per">/mes</span>
                </div>
                <p className="spc__desc">{PLAN_DESC[plan.id] || plan.description}</p>
                <div className="spc__sep" />
                <ul className="spc__features">
                  {(PLAN_HIGHLIGHTS[plan.id] || []).map(f => (
                    <li key={f}><span className="spc__check"><Check size={10} strokeWidth={3} /></span>{f}</li>
                  ))}
                </ul>
              </div>
              <button
                className="spc__btn spc__btn--primary"
                onClick={() => onSelect(plan.id)}
                disabled={actionLoading}
              >
                {actionLoading && confirmPlan === plan.id
                  ? <Loader2 size={15} className="spin" />
                  : `Elegir ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {current?.plan_status === "trial" && (
        <div className="sub-trial-note">
          <Clock size={14} />
          <span>Estás en el período de prueba. Al suscribirte, el cobro se realiza en el momento y tu plan queda activo de inmediato.</span>
        </div>
      )}
    </>
  );
}

// ── Modales ───────────────────────────────────────────────────

function UpgradeModal({ plan, onConfirm, onCancel, loading }) {
  if (!plan) return null;
  return createPortal(
    <div className="sub-overlay" onClick={onCancel}>
      <div className="sub-modal" onClick={e => e.stopPropagation()}>
        <button className="sub-modal__close" onClick={onCancel}><X size={14} /></button>
        <div className="sub-modal__icon sub-modal__icon--green"><CheckCircle2 size={20} /></div>
        <h3>Subir al {plan.name}</h3>
        <p>Vas a ser redirigido a MercadoPago para autorizar el cobro de <strong>{money(plan.price_ars)}/mes</strong>. El cambio es inmediato.</p>
        <div className="sub-modal__actions">
          <button className="sub-mbtn sub-mbtn--ghost" onClick={onCancel}>Volver</button>
          <button className="sub-mbtn sub-mbtn--primary" onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader2 size={14} className="spin" /> Procesando...</> : "Continuar a MercadoPago"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DowngradeModal({ plan, currentPlanId, periodEnd, onConfirm, onCancel, loading }) {
  if (!plan) return null;
  const diff = getDiff(currentPlanId, plan.id);
  return createPortal(
    <div className="sub-overlay" onClick={onCancel}>
      <div className="sub-modal sub-modal--wide" onClick={e => e.stopPropagation()}>
        <button className="sub-modal__close" onClick={onCancel}><X size={14} /></button>
        <div className="sub-modal__icon sub-modal__icon--red"><TrendingDown size={20} /></div>
        <h3>¿Bajar al {plan.name}?</h3>
        <p>
          Tu suscripción actual se mantiene hasta el <strong>{periodEnd ? fmtDate(periodEnd) : "fin del período"}</strong>.
          A partir de esa fecha se te cobrará <strong>{money(plan.price_ars)}/mes</strong>.
        </p>
        {diff.items.length > 0 && (
          <div className="sub-modal__losses">
            <p className="sub-modal__losses-title">Vas a perder acceso a:</p>
            <ul>
              {diff.items.map(f => (
                <li key={f}><X size={11} strokeWidth={3} className="sub-feat-icon sub-feat-icon--red" />{f}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="sub-modal__actions">
          <button className="sub-mbtn sub-mbtn--ghost" onClick={onCancel}>No, quedarme en mi plan</button>
          <button className="sub-mbtn sub-mbtn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader2 size={14} className="spin" /> Procesando...</> : "Sí, bajar el plan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CancelModal({ planName, onConfirm, onCancel, loading }) {
  return createPortal(
    <div className="sub-overlay" onClick={onCancel}>
      <div className="sub-modal" onClick={e => e.stopPropagation()}>
        <button className="sub-modal__close" onClick={onCancel}><X size={14} /></button>
        <div className="sub-modal__icon sub-modal__icon--red"><XCircle size={20} /></div>
        <h3>Cancelar suscripción</h3>
        <p>¿Seguro que querés cancelar el <strong>{planName}</strong>? Mantenés el acceso hasta el final del período pagado.</p>
        <div className="sub-modal__actions">
          <button className="sub-mbtn sub-mbtn--ghost" onClick={onCancel}>No, volver</button>
          <button className="sub-mbtn sub-mbtn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader2 size={14} className="spin" /> Cancelando...</> : "Sí, cancelar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Componente principal ──────────────────────────────────────

export default function Subscription() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [confirmPlan,   setConfirmPlan]   = useState(null);
  const [showCancel,    setShowCancel]    = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [searchParams,  setSearchParams]  = useSearchParams();

  useEffect(() => {
    const fullUrl = window.location.search;
    const preapprovalMatch = fullUrl.match(/preapproval_id=([a-zA-Z0-9]+)/);
    const preapprovalId = preapprovalMatch?.[1];

    if (preapprovalId) {
      setMsg({ type: "ok", text: "¡Suscripción recibida! Activando tu plan..." });
      setSearchParams({}, { replace: true });
      client.post("/seller/subscriptions/link", { preapproval_id: preapprovalId })
        .then(() => client.get("/seller/subscriptions/status"))
        .then(r => { setData(r.data); setMsg({ type: "ok", text: "¡Plan activado correctamente!" }); })
        .catch(() => setMsg({ type: "ok", text: "¡Suscripción autorizada! El plan se actualizará en breve." }));
    }
  }, []);

  useEffect(() => {
    client.get("/seller/subscriptions/status")
      .then(r => setData(r.data))
      .catch(() => setMsg({ type: "err", text: "No se pudo cargar la información de tu plan." }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe() {
    if (!confirmPlan) return;
    setActionLoading(true);
    const currentOrder = getPlanOrder(current?.plan_id);
    const targetOrder  = getPlanOrder(confirmPlan);
    const isDowngrade  = !!(isActive && targetOrder < currentOrder);

    try {
      if (isDowngrade) {
        // Downgrade: aplica al vencer, sin ir a MP
        await client.post("/seller/subscriptions/schedule-downgrade", { plan_id: confirmPlan });
        setMsg({ type: "ok", text: `Tu plan cambiará a ${plans.find(p=>p.id===confirmPlan)?.name} cuando venza el período actual.` });
        setConfirmPlan(null);
        const updated = await client.get("/seller/subscriptions/status");
        setData(updated.data);
      } else {
        const res = await client.post("/seller/subscriptions/subscribe", { plan_id: confirmPlan });
        window.location.href = res.data.init_point;
      }
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Error al cambiar el plan" });
      setConfirmPlan(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      const res = await client.post("/seller/subscriptions/cancel");
      setMsg({ type: "ok", text: res.data.message });
      setShowCancel(false);
      const updated = await client.get("/seller/subscriptions/status");
      setData(updated.data);
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Error al cancelar" });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <main className="sub-page"><div className="sub-loading"><Loader2 size={28} className="spin" /></div></main>;
  }

  const current  = data?.current;
  const plans    = data?.plans || [];
  const payments = data?.payments || [];
  const isActive = current?.plan_status === "active" || current?.plan_status === "cancelled" || current?.plan_status === "pending_payment";
  const isTrial  = current?.plan_status === "trial";
  const isExpired= current?.plan_status === "expired";
  const daysLeft = trialDaysLeft(current?.trial_ends_at);

  // pending_plan_id solo es relevante si el plan está activo/pago
  const hasPending = isActive && !!current?.pending_plan_id;

  function planBtnLabel(plan) {
    if (hasPending && current?.pending_plan_id === plan.id)
      return `Activo el ${fmtDate(current.plan_period_end)}`;
    if (current?.plan_id === plan.id && isActive && !hasPending) return "Tu plan actual";
    if (isTrial || isExpired) return `Activar ${plan.name}`;
    if (getPlanOrder(plan.id) > getPlanOrder(current?.plan_id)) return `Subir a ${plan.name}`;
    return `Bajar a ${plan.name}`;
  }

  function planBtnDisabled(plan) {
    if (actionLoading) return true;
    if (hasPending && current?.pending_plan_id === plan.id) return true;
    if (current?.plan_id === plan.id && isActive && !hasPending) return true;
    return false;
  }

  return (
    <main className="sub-page sub-page--new">

      {/* Trial note — arriba de todo */}
      {isTrial && (
        <div className="sub-trial-note sub-trial-note--top">
          <Clock size={14} />
          <span>Estás en el período de prueba gratuito. Al suscribirte, el cobro se realiza en el momento y tu plan queda activo de inmediato.</span>
        </div>
      )}

      {/* Hero */}
      <section className="sub-hero">
        <div className="sub-hero__body">
          <span className="sub-kicker">Planes Ventaz</span>
          <div className="sub-hero__text">
            <h1 className="sub-hero__title">Planes</h1>
            <p className="sub-hero__sub">Comenzá gratis. Cambiá o cancelá cuando quieras.</p>
          </div>
        </div>
        {current && (
          <div className="sub-hero__status">
            <div className="sub-hero__status-left">
              <span className="sub-hero__status-label">Tu plan</span>
              <span className="sub-hero__status-plan">{current.plan_name || "Plan Inicial"}</span>
              <StatusBadge status={current.plan_status} />
            </div>
            <div className="sub-hero__status-right">
              {isTrial && daysLeft > 0 && <>
                <span className="sub-trial-countdown__num">{daysLeft}</span>
                <span className="sub-trial-countdown__label">días de prueba restantes</span>
                <span className="sub-hero__status-label">Prueba hasta</span>
                <span className="sub-billing-info__date">{fmtDate(current.trial_ends_at)}</span>
              </>}
              {isActive && current.plan_period_end && <>
                <span className="sub-hero__status-label">{current.plan_status === "cancelled" ? "Acceso hasta" : "Próximo cobro"}</span>
                <span className="sub-billing-info__date">{fmtDate(current.plan_period_end)}</span>
              </>}
            </div>
          </div>
        )}
      </section>

      {/* Mensajes */}
      {msg && (
        <div className={`sub-msg sub-msg--${msg.type}`} onClick={() => setMsg(null)}>
          {msg.type === "ok" ? <Check size={15}/> : <AlertTriangle size={15}/>} {msg.text}
        </div>
      )}

      {/* Pending downgrade — solo si el plan está activo/pago */}
      {hasPending && (
        <div className="sub-pending-downgrade">
          Tu plan cambiará a <strong>{plans.find(p=>p.id===current.pending_plan_id)?.name}</strong> el {current.plan_period_end ? fmtDate(current.plan_period_end) : "fin del período"}.
        </div>
      )}

      {/* Cards de planes */}
      <div className="sub-plans-section">
        <div className="sub-plans-grid">
          {plans.map(plan => {
            const isCurrent = current?.plan_id === plan.id && isActive && !hasPending;
            const isPending  = hasPending && current?.pending_plan_id === plan.id;
            const highlights = PLAN_HIGHLIGHTS[plan.id] || [];
            return (
              <div key={plan.id} className={`spc ${plan.id === "pro" ? "spc--pro" : plan.id === "max" ? "spc--max" : ""} ${isCurrent ? "spc--current" : ""}`}>
                {plan.id === "pro" && <span className="spc__tag">Más popular</span>}
                {isPending && <span className="spc__tag spc__tag--pending">Activo el {fmtDate(current.plan_period_end)}</span>}
                <div className="spc__body">
                  <p className="spc__name">{plan.name}</p>
                  <div className="spc__price-wrap">
                    <span className="spc__price">{money(plan.price_ars)}</span>
                    <span className="spc__per">/mes</span>
                  </div>
                  <p className="spc__desc">{plan.description || PLAN_DESC[plan.id] || ""}</p>
                  <div className="spc__sep" />
                  <ul className="spc__features">
                    {highlights.map(f => (
                      <li key={f}><span className="spc__check"><Check size={11}/></span>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="spc__btn-wrap">
                  <button
                    className={`spc__btn ${isCurrent ? "spc__btn--current" : "spc__btn--cta"}`}
                    disabled={planBtnDisabled(plan)}
                    onClick={() => !planBtnDisabled(plan) && setConfirmPlan(plan.id)}
                  >
                    {planBtnLabel(plan)}
                  </button>
                  {isCurrent && (isActive && current.plan_status !== "cancelled") && (
                    <button className="spc__cancel-link" onClick={() => setShowCancel(true)}>
                      Cancelar suscripción
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid de comparación */}
      {plans.length > 0 && <FeatureGrid plans={plans} />}

      {/* Historial de pagos — visible siempre */}
      <div className="sub-payment-history">
        <h3 className="sub-payment-history__title">Historial de pagos</h3>
        {payments.length === 0 ? (
          <p className="sub-payment-history__empty">No hay pagos registrados todavía.</p>
        ) : (
          <div className="sub-history__table">
            <div className="sub-history__head">
              <span>Fecha</span>
              <span>Plan</span>
              <span>Monto</span>
              <span>Estado</span>
            </div>
            {payments.map(p => (
              <div key={p.id} className="sub-history__row">
                <span>{fmtDate(p.payment_date)}</span>
                <span>{p.plan_name || p.plan_id || "—"}</span>
                <span>{p.amount ? money(p.amount) : "—"}</span>
                <span className={`sub-pay-status sub-pay-status--${p.status}`}>
                  {p.status === "approved"  && "Aprobado"}
                  {p.status === "rejected"  && "Rechazado"}
                  {p.status === "cancelled" && "Cancelado"}
                  {!["approved","rejected","cancelled"].includes(p.status) && p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmPlan && !isActive && (
        <UpgradeModal
          plan={plans.find(p => p.id === confirmPlan)}
          onConfirm={handleSubscribe}
          onCancel={() => setConfirmPlan(null)}
          loading={actionLoading}
        />
      )}
      {confirmPlan && isActive && getPlanOrder(confirmPlan) > getPlanOrder(current?.plan_id) && (
        <UpgradeModal
          plan={plans.find(p => p.id === confirmPlan)}
          onConfirm={handleSubscribe}
          onCancel={() => setConfirmPlan(null)}
          loading={actionLoading}
        />
      )}
      {confirmPlan && isActive && getPlanOrder(confirmPlan) < getPlanOrder(current?.plan_id) && (
        <DowngradeModal
          plan={plans.find(p => p.id === confirmPlan)}
          currentPlanId={current?.plan_id}
          periodEnd={current?.plan_period_end}
          onConfirm={handleSubscribe}
          onCancel={() => setConfirmPlan(null)}
          loading={actionLoading}
        />
      )}
      {showCancel && (
        <CancelModal
          planName={current?.plan_name}
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
          loading={actionLoading}
        />
      )}
    </main>
  );
}
