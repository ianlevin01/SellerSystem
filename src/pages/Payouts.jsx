// src/pages/Payouts.jsx

import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import "../styles/Payouts.css";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function money(n) {
  return `$${fmt(n)}`;
}

function dateFmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function maskCvu(cvu) {
  if (!cvu || cvu.length < 6) return cvu;
  return `${cvu.slice(0, 4)} •••• •••• •••• ${cvu.slice(-4)}`;
}

function CvuStatusBadge({ verified }) {
  if (verified === null || verified === undefined) return null;
  if (verified) {
    return (
      <span className="vtz-payouts-badge vtz-payouts-badge--green">
        <BadgeCheck size={13} /> Verificado
      </span>
    );
  }
  return (
    <span className="vtz-payouts-badge vtz-payouts-badge--amber">
      <Clock3 size={13} /> Pendiente de verificación
    </span>
  );
}

function PayoutStatusBadge({ status }) {
  if (status === "transferido") {
    return (
      <span className="vtz-payouts-badge vtz-payouts-badge--green">
        <CheckCircle2 size={13} /> Transferido
      </span>
    );
  }
  return (
    <span className="vtz-payouts-badge vtz-payouts-badge--amber">
      <Clock3 size={13} /> En proceso
    </span>
  );
}

export default function Payouts() {
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);

  // CVU form
  const [cvu, setCvu]                 = useState("");
  const [alias, setAlias]             = useState("");
  const [holderName, setHolderName]   = useState("");
  const [cvuLoading, setCvuLoading]   = useState(false);
  const [cvuMsg, setCvuMsg]           = useState(null);

  // Transfer
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferMsg, setTransferMsg]          = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/seller/payouts/summary");
      setSummary(data);
      if (data.cvu_info?.cvu) {
        setCvu(data.cvu_info.cvu);
        setAlias(data.cvu_info.cvu_alias || "");
        setHolderName(data.cvu_info.cvu_holder_name || "");
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveCvu(e) {
    e.preventDefault();
    setCvuMsg(null);
    setCvuLoading(true);
    try {
      const { data } = await client.put("/seller/payouts/cvu", { cvu, alias, holderName });
      setCvuMsg({
        type: data.verified ? "success" : "info",
        text: data.verified
          ? "CVU verificado correctamente."
          : "CVU guardado. Vamos a verificarlo manualmente en las próximas horas.",
      });
      await load();
    } catch (err) {
      setCvuMsg({ type: "error", text: err.response?.data?.message || "Error al guardar el CVU" });
    } finally {
      setCvuLoading(false);
    }
  }

  async function handleTransfer() {
    setTransferMsg(null);
    setTransferLoading(true);
    try {
      await client.post("/seller/payouts/request");
      setTransferConfirm(false);
      setTransferMsg({ type: "success", text: "Solicitud enviada. Vamos a transferirte en las próximas horas." });
      await load();
    } catch (err) {
      setTransferMsg({ type: "error", text: err.response?.data?.message || "Error al solicitar la transferencia" });
    } finally {
      setTransferLoading(false);
    }
  }

  const cvuInfo        = summary?.cvu_info;
  const pendingTotal   = summary?.pending?.total  || 0;
  const availableTotal = summary?.available?.total || 0;
  const canTransfer    = cvuInfo?.cvu_verified && availableTotal > 0;

  if (loading) {
    return (
      <div className="vtz-payouts">
        <div className="vtz-payouts-loading">
          <Loader2 size={22} className="vtz-payouts-spin" />
          Cargando cobros...
        </div>
      </div>
    );
  }

  return (
    <div className="vtz-payouts">
      {/* Hero */}
      <div className="vtz-payouts-hero">
        <div className="vtz-payouts-hero__glow" />
        <div className="vtz-payouts-hero__content">
          <div className="vtz-payouts-hero__label">
            <Wallet size={15} /> Mis cobros
          </div>
          <h1>Tus ganancias</h1>
          <p>Registrá tu CVU, seguí tu saldo y solicitá transferencias.</p>
        </div>
        <div className="vtz-payouts-hero__amounts">
          <div className="vtz-payouts-hero__amount">
            <span>Pendiente</span>
            <strong>{money(pendingTotal)}</strong>
          </div>
          <div className="vtz-payouts-hero__amount vtz-payouts-hero__amount--available">
            <span>Disponible</span>
            <strong>{money(availableTotal)}</strong>
          </div>
        </div>
      </div>

      <div className="vtz-payouts-grid">
        {/* CVU */}
        <section className="vtz-payouts-card">
          <div className="vtz-payouts-card__head">
            <LockKeyhole size={17} />
            <h2>Datos bancarios</h2>
            {cvuInfo?.cvu && <CvuStatusBadge verified={cvuInfo.cvu_verified} />}
          </div>
          <p className="vtz-payouts-card__desc">
            Ingresá tu CVU o CBU para recibir transferencias. Verificamos que los datos sean correctos antes de habilitar el cobro.
          </p>

          <form className="vtz-payouts-cvu-form" onSubmit={handleSaveCvu}>
            <div className="vtz-payouts-field">
              <label>CVU / CBU <span>22 dígitos</span></label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={22}
                placeholder="0000000000000000000000"
                value={cvu}
                onChange={e => setCvu(e.target.value.replace(/\D/g, "").slice(0, 22))}
                required
              />
            </div>
            <div className="vtz-payouts-field">
              <label>Nombre titular <span>tal como aparece en tu cuenta</span></label>
              <input
                type="text"
                placeholder="Ej: Juan García"
                value={holderName}
                onChange={e => setHolderName(e.target.value)}
              />
            </div>
            <div className="vtz-payouts-field">
              <label>Alias <span>opcional</span></label>
              <input
                type="text"
                placeholder="Ej: juan.garcia.mp"
                value={alias}
                onChange={e => setAlias(e.target.value)}
              />
            </div>

            {cvuMsg && (
              <div className={`vtz-payouts-msg vtz-payouts-msg--${cvuMsg.type}`}>
                {cvuMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {cvuMsg.text}
              </div>
            )}

            <button type="submit" className="vtz-payouts-btn" disabled={cvuLoading || cvu.length !== 22}>
              {cvuLoading ? <><Loader2 size={16} className="vtz-payouts-spin" /> Guardando...</> : <>Guardar CVU <ArrowRight size={16} /></>}
            </button>
          </form>
        </section>

        {/* Saldo */}
        <div className="vtz-payouts-balances">
          {/* Pendiente de aprobación */}
          <section className="vtz-payouts-card vtz-payouts-card--pending">
            <div className="vtz-payouts-card__head">
              <Clock3 size={17} />
              <h2>Pendiente de aprobación</h2>
              <strong className="vtz-payouts-card__total">{money(pendingTotal)}</strong>
            </div>
            <p className="vtz-payouts-card__desc">
              Estamos verificando estos pedidos antes de acreditarlos.
            </p>
            {summary?.pending?.orders?.length > 0 ? (
              <ul className="vtz-payouts-orders">
                {summary.pending.orders.map(o => (
                  <li key={o.id}>
                    <span className="vtz-payouts-orders__num">#{o.order_numero}</span>
                    <span className="vtz-payouts-orders__date">{dateFmt(o.order_date)}</span>
                    <span className="vtz-payouts-orders__amount">{money(o.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vtz-payouts-empty">No hay ganancias pendientes.</p>
            )}
          </section>

          {/* Disponible */}
          <section className="vtz-payouts-card vtz-payouts-card--available">
            <div className="vtz-payouts-card__head">
              <Banknote size={17} />
              <h2>Disponible para transferir</h2>
              <strong className="vtz-payouts-card__total">{money(availableTotal)}</strong>
            </div>
            {summary?.available?.orders?.length > 0 ? (
              <ul className="vtz-payouts-orders">
                {summary.available.orders.map(o => (
                  <li key={o.id}>
                    <span className="vtz-payouts-orders__num">#{o.order_numero}</span>
                    <span className="vtz-payouts-orders__date">{dateFmt(o.order_date)}</span>
                    <span className="vtz-payouts-orders__amount">{money(o.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vtz-payouts-empty">No hay saldo disponible aún.</p>
            )}

            {transferMsg && (
              <div className={`vtz-payouts-msg vtz-payouts-msg--${transferMsg.type}`}>
                {transferMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {transferMsg.text}
              </div>
            )}

            {!canTransfer && availableTotal > 0 && !cvuInfo?.cvu_verified && (
              <div className="vtz-payouts-msg vtz-payouts-msg--info">
                <ShieldCheck size={15} />
                Tu CVU todavía no fue verificado. En cuanto lo aprobemos vas a poder transferirte.
              </div>
            )}

            {!transferConfirm ? (
              <button
                className="vtz-payouts-btn vtz-payouts-btn--green"
                disabled={!canTransfer}
                onClick={() => setTransferConfirm(true)}
              >
                <Banknote size={16} />
                Transferir {money(availableTotal)}
                {cvuInfo?.cvu && ` a ${maskCvu(cvuInfo.cvu)}`}
              </button>
            ) : (
              <div className="vtz-payouts-confirm">
                <p>¿Confirmás la transferencia de <strong>{money(availableTotal)}</strong> a tu CVU?</p>
                <div className="vtz-payouts-confirm__actions">
                  <button
                    className="vtz-payouts-btn vtz-payouts-btn--green"
                    onClick={handleTransfer}
                    disabled={transferLoading}
                  >
                    {transferLoading
                      ? <><Loader2 size={16} className="vtz-payouts-spin" /> Enviando...</>
                      : <><CheckCircle2 size={16} /> Confirmar</>}
                  </button>
                  <button
                    className="vtz-payouts-btn vtz-payouts-btn--ghost"
                    onClick={() => setTransferConfirm(false)}
                    disabled={transferLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Historial */}
      <section className="vtz-payouts-card vtz-payouts-history">
        <div className="vtz-payouts-card__head">
          <Wallet size={17} />
          <h2>Historial de cobros</h2>
        </div>

        {summary?.payouts?.length > 0 ? (
          <div className="vtz-payouts-history-table">
            <div className="vtz-payouts-history-table__header">
              <span>Fecha</span>
              <span>Monto</span>
              <span>CVU</span>
              <span>Estado</span>
            </div>
            {summary.payouts.map(p => (
              <div key={p.id} className="vtz-payouts-history-table__row">
                <span>{dateFmt(p.created_at)}</span>
                <span className="vtz-payouts-history-table__amount">{money(p.amount)}</span>
                <span className="vtz-payouts-history-table__cvu">{maskCvu(p.cvu)}</span>
                <span><PayoutStatusBadge status={p.status} /></span>
              </div>
            ))}
          </div>
        ) : (
          <p className="vtz-payouts-empty">Todavía no solicitaste ninguna transferencia.</p>
        )}
      </section>
    </div>
  );
}
