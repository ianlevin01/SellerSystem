// src/pages/Payouts.jsx

import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import "../styles/Payouts.css";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  HelpCircle,
  Loader2,
  LockKeyhole,
  Sparkles,
  Wallet,
} from "lucide-react";

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function money(n) { return `$${fmt(n)}`; }
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

export default function Payouts() {
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [cvuOpen, setCvuOpen]     = useState(false);

  const [cvu, setCvu]             = useState("");
  const [alias, setAlias]         = useState("");
  const [holderName, setHolderName] = useState("");
  const [cvuLoading, setCvuLoading] = useState(false);
  const [cvuMsg, setCvuMsg]       = useState(null);

  const [transferLoading, setTransferLoading] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferMsg, setTransferMsg]         = useState(null);

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
          ? "CVU verificado y listo para cobrar."
          : "CVU guardado. Lo vamos a verificar en las próximas horas.",
      });
      await load();
      if (!data.verified) setCvuOpen(false);
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
  const cvuConfigured  = !!cvuInfo?.cvu;
  const cvuVerified    = !!cvuInfo?.cvu_verified;
  const canTransfer    = cvuVerified && availableTotal > 0;

  if (loading) {
    return (
      <main className="vtz-payouts">
        <div className="vtz-payouts-loading">
          <Loader2 size={22} className="vtz-spin" /> Cargando cobros...
        </div>
      </main>
    );
  }

  return (
    <main className="vtz-payouts">

      {/* ── Hero ── */}
      <section className="vtz-payouts-hero">
        <div className="vtz-payouts-hero__left">
          <span className="vtz-payouts-kicker"><Sparkles size={14} /> Mis cobros</span>
          <h1>Tus ganancias</h1>
          <p>Seguí tu saldo y solicitá transferencias a tu cuenta cuando estés listo.</p>
        </div>
        <div className="vtz-payouts-hero__amounts">
          <div className="vtz-payouts-hero__amount">
            <span>Saldo pendiente</span>
            <strong>{money(pendingTotal)}</strong>
          </div>
          <div className="vtz-payouts-hero__amount vtz-payouts-hero__amount--available">
            <span>Disponible</span>
            <strong>{money(availableTotal)}</strong>
          </div>
        </div>
      </section>

      {/* ── Banner CVU ── */}
      {!cvuVerified && (
        <div className={`vtz-payouts-cvu-banner ${cvuConfigured ? "is-pending" : "is-missing"}`}>
          <LockKeyhole size={15} />
          {cvuConfigured ? (
            <span>Tu CVU está <strong>pendiente de verificación</strong>. En las próximas horas lo revisamos y habilitamos tus cobros.</span>
          ) : (
            <span><strong>Configurá tu CVU o CBU</strong> para poder recibir transferencias.</span>
          )}
          {!cvuConfigured && (
            <button
              className="vtz-payouts-cvu-banner__btn"
              onClick={() => setCvuOpen(v => !v)}
            >
              {cvuOpen ? "Cerrar" : "Configurar"}
              <ChevronDown size={14} className={cvuOpen ? "is-up" : ""} />
            </button>
          )}
        </div>
      )}

      {/* ── Formulario CVU (desplegable) ── */}
      {cvuOpen && !cvuConfigured && (
        <div className="vtz-payouts-cvu-wrap">
          <form className="vtz-payouts-cvu-form" onSubmit={handleSaveCvu}>
            <div className="vtz-payouts-cvu-form__grid">
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
                <label>Nombre titular <span>como aparece en tu cuenta</span></label>
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
            </div>

            {cvuMsg && (
              <div className={`vtz-payouts-msg vtz-payouts-msg--${cvuMsg.type}`}>
                {cvuMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {cvuMsg.text}
              </div>
            )}

            <button type="submit" className="vtz-payouts-submit" disabled={cvuLoading || cvu.length !== 22}>
              {cvuLoading
                ? <><Loader2 size={15} className="vtz-spin" /> Guardando...</>
                : <>Guardar CVU <ArrowRight size={15} /></>}
            </button>
          </form>
        </div>
      )}

      {/* ── Grid de balances ── */}
      <div className="vtz-payouts-grid">

        {/* Saldo no disponible */}
        <section className="vtz-payouts-card vtz-payouts-card--locked" style={{ animationDelay: "60ms" }}>
          <div className="vtz-payouts-card__head">
            <Clock3 size={15} />
            <h2>Saldo pendiente</h2>
            <div className="vtz-tip-wrap">
              <HelpCircle size={14} className="vtz-tip-icon" />
              <div className="vtz-tip">
                Tus ganancias están en período de retención según tu plan. Pasada la fecha indicada quedan disponibles para transferir.
              </div>
            </div>
            <strong className="vtz-payouts-card__total">{money(pendingTotal)}</strong>
          </div>

          {summary?.pending?.orders?.length > 0 ? (
            <ul className="vtz-payouts-orders">
              {summary.pending.orders.map(o => (
                <li key={o.id}>
                  <span className="vtz-payouts-orders__num">#{o.order_numero}</span>
                  <span className="vtz-payouts-orders__date vtz-payouts-orders__date--release">
                    <Clock3 size={10} /> Se libera el {dateFmt(o.available_at)}
                  </span>
                  <span className="vtz-payouts-orders__earn">{money(o.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vtz-payouts-empty">No hay ganancias en revisión.</p>
          )}
        </section>

        {/* Disponible */}
        <section className="vtz-payouts-card vtz-payouts-card--available" style={{ animationDelay: "120ms" }}>
          <div className="vtz-payouts-card__head">
            <Banknote size={15} />
            <h2>Disponible para transferir</h2>
            <strong className="vtz-payouts-card__total vtz-payouts-card__total--green">{money(availableTotal)}</strong>
          </div>

          {summary?.available?.orders?.length > 0 ? (
            <ul className="vtz-payouts-orders">
              {summary.available.orders.map(o => (
                <li key={o.id}>
                  <span className="vtz-payouts-orders__num">#{o.order_numero}</span>
                  <span className="vtz-payouts-orders__date">{dateFmt(o.order_date)}</span>
                  <span className="vtz-payouts-orders__earn">{money(o.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vtz-payouts-empty">No hay saldo disponible aún.</p>
          )}

          {transferMsg && (
            <div className={`vtz-payouts-msg vtz-payouts-msg--${transferMsg.type}`}>
              {transferMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {transferMsg.text}
            </div>
          )}

          {!canTransfer && availableTotal > 0 && !cvuVerified && (
            <div className="vtz-payouts-msg vtz-payouts-msg--info">
              <LockKeyhole size={14} />
              Tu CVU todavía no fue verificado. En cuanto lo aprobemos podés transferirte.
            </div>
          )}

          {!transferConfirm ? (
            <button
              className="vtz-payouts-transfer-btn"
              disabled={!canTransfer}
              onClick={() => setTransferConfirm(true)}
            >
              <CircleDollarSign size={17} />
              <span>Transferir {money(availableTotal)}</span>
              {cvuInfo?.cvu && <span className="vtz-payouts-transfer-btn__cvu">{maskCvu(cvuInfo.cvu)}</span>}
            </button>
          ) : (
            <div className="vtz-payouts-confirm">
              <p>¿Confirmás la transferencia de <strong>{money(availableTotal)}</strong>?</p>
              <div className="vtz-payouts-confirm__actions">
                <button
                  className="vtz-payouts-submit vtz-payouts-submit--green"
                  onClick={handleTransfer}
                  disabled={transferLoading}
                >
                  {transferLoading
                    ? <><Loader2 size={15} className="vtz-spin" /> Enviando...</>
                    : <><CheckCircle2 size={15} /> Confirmar</>}
                </button>
                <button
                  className="vtz-payouts-submit vtz-payouts-submit--ghost"
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

      {/* ── Historial ── */}
      <section className="vtz-payouts-card vtz-payouts-history" style={{ animationDelay: "180ms" }}>
        <div className="vtz-payouts-card__head">
          <Wallet size={15} />
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
                <span>
                  {p.status === "transferido"
                    ? <span className="vtz-badge vtz-badge--green"><CheckCircle2 size={11} /> Transferido</span>
                    : <span className="vtz-badge vtz-badge--amber" style={{ position: "relative" }}>
                        <Clock3 size={11} /> En proceso
                        <span className="vtz-payout-pending-tip">
                          <HelpCircle size={11} />
                          <span className="vtz-payout-pending-tip__text">Los cobros pueden demorar hasta 24hs hábiles</span>
                        </span>
                      </span>
                  }
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="vtz-payouts-history-empty">
            <Wallet size={30} />
            <p>Todavía no solicitaste ninguna transferencia.</p>
          </div>
        )}
      </section>
    </main>
  );
}
