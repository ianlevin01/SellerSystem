import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  ExternalLink, Unlink, Loader2, CreditCard, Wallet, Plus, X,
  AlertTriangle, Search, Megaphone, MoreVertical, LayoutGrid, PauseCircle,
  ShoppingBag, TrendingUp, CheckCircle2, Ban, ArrowRight, Eye, Pencil, SlidersHorizontal,
  Layers, ChevronDown, ChevronRight, ListChecks, ImageIcon, Type, Sparkles, FileText, Tag, Link2,
} from "lucide-react";
import client from "../api/client";
import PageProducts from "./PageProducts";
import { Modal, AttributeField, IconBadge, WizardProgress, AddressBlockNotice } from "./ml/mlShared";
import { FREE_SHIPPING_MANDATORY_THRESHOLD_MLA } from "./ml/mlUtils";
import ImageOrderPicker from "./ml/ImageOrderPicker";
import PublishVariantsModal from "./ml/PublishVariantsModal";
import PriceStep from "./ml/PriceStep";
import LinkListingModal from "./ml/LinkListingModal";
import { usePublishSession } from "./ml/PublishSessionContext";

const ML_SITE_NAMES = {
  MLA: "Argentina", MLB: "Brasil", MLM: "México",
  MCO: "Colombia",  MLC: "Chile",  MLU: "Uruguay",
};

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

// ── Conexión con Mercado Libre ──────────────────────────────────

function MercadoLibreConnection({ status, summary, scrolled, onConnected, onDisconnected }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ml_connected")) { window.history.replaceState({}, "", window.location.pathname); onConnected(); }
    if (params.get("ml_error")) {
      setError("No se pudo conectar con Mercado Libre. Intentá de nuevo.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function connect() {
    setConnecting(true); setError("");
    try {
      const r = await client.get("/seller/ml/connect");
      window.location.href = r.data.url;
    } catch {
      setError("No se pudo iniciar la conexión. Intentá de nuevo.");
      setConnecting(false);
    }
  }

  async function disconnect() {
    try {
      await client.delete("/seller/ml/disconnect");
      onDisconnected();
    } catch {
      setError("No se pudo desconectar.");
    }
  }

  // No conectado todavía: mantenemos el banner grande, acá sí hace falta explicar y convencer.
  if (!status?.connected) {
    return (
      <div className="card ml-connection-banner" style={{ padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%", background: "#FFE600", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 6,
          }}>
            <img src="/mercadolibre-logo.png" alt="Mercado Libre" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: "1rem", display: "block", marginBottom: 4 }}>Mercado Libre</span>
            <p style={{ margin: "0 0 14px", fontSize: ".875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Conectá tu cuenta de Mercado Libre para publicar tu catálogo y gestionar tus ventas desde Ventaz.
            </p>
            {error && <p style={{ margin: "0 0 12px", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{error}</p>}
            <button type="button" onClick={connect} disabled={connecting}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 9, border: "1px solid #FFE600", background: "#FFE600",
                color: "#2D3277", fontSize: ".82rem", fontWeight: 700, cursor: "pointer" }}>
              {connecting ? <><Loader2 size={13} className="spin" /> Redirigiendo...</> : <><ExternalLink size={13} /> Conectar Mercado Libre</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conectado: primera fila del encabezado sticky — logo, cuenta conectada, métricas clave
  // a la derecha. Se achica (64→48px) y pierde país/última venta cuando scrolled=true, para
  // ganar altura de contenido sin perder la navegación de abajo (ver componente raíz).
  return (
    <div className="ml-header__row" style={{
      display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
      minHeight: scrolled ? 48 : 64, transition: "min-height .18s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: scrolled ? 24 : 30, height: scrolled ? 24 : 30, borderRadius: "50%", background: "#FFE600", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 4,
          transition: "width .18s ease, height .18s ease",
        }}>
          <img src="/mercadolibre-logo.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
        </div>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".86rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", flexShrink: 0 }} title="Conectado" />
            {status.ml_nickname || "—"}
          </span>
          {!scrolled && (
            <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {ML_SITE_NAMES[status.site_id] || status.site_id}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", flex: 1, justifyContent: "flex-end", fontSize: ".78rem" }}>
        <StatChip icon={CheckCircle2} color="var(--success,#059669)" label="Activas" value={summary?.active_count ?? "—"} />
        <StatChip icon={PauseCircle} color="var(--text-secondary)" label="Pausadas" value={summary?.paused_count ?? "—"} />
        {Number(summary?.error_count) > 0 && (
          <StatChip icon={AlertTriangle} color="var(--danger,#ef4444)" label="Con error" value={summary.error_count} />
        )}
        <StatChip icon={TrendingUp} label="Ventas hoy" value={summary?.sales_today ?? "—"} />
        {!scrolled && (
          <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            Última venta: {summary?.last_sale_at ? new Date(summary.last_sale_at).toLocaleDateString("es-AR") : "—"}
          </span>
        )}
      </div>

      {error && <p style={{ margin: 0, fontSize: ".78rem", color: "var(--danger,#ef4444)" }}>{error}</p>}

      <div ref={menuRef} style={{ position: "relative" }}>
        <button type="button" onClick={() => setMenuOpen(o => !o)}
          className={`ml-header__menu-btn${menuOpen ? " is-open" : ""}`}
          aria-label="Opciones de la cuenta">
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid var(--border)",
            borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,.14)", zIndex: 10, minWidth: 180, overflow: "hidden", padding: 4 }}>
            <button type="button" onClick={disconnect}
              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 12px", background: "none", border: "none",
                borderRadius: 8, cursor: "pointer", fontSize: ".84rem", fontWeight: 600, color: "var(--danger,#ef4444)", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <Unlink size={14} /> Desconectar cuenta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ icon, color, label, value }) {
  const Icon = icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: color || "var(--text)" }}>
      <Icon size={13} />
      <strong>{value}</strong>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );
}

// ── SDK de MercadoPago — se recrea desde cero en cada intento fallido para evitar que
// quede en un estado roto (el síntoma reportado: reintentar sin recargar la página no manda
// la consulta — forzamos un script fresco en vez de reutilizar el mismo). ──

function useMpSdk() {
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const existing = document.getElementById("mp-sdk-script");
    if (existing) existing.remove();
    try { delete window.MercadoPago; } catch { window.MercadoPago = undefined; }

    const script = document.createElement("script");
    script.id = "mp-sdk-script";
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = () => { if (!cancelled) setReady(true); };
    script.onerror = () => { if (!cancelled) setReady(false); };
    document.body.appendChild(script);

    return () => { cancelled = true; };
  }, [reloadKey]);

  return { ready, reload: () => { setReady(false); setReloadKey(k => k + 1); } };
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// ── Validación de tarjeta (formato) ──────────────────────────────

function luhnValid(numberStr) {
  const digits = numberStr.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function validateCardForm(form) {
  const errors = {};
  if (!luhnValid(form.number)) errors.number = "Número de tarjeta inválido";
  if (!form.name.trim()) errors.name = "Requerido";

  const month = Number(form.month), year = Number(form.year);
  const now = new Date();
  const currentYear = now.getFullYear(), currentMonth = now.getMonth() + 1;
  if (!month || month < 1 || month > 12) errors.month = "Mes inválido";
  else if (!year || year < currentYear || (year === currentYear && month < currentMonth)) errors.month = "Tarjeta vencida";

  if (!/^\d{3,4}$/.test(form.cvv)) errors.cvv = "CVV inválido";
  if (!/^\d{6,9}$/.test(form.docNumber)) errors.docNumber = "DNI inválido";
  return errors;
}

function fieldStyle(hasError) {
  return { borderColor: hasError ? "var(--danger,#ef4444)" : undefined };
}

// ── Detección de marca de tarjeta por BIN (primeros dígitos) ─────

function detectCardBrand(numberStr) {
  const digits = numberStr.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2(22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720))/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  if (/^(30[0-5]|36|38)/.test(digits)) return "diners";
  return null;
}

const BRAND_STYLES = {
  visa:       { bg: "#1a1f71", label: "VISA", italic: true },
  amex:       { bg: "#2e77bc", label: "AMEX" },
  discover:   { bg: "#ff6000", label: "Discover" },
  diners:     { bg: "#0079be", label: "Diners" },
};

function CardBrandBadge({ brand }) {
  if (!brand) return null;
  if (brand === "mastercard") {
    return (
      <svg width="30" height="19" viewBox="0 0 30 19" aria-label="Mastercard">
        <circle cx="12" cy="9.5" r="9" fill="#EB001B" />
        <circle cx="18" cy="9.5" r="9" fill="#F79E1B" opacity=".85" />
      </svg>
    );
  }
  const s = BRAND_STYLES[brand];
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 5,
      background: s.bg, color: "#fff", fontSize: ".68rem", fontWeight: 800, letterSpacing: ".02em",
      fontStyle: s.italic ? "italic" : "normal", whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ── Modal de tarjeta ──────────────────────────────────────────────

function CardModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ number: "", name: "", month: "", year: "", cvv: "", docNumber: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const { ready: mpReady, reload: reloadMpSdk } = useMpSdk();

  // Siempre arranca con un SDK fresco al abrir el modal.
  useEffect(() => { reloadMpSdk(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(key, value) {
    setForm(p => ({ ...p, [key]: value }));
    setFieldErrors(p => ({ ...p, [key]: undefined }));
  }

  async function saveCard(e) {
    e.preventDefault();
    const errors = validateCardForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!mpReady || !MP_PUBLIC_KEY) { setMsg("Mercado Pago todavía no cargó. Esperá un segundo y probá de nuevo."); return; }
    setSaving(true); setMsg("");
    try {
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "es-AR" });
      const tokenRes = await withTimeout(
        mp.createCardToken({
          cardNumber: form.number.replace(/\s/g, ""),
          cardholderName: form.name,
          cardExpirationMonth: form.month,
          cardExpirationYear: form.year,
          securityCode: form.cvv,
          identificationType: "DNI",
          identificationNumber: form.docNumber,
        }),
        15000,
        "Mercado Pago no respondió a tiempo. Probá de nuevo."
      );
      if (!tokenRes?.id) {
        throw new Error(tokenRes?.message || tokenRes?.cause?.[0]?.description || "MercadoPago no devolvió un token válido");
      }
      await client.post("/seller/ml/wallet/card", { card_token: tokenRes.id });
      onSaved();
    } catch (err) {
      console.error("[ml wallet] error guardando tarjeta:", err);
      setMsg(err.response?.data?.message || err.message || "No se pudo guardar la tarjeta. Revisá los datos.");
      reloadMpSdk(); // arranca el próximo intento con un SDK completamente fresco
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Guardar tarjeta" onClose={onClose}>
      <p style={{ margin: "0 0 16px", fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Al guardar, hacemos una verificación real contra el banco (una autorización mínima que
        se cancela en el acto) para confirmar que la tarjeta es válida — no se te cobra nada.
      </p>
      <form onSubmit={saveCard} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ position: "relative" }}>
            <input className="form-input" style={{ ...fieldStyle(fieldErrors.number), paddingRight: 44 }} placeholder="Número de tarjeta"
              value={form.number} onChange={e => setField("number", e.target.value)} inputMode="numeric" />
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
              <CardBrandBadge brand={detectCardBrand(form.number)} />
            </div>
          </div>
          {fieldErrors.number && <small style={{ color: "var(--danger,#ef4444)" }}>{fieldErrors.number}</small>}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <input className="form-input" style={fieldStyle(fieldErrors.name)} placeholder="Nombre del titular (como figura en la tarjeta)"
            value={form.name} onChange={e => setField("name", e.target.value)} />
          {fieldErrors.name && <small style={{ color: "var(--danger,#ef4444)" }}>{fieldErrors.name}</small>}
        </div>
        <div>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="form-input" style={fieldStyle(fieldErrors.month)} placeholder="MM" maxLength={2}
              value={form.month} onChange={e => setField("month", e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
            <input className="form-input" style={fieldStyle(fieldErrors.month)} placeholder="AAAA" maxLength={4}
              value={form.year} onChange={e => setField("year", e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
          </div>
          {fieldErrors.month && <small style={{ color: "var(--danger,#ef4444)" }}>{fieldErrors.month}</small>}
        </div>
        <div>
          <input className="form-input" style={fieldStyle(fieldErrors.cvv)} placeholder="CVV" maxLength={4}
            value={form.cvv} onChange={e => setField("cvv", e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
          {fieldErrors.cvv && <small style={{ color: "var(--danger,#ef4444)" }}>{fieldErrors.cvv}</small>}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <input className="form-input" style={fieldStyle(fieldErrors.docNumber)} placeholder="DNI del titular"
            value={form.docNumber} onChange={e => setField("docNumber", e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
          {fieldErrors.docNumber && <small style={{ color: "var(--danger,#ef4444)" }}>{fieldErrors.docNumber}</small>}
        </div>

        {msg && <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{msg}</p>}

        <button type="submit" className="btn btn--primary" style={{ gridColumn: "1 / -1", marginTop: 6 }} disabled={saving}>
          {saving ? <><Loader2 size={14} className="spin" /> Verificando...</> : <><CreditCard size={14} /> Guardar tarjeta</>}
        </button>
      </form>
    </Modal>
  );
}

// ── Modal de carga de saldo ───────────────────────────────────────

function AddBalanceModal({ wallet, onClose, onCharged }) {
  const [amount, setAmount] = useState("");
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState("");

  async function charge() {
    const n = Number(amount);
    if (!n || n <= 0) { setError("Ingresá un monto válido"); return; }
    setCharging(true); setError("");
    try {
      await client.post("/seller/ml/wallet/topup", { amount: n });
      onCharged();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar el saldo.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <Modal title="Cargar saldo" onClose={onClose}>
      <p style={{ margin: "0 0 16px", fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        El monto que ingreses se cobra ahora mismo a tu tarjeta guardada y queda disponible como saldo
        para descontar de futuras ventas de Mercado Libre.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
        background: "var(--surface-2,#f9fafb)", borderRadius: 9, marginBottom: 16 }}>
        <CreditCard size={16} />
        <span style={{ fontSize: ".85rem", fontWeight: 600 }}>Tarjeta terminada en {wallet.lastFour}</span>
      </div>

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Monto a cargar</label>
      <input className="form-input" type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)}
        placeholder="$0" style={{ marginBottom: 12 }} />

      {error && <p style={{ margin: "0 0 12px", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{error}</p>}

      <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={charge} disabled={charging}>
        {charging ? <Loader2 size={14} className="spin" /> : <><Plus size={14} /> Cargar saldo</>}
      </button>
    </Modal>
  );
}

// ── Wallet: saldo + deuda pendiente + estado de tarjeta ──────────

// El corte diario corre a las 17:00 UTC (14:00 ART) — ver HORA_CORTE_UTC en
// mlDailyChargeJob.js del backend. Se calcula acá nomás para mostrar la próxima fecha,
// sin necesitar un endpoint nuevo.
function nextChargeLabel() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(17, 0, 0, 0);
  const isToday = next > now;
  if (!isToday) next.setUTCDate(next.getUTCDate() + 1);
  return `${isToday ? "Hoy" : "Mañana"} a las 14:00 hs`;
}

const TX_LABELS = {
  topup:     "Carga de saldo",
  sale_cost: "Costo de ventas de Mercado Libre",
  refund:    "Reembolso por devolución",
};

const CHARGE_KIND_LABELS = {
  mandatory: "Cobro obligatorio",
  optional:  "Cobro adicional",
  manual:    "Pago manual",
  topup:     "Carga de saldo",
};

// Un solo listado: movimientos de plata reales (cargas, cobros exitosos) + intentos de cobro
// que fallaron (nunca mueven plata, pero el vendedor necesita verlos igual, con el motivo).
function WalletHistory() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    client.get("/seller/ml/wallet/history").then(r => setHistory(r.data || [])).catch(() => setHistory([]));
  }, []);

  if (history === null) {
    return <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", padding: "12px 0" }}>Cargando historial...</p>;
  }
  if (history.length === 0) {
    return <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", padding: "12px 0" }}>Todavía no hay movimientos.</p>;
  }

  return (
    <div className="ml-wallet-history">
      <div className="ml-wallet-history__row ml-wallet-history__row--head">
        <span>Concepto</span>
        <span>Fecha</span>
        <span>Método</span>
        <span className="ml-wallet-history__amount">Monto</span>
      </div>
      {history.map(item => {
        if (item.kind === "charge_failed") {
          return (
            <div key={item.id} className="ml-wallet-history__row is-failed">
              <span className="ml-wallet-history__concept">
                <AlertTriangle size={13} color="var(--danger,#ef4444)" />
                <span>
                  {CHARGE_KIND_LABELS[item.chargeKind] || "Intento de cobro"}
                  {item.reason && <small>{item.reason}</small>}
                </span>
              </span>
              <span className="ml-wallet-history__date">
                {new Date(item.date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="ml-wallet-history__method">—</span>
              <strong className="ml-wallet-history__amount is-negative">
                Falló ${Number(item.amount).toLocaleString("es-AR")}
              </strong>
            </div>
          );
        }
        const positive = Number(item.amount) >= 0;
        return (
          <div key={item.id} className="ml-wallet-history__row">
            <span className="ml-wallet-history__concept">
              <span>{TX_LABELS[item.type] || item.description || item.type}</span>
            </span>
            <span className="ml-wallet-history__date">
              {new Date(item.date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="ml-wallet-history__method">{item.method === "balance" ? "Saldo" : "Tarjeta"}</span>
            <strong className={`ml-wallet-history__amount ${positive ? "is-positive" : "is-negative"}`}>
              {positive ? "+" : "−"}${Math.abs(Number(item.amount)).toLocaleString("es-AR")}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

const PLAN_LABELS = { inicial: "Inicial", pro: "Pro", max: "Max" };

function WalletSection({ wallet, onChanged }) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [payingDebt, setPayingDebt] = useState(false);
  const [payingBlockedDebt, setPayingBlockedDebt] = useState(false);
  const [payError, setPayError] = useState("");

  async function payDebtNow() {
    setPayingDebt(true); setPayError("");
    try {
      await client.post("/seller/ml/wallet/pay-debt");
      onChanged();
    } catch (err) {
      setPayError(err.response?.data?.message || "No se pudo pagar la deuda.");
    } finally {
      setPayingDebt(false);
    }
  }

  async function payBlockedDebtNow() {
    setPayingBlockedDebt(true); setPayError("");
    try {
      await client.post("/seller/ml/wallet/pay-blocked-debt");
      onChanged();
    } catch (err) {
      setPayError(err.response?.data?.message || "No se pudo pagar la deuda obligatoria.");
    } finally {
      setPayingBlockedDebt(false);
    }
  }

  const hasGrace = Number(wallet.graceHours) > 0; // Pro/Max — Inicial no tiene ventana de gracia
  const planLabel = PLAN_LABELS[wallet.planId] || wallet.planId;

  return (
    <div className="card ml-wallet-tab" style={{ padding: "16px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Wallet size={18} />
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Cobro de ventas de Mercado Libre</h3>
      </div>

      {/* Explicación de cómo funciona, según el plan — el corte diario cobra TODO lo pendiente
          a la misma hora todos los días. En Inicial, esa deuda siempre es obligatoria (hay que
          pagarla en ese mismo corte). En Pro/Max, una venta recién hecha tiene un plazo antes de
          volverse obligatoria — mientras esté dentro de ese plazo, tus pedidos igual se despachan. */}
      <div style={{ padding: "10px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Todos los días a las <strong>14:00 hs</strong> se intenta cobrar lo que debés en Ventaz por tus ventas de Mercado Libre
          {hasGrace
            ? <> — con tu plan <strong>{planLabel}</strong> tenés <strong>{wallet.graceHours}hs</strong> desde cada venta antes de que esa
                parte de la deuda se vuelva obligatoria. Mientras esté dentro de ese plazo, tus pedidos se despachan con normalidad
                aunque todavía no se haya cobrado.</>
            : <> — con tu plan <strong>{planLabel}</strong> toda venta se vuelve deuda obligatoria de inmediato, así que tiene que
                cobrarse en el corte del mismo día para que tus pedidos se puedan despachar.</>
          }
        </p>
      </div>

      {Number(wallet.blockedDebt) > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
          background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 9, marginBottom: 16 }}>
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: ".85rem", color: "#b91c1c" }}>
              No pudimos cobrar ${Number(wallet.blockedDebt).toLocaleString("es-AR")} de deuda obligatoria
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: ".78rem", color: "#7f1d1d" }}>
              Pausamos tus publicaciones y tus pedidos <strong>no se van a despachar</strong> hasta que se pague — incluidos los que
              todavía estén dentro de tu plazo de gracia. Pagá ahora para desbloquear todo de nuevo.
            </p>
          </div>
        </div>
      )}

      {Number(wallet.blockedDebt) === 0 && hasGrace && Number(wallet.pendingDebt) > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
          background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.2)", borderRadius: 9, marginBottom: 16 }}>
          <Wallet size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: ".78rem", color: "#92400e" }}>
            Tenés ${Number(wallet.pendingDebt).toLocaleString("es-AR")} pendientes de cobro, pero todavía dentro de tu plazo de
            gracia de {wallet.graceHours}hs — tus pedidos se siguen despachando normalmente mientras se intenta cobrar.
          </p>
        </div>
      )}

      <div className="ml-wallet-metrics">
        <div className="ml-wallet-metric ml-wallet-metric--hero">
          <span>Saldo disponible</span>
          <strong>${Number(wallet.balance || 0).toLocaleString("es-AR")}</strong>
        </div>
        <div className={`ml-wallet-metric ml-wallet-metric--hero${Number(wallet.pendingDebt) > 0 ? " is-danger" : ""}`}>
          <span>{hasGrace ? "Deuda pendiente (total)" : "Deuda pendiente"}</span>
          <strong>${Number(wallet.pendingDebt || 0).toLocaleString("es-AR")}</strong>
        </div>
        {hasGrace && (
          <div className={`ml-wallet-metric${Number(wallet.blockedDebt) > 0 ? " is-danger" : ""}`}>
            <span>Deuda obligatoria (vencida)</span>
            <strong>${Number(wallet.blockedDebt || 0).toLocaleString("es-AR")}</strong>
          </div>
        )}
        {Number(wallet.pendingDebt) > 0 && (
          <div className="ml-wallet-metric">
            <span>Próximo cobro</span>
            <strong className="is-small">{nextChargeLabel()}</strong>
          </div>
        )}
      </div>

      {/* Método de pago — un solo lugar unificado en vez de repartido entre la métrica
          "Tarjeta" y un botón "Cambiar tarjeta" suelto entre las demás acciones. */}
      <div className="ml-payment-method">
        <div className="ml-payment-method__icon"><CreditCard size={17} /></div>
        <div className="ml-payment-method__info">
          <span>Método de pago</span>
          <strong>{wallet.hasCard ? `•••• ${wallet.lastFour}` : "Sin tarjeta guardada"}</strong>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowCardModal(true)}>
          {wallet.hasCard ? "Cambiar" : "Guardar tarjeta"}
        </button>
      </div>

      {payError && <p style={{ margin: "12px 0 0", fontSize: ".8rem", color: "var(--danger,#ef4444)" }}>{payError}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {wallet.hasCard && hasGrace && Number(wallet.blockedDebt) > 0 && (
          <button type="button" className="btn btn--primary" style={{ padding: "10px 22px", background: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}
            onClick={payBlockedDebtNow} disabled={payingBlockedDebt}>
            {payingBlockedDebt ? <Loader2 size={15} className="spin" /> : <><AlertTriangle size={15} /> Pagar deuda obligatoria</>}
          </button>
        )}
        {wallet.hasCard && Number(wallet.pendingDebt) > 0 && (
          <button type="button" className="btn btn--primary" style={{ padding: "10px 22px" }} onClick={payDebtNow} disabled={payingDebt}>
            {payingDebt ? <Loader2 size={15} className="spin" /> : <><Wallet size={15} /> Pagar deuda ahora</>}
          </button>
        )}
        {wallet.hasCard && (
          <button type="button" className="btn btn--ghost" style={{ padding: "10px 22px" }} onClick={() => setShowAddBalance(true)}>
            <Plus size={15} /> Agregar saldo
          </button>
        )}
      </div>

      <h4 style={{ margin: "0 0 4px", fontSize: ".84rem", fontWeight: 700 }}>Historial de movimientos</h4>
      <WalletHistory />

      {showCardModal && (
        <CardModal
          onClose={() => setShowCardModal(false)}
          onSaved={() => { setShowCardModal(false); onChanged(); }}
        />
      )}
      {showAddBalance && (
        <AddBalanceModal
          wallet={wallet}
          onClose={() => setShowAddBalance(false)}
          onCharged={() => { setShowAddBalance(false); onChanged(); }}
        />
      )}
    </div>
  );
}

// ── Estado de una publicación — etiqueta de texto en vez de un switch, que no aclaraba
// si activaba, pausaba o sincronizaba. ────────────────────────────────────────────

function statusMeta(status, pauseReason) {
  if (status === "active") return { label: "Activo", color: "#059669", bg: "rgba(5,150,105,.1)" };
  if (status === "paused" && pauseReason === "stock") return { label: "Sin stock", color: "#d97706", bg: "rgba(217,119,6,.1)" };
  if (status === "paused" && pauseReason === "charge_failed") return { label: "Error de cobro", color: "#ef4444", bg: "rgba(239,68,68,.1)" };
  if (status === "paused") return { label: "Pausado", color: "#6b7280", bg: "rgba(107,114,128,.12)" };
  if (status === "closed") return { label: "Cerrada en ML", color: "#ef4444", bg: "rgba(239,68,68,.1)" };
  return { label: status, color: "#6b7280", bg: "rgba(107,114,128,.12)" };
}

// Quién/qué pausó una publicación — para el detalle de "Actividad reciente".
function pauseReasonText(pauseReason) {
  if (pauseReason === "stock") return "pausado automático por falta de stock";
  if (pauseReason === "charge_failed") return "pausado automático por cobro fallido";
  if (pauseReason === "plan_expired") return "pausado automático por plan vencido";
  return "pausado manualmente";
}

function StatusLabel({ status, pauseReason, compact }) {
  const meta = statusMeta(status, pauseReason);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: compact ? ".68rem" : ".74rem", fontWeight: 700,
      padding: compact ? "2px 7px" : "3px 9px", borderRadius: 99, background: meta.bg, color: meta.color, whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

// ── Listado de publicaciones ──────────────────────────────────────

// ML no expone en la API el link exacto de edición (incluye un token de sesión que su
// propio frontend genera al navegar) — probamos la ruta corta con solo el item id; si
// no lleva directo al formulario, cae en la lista de publicaciones de ML igual.
function editUrl(mlItemId) {
  return `https://www.mercadolibre.com.ar/publicaciones/${mlItemId}/modificar`;
}

const LISTING_FILTERS = [
  { id: "all",    label: "Todas",     color: "#111827" },
  { id: "active", label: "Activas",   color: "#059669" },
  { id: "paused", label: "Pausadas",  color: "#6b7280" },
  { id: "error",  label: "Con error", color: "#ef4444" },
];

const LISTING_SORTS = [
  { id: "updated", label: "Últimas actualizadas" },
  { id: "sales",   label: "Más vendidas" },
  { id: "stock",   label: "Mayor stock" },
];

function ListingsSection({ listings, statsByItem, onToggleStatus, onAddVariants, onChangeProduct }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    if (!showSort) return;
    function onClickOutside(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showSort]);

  // Menú "..." por fila — un solo estado compartido (qué fila está abierta) en vez de un
  // useState/effect por cada publicación, mismo criterio que showSort de arriba. menuRef se
  // reasigna solo al contenedor de la fila actualmente abierta (las demás no lo reciben).
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!openMenuFor) return;
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuFor(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openMenuFor]);

  // Filas que agrupan variantes de una misma familia — expandidas por default para que no
  // parezca que faltan publicaciones (la mayoría de las filas son solitarias y no cambian nada
  // visualmente, esto solo aplica cuando ml_family_id se repite).
  const [expandedFamilies, setExpandedFamilies] = useState(() => new Set());

  // Si el vendedor publicó todo con la misma cuenta de ML, no tiene sentido mostrar de cuál —
  // solo aporta cuando hay publicaciones de más de una cuenta distinta (alternó conexiones).
  const showAccount = useMemo(() => {
    const accounts = new Set(listings.map(l => l.ml_account_id).filter(Boolean));
    return accounts.size > 1;
  }, [listings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = listings.filter(l => {
      if (filter === "active" && l.status !== "active") return false;
      if (filter === "paused" && l.status !== "paused") return false;
      if (filter === "error" && l.pause_reason !== "charge_failed") return false;
      if (q && !l.product_name?.toLowerCase().includes(q) && !l.sku?.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...list];
    if (sortBy === "sales") sorted.sort((a, b) => (b.units_sold ?? 0) - (a.units_sold ?? 0));
    else if (sortBy === "stock") sorted.sort((a, b) => (b.available_stock ?? 0) - (a.available_stock ?? 0));
    else sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return sorted;
  }, [listings, filter, query, sortBy]);

  // Agrupa las filas que comparten familia (variantes de un mismo producto) para mostrarlas
  // juntas — una fila sin ml_family_id (la inmensa mayoría hoy) queda como grupo de una sola,
  // se ve exactamente igual que antes de esto.
  const groups = useMemo(() => {
    const map = new Map();
    for (const l of filtered) {
      const key = l.ml_family_id || `solo:${l.ml_item_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(l);
    }
    return [...map.values()];
  }, [filtered]);

  if (listings.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0", fontSize: ".85rem" }}>
        Todavía no publicaste ningún producto. Andá a "Publicar" para elegir uno de tu catálogo.
      </p>
    );
  }

  const activeSortLabel = LISTING_SORTS.find(s => s.id === sortBy)?.label;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 520 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nombre o SKU..."
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div ref={sortRef} style={{ position: "relative" }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowSort(v => !v)} style={{ whiteSpace: "nowrap" }}>
              <SlidersHorizontal size={13} /> {activeSortLabel}
            </button>
            {showSort && (
              <div className="ml-sort-popover">
                {LISTING_SORTS.map(s => (
                  <button key={s.id} type="button"
                    className={`ml-sort-popover__item${s.id === sortBy ? " is-active" : ""}`}
                    onClick={() => { setSortBy(s.id); setShowSort(false); }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LISTING_FILTERS.map(f => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              className={`ml-filter-chip${filter === f.id ? " is-active" : ""}`}
              style={{ "--chip-color": f.color }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "24px 0", fontSize: ".84rem" }}>
          Ninguna publicación coincide con el filtro.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map(group => {
            if (group.length === 1) return renderRow(group[0]);
            const familyId = group[0].ml_family_id;
            const expanded = expandedFamilies.has(familyId);
            const cover = group[0];
            return (
              <div key={familyId} className="ml-listing-card" style={{ padding: expanded ? undefined : "10px 14px" }}>
                <button type="button" onClick={() => setExpandedFamilies(prev => {
                  const next = new Set(prev);
                  next.has(familyId) ? next.delete(familyId) : next.add(familyId);
                  return next;
                })} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left",
                }}>
                  {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <div style={{ width: 40, height: 40, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: "var(--surface-2,#f3f4f6)" }}>
                    {cover.image_url && <img src={cover.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: ".86rem", flex: 1 }}>{cover.product_name}</span>
                  <span className="badge badge--gray"><Layers size={11} /> {group.length} variantes</span>
                </button>
                {expanded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    {group.map(l => renderRow(l, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  function renderRow(l, nested = false) {
    const stats = statsByItem[l.ml_item_id];
    // No confirmado que ML permita sumar variantes por precio a un ítem ya linkeado a un
    // catalog_product_id — se bloquea de entrada en vez de dejar que ML lo rechace en el momento.
    const canAddVariants = !l.ml_combo_id && l.published_as_family !== false && l.status !== "closed" && !l.catalog_product_id;
    return (
      <div key={l.ml_item_id} className={nested ? undefined : "ml-listing-card"}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: 9, position: "relative", flexShrink: 0, background: "var(--surface-2,#f3f4f6)" }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 9, overflow: "hidden" }}>
              {(l.ml_thumbnail_url || l.image_url) && (
                <img src={l.ml_thumbnail_url || l.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  title={l.ml_thumbnail_url ? "Foto real de la publicación en Mercado Libre" : "Foto del producto asignado en Ventaz"} />
              )}
            </div>
            {l.ml_thumbnail_url && l.image_url && (
              <div style={{
                position: "absolute", bottom: -5, right: -5, width: 32, height: 32, borderRadius: 8,
                overflow: "hidden", border: "2px solid #fff", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.15)",
              }} title={`Producto asignado en Ventaz: ${l.product_name}`}>
                <img src={l.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{
                fontWeight: 600, fontSize: ".86rem", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {l.product_name}
              </div>
              {l.variant_value && <span className="badge badge--gray">{l.variant_value}</span>}
              {l.catalog_product_id && <span className="badge badge--gray">Catálogo</span>}
              <StatusLabel status={l.status} pauseReason={l.pause_reason} compact />
            </div>
            <div style={{ fontSize: ".73rem", color: "var(--text-secondary)", marginTop: 3 }}>
              SKU {l.sku || "—"} · ${Number(stats?.price ?? l.price ?? 0).toLocaleString("es-AR")} · Stock {l.available_stock ?? "—"} · {l.units_sold ?? 0} vendidas
              {l.unit_cost != null && ` · Costo $${Math.round(l.unit_cost).toLocaleString("es-AR")}`}
              {showAccount && (
                <span style={{
                  marginLeft: 8, fontSize: ".68rem", fontWeight: 700, padding: "1px 7px",
                  borderRadius: 99, background: "var(--surface-2,#f3f4f6)", color: "var(--text-secondary)",
                }}>
                  {l.ml_account_nickname || l.ml_account_id}
                </span>
              )}
            </div>
            <div style={{ fontSize: ".7rem", color: "var(--text-secondary)", marginTop: 2 }}>
              {stats && `${stats.visits} visitas`}
              {stats?.health != null && ` · Calidad: ${Math.round(stats.health.pct * 100)}%`}
              {` · Actualizado ${new Date(l.updated_at).toLocaleDateString("es-AR")}`}
            </div>
            {l.profit_total != null && Number(l.units_sold) > 0 && (
              <div style={{ fontSize: ".73rem", fontWeight: 700, marginTop: 2, color: l.profit_total >= 0 ? "var(--success,#059669)" : "var(--danger,#ef4444)" }}>
                Ganancia total: ${Math.round(l.profit_total).toLocaleString("es-AR")}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {l.permalink && (
              <a href={l.permalink} target="_blank" rel="noreferrer" className="ml-icon-btn" title="Ver publicación">
                <Eye size={13} />
              </a>
            )}
            <a href={editUrl(l.ml_item_id)} target="_blank" rel="noreferrer" className="ml-icon-btn" title="Editar en Mercado Libre">
              <Pencil size={13} />
            </a>
            {l.status !== "closed" && (
              <button type="button" className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}
                onClick={() => onToggleStatus(l.ml_item_id, l.status === "active" ? "paused" : "active")}>
                {l.status === "active" ? <PauseCircle size={13} /> : <CheckCircle2 size={13} />}
                {l.status === "active" ? "Pausar" : "Activar"}
              </button>
            )}
            {(onAddVariants || onChangeProduct) && (
              <div ref={openMenuFor === l.ml_item_id ? menuRef : null} style={{ position: "relative" }}>
                <button type="button" className="ml-icon-btn" title="Más opciones"
                  onClick={() => setOpenMenuFor(v => v === l.ml_item_id ? null : l.ml_item_id)}>
                  <MoreVertical size={13} />
                </button>
                {openMenuFor === l.ml_item_id && (
                  <div className="ml-sort-popover" style={{ right: 0, left: "auto" }}>
                    {onAddVariants && (
                      <button type="button" className="ml-sort-popover__item" disabled={!canAddVariants}
                        title={canAddVariants ? undefined : l.status === "closed"
                          ? "Esta publicación ya no está activa en Mercado Libre"
                          : l.catalog_product_id
                            ? "Las publicaciones de catálogo no admiten variantes"
                            : "Esta categoría de Mercado Libre no admite variantes"}
                        onClick={() => { setOpenMenuFor(null); onAddVariants(l); }}>
                        <Layers size={13} /> Agregar variantes
                      </button>
                    )}
                    {onChangeProduct && (
                      <button type="button" className="ml-sort-popover__item" disabled={!!l.ml_combo_id || l.status === "closed"}
                        title={l.ml_combo_id
                          ? "Esta publicación pertenece a un combo, no a un producto individual"
                          : l.status === "closed"
                            ? "Esta publicación ya no está activa en Mercado Libre"
                            : undefined}
                        onClick={() => { setOpenMenuFor(null); onChangeProduct(l); }}>
                        <Link2 size={13} /> Cambiar producto asignado
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {stats?.fees && (
          <div className="ml-fee-box">
            <div className="ml-fee-box__item">
              <span className="ml-fee-box__label">Cargo por vender</span>
              <span className="ml-fee-box__value">${Math.round(stats.fees.saleFeeAmount).toLocaleString("es-AR")}</span>
            </div>
            <div className="ml-fee-box__item">
              <span className="ml-fee-box__label">Recibís</span>
              <span className="ml-fee-box__value ml-fee-box__value--main">${Math.round(stats.fees.netAmount).toLocaleString("es-AR")}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// ── Resumen — lo primero que ve el vendedor, responde "¿está todo bien?" sin
// tener que entrar a cada publicación una por una. ──────────────────────────

// size "hero" = las dos métricas que más le importan al vendedor de un vistazo (activas,
// ventas de hoy) — número grande, título arriba. size "compact" = el resto, mismo orden
// (título → número) pero más chico, para que el ícono no le gane protagonismo al número.
function SummaryCard({ icon, color, label, value, onClick, size = "compact", tint }) {
  const Icon = icon;
  const Tag = onClick ? "button" : "div";
  const isHero = size === "hero";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className="card ml-summary-card" style={{
      padding: isHero ? "13px 16px" : "11px 14px",
      display: "flex", flexDirection: "column", gap: isHero ? 5 : 4,
      flex: isHero ? "2 1 260px" : "1 1 150px",
      textAlign: "left", cursor: onClick ? "pointer" : "default", border: "1px solid var(--border)",
      background: tint || "#fff",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".74rem", fontWeight: 600, color: "var(--text-secondary)" }}>
        <Icon size={13} color={color} />
        {label}
      </div>
      <div style={{ fontSize: isHero ? "24px" : "19px", fontWeight: 800, lineHeight: 1, color: "var(--text)" }}>{value}</div>
    </Tag>
  );
}

function SummaryTab({ summary, listings, statsByItem, onGoTo }) {
  const recent = useMemo(() => [...listings].slice(0, 6), [listings]);
  const s = summary || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SummaryCard icon={CheckCircle2} color="#059669" label="Publicaciones activas" value={s.active_count ?? "—"} onClick={() => onGoTo("listings")} size="hero" />
        <SummaryCard icon={TrendingUp} color="var(--brand-text)" label="Ventas de hoy" value={s.sales_today ?? "—"} onClick={() => onGoTo("wallet")} size="hero" tint="var(--brand-light)" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SummaryCard icon={PauseCircle} color="#6b7280" label="Pausadas" value={s.paused_count ?? "—"} onClick={() => onGoTo("listings")} />
        <SummaryCard icon={AlertTriangle} color="#ef4444" label="Con error de cobro" value={s.error_count ?? "—"} onClick={() => onGoTo("listings")} />
        <SummaryCard icon={Ban} color="#d97706" label="Pausadas sin stock" value={s.stock_paused_count ?? "—"} onClick={() => onGoTo("listings")} />
      </div>

      {Number(s.error_count) > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px",
          background: "rgba(239,68,68,.08)", borderRadius: 9, fontSize: ".82rem", color: "#b91c1c" }}>
          <AlertTriangle size={14} />
          Tenés {s.error_count} publicación{s.error_count === 1 ? "" : "es"} pausada{s.error_count === 1 ? "" : "s"} por un cobro fallido —
          revisá la tarjeta guardada en <button type="button" onClick={() => onGoTo("wallet")} style={{ background: "none", border: "none", padding: 0, color: "#b91c1c", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Cobro</button>.
        </div>
      )}

      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: ".92rem", fontWeight: 700 }}>Actividad reciente</h3>
          <button type="button" onClick={() => onGoTo("listings")} className="btn btn--ghost btn--sm">
            Ver todas <ArrowRight size={13} />
          </button>
        </div>
        {recent.length === 0 ? (
          <p style={{ margin: 0, fontSize: ".84rem", color: "var(--text-secondary)" }}>Todavía no publicaste ningún producto.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recent.map(l => {
              const visits = statsByItem?.[l.ml_item_id]?.visits;
              return (
                <div key={l.ml_item_id} className="ml-activity-row" style={{ display: "flex", alignItems: "center", gap: 12, height: 72, padding: "0 8px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--surface-2,#f3f4f6)" }}>
                    {l.image_url && <img src={l.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".84rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.product_name}</div>
                    <div style={{ fontSize: ".74rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      SKU {l.sku || "—"}{visits != null && <> · {visits} visitas</>}
                      {l.status === "paused" && <> · {pauseReasonText(l.pause_reason)}</>}
                    </div>
                  </div>
                  <StatusLabel status={l.status} pauseReason={l.pause_reason} compact />
                  <span style={{ fontSize: ".74rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {new Date(l.updated_at).toLocaleDateString("es-AR")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────

const TABS = [
  { id: "summary",  label: "Resumen",             icon: LayoutGrid },
  { id: "listings", label: "Tus publicaciones",   icon: Megaphone },
  { id: "publish",  label: "Publicar",            icon: Search },
  { id: "wallet",   label: "Cobro",               icon: Wallet },
];

export default function MercadoLibre() {
  const [status, setStatus] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, pendingDebt: 0, blockedDebt: 0, hasCard: false, lastFour: null, planId: "inicial", graceHours: 0 });
  const [summary, setSummary] = useState(null);
  const [listings, setListings] = useState([]);
  const [listingStats, setListingStats] = useState({});
  const { startPublish, startCombo, justPublished, dismissJustPublished } = usePublishSession();
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [publishPending, setPublishPending] = useState(null);
  const [variantsTarget, setVariantsTarget] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [changeProductTarget, setChangeProductTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") || "summary");
  const [listingError, setListingError] = useState("");
  const [addressStatus, setAddressStatus] = useState(null);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Encabezado compacto al hacer scroll — no desaparece del todo (obligaría a volver arriba
  // para cambiar de pestaña) ni se mantiene entero (roba espacio de contenido).
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 80); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function loadAll() {
    Promise.all([
      client.get("/seller/ml/status"),
      client.get("/seller/ml/wallet"),
      client.get("/seller/ml/listings"),
      client.get("/seller/ml/summary"),
    ]).then(([s, w, l, sm]) => {
      setStatus(s.data);
      setWallet(w.data);
      setSummary(sm.data);
      const allListings = l.data || [];
      setListings(allListings);
      // Se pide para todas las publicaciones (activas o pausadas) — antes se filtraba
      // solo "active" y por eso una publicación pausada nunca mostraba visitas/calidad/comisión.
      allListings.forEach(x => {
        client.get(`/seller/ml/listings/${x.ml_item_id}/stats`, { params: { productId: x.product_id } })
          .then(r => setListingStats(prev => ({ ...prev, [x.ml_item_id]: r.data })))
          .catch(() => {});
      });
      if (s.data?.connected) refreshAddressStatus();
    }).catch(() => {}).finally(() => setLoading(false));
  }

  // Chequeo pasivo — se corre solo al abrir el panel, nunca marca nada como "reconocido".
  function refreshAddressStatus() {
    client.get("/seller/ml/shipping-address-status")
      .then(r => setAddressStatus(r.data))
      .catch(() => setAddressStatus(null));
  }

  // Botón "Ya la cambié, revisar de nuevo" — a diferencia del chequeo pasivo, esto SÍ le avisa
  // al backend que el vendedor dice haberlo arreglado (ver acknowledgeAddressFixed).
  function checkAddress() {
    setCheckingAddress(true);
    client.post("/seller/ml/shipping-address-ack")
      .then(r => setAddressStatus(r.data))
      .catch(() => setAddressStatus(null))
      .finally(() => setCheckingAddress(false));
  }

  useEffect(() => { loadAll(); }, []);

  // Después de publicar, ML puede tardar en terminar de procesar las fotos (quedan en
  // sub_status "picture_download_pending" mientras las descarga en 2do plano) — mostramos un
  // banner de "subiendo fotos" y recién pasamos al de éxito cuando ML confirma que terminó.
  // Si tarda demasiado, mostramos el de éxito igual (la publicación ya existe, solo la foto
  // puede seguir procesándose del lado de ML).
  useEffect(() => {
    if (!publishPending) return;
    let attempts = 0;
    const maxAttempts = 20; // ~60s
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await client.get(`/seller/ml/listings/${publishPending.ml_item_id}/picture-status`);
        if (!data.pending || attempts >= maxAttempts) {
          clearInterval(interval);
          setPublishPending(null);
          setPublishSuccess(publishPending);
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPublishPending(null);
          setPublishSuccess(publishPending);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [publishPending]);

  // Si esta página está montada cuando termina una publicación (recién publicada, o restaurada
  // desde el cartelito minimizado y completada acá mismo), "reclama" el resultado del contexto
  // para mostrar el toast rico de siempre (con polling de fotos y botón de variantes) en vez del
  // toast simple y genérico que muestra PublishSessionContext cuando esta página no está montada.
  useEffect(() => {
    if (!justPublished) return;
    setPublishPending(justPublished);
    loadAll();
    dismissJustPublished();
  }, [justPublished]);

  async function toggleListingStatus(mlItemId, newStatus) {
    setListingError("");
    try {
      await client.patch(`/seller/ml/listings/${mlItemId}`, { status: newStatus });
    } catch (err) {
      setListingError(err.response?.data?.message || "No se pudo actualizar el estado de la publicación");
    }
    loadAll();
  }

  return (
    <main>
      {/* Una vez conectado, el encabezado sticky de más abajo ya muestra cuenta y estado —
          este banner grande solo tiene sentido antes de conectar. */}
      {!status?.connected && !loading && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 18, padding: "14px 20px",
          background: "linear-gradient(135deg, #FFE600 0%, #FFF159 100%)",
          borderRadius: 14, color: "#2D3277",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(45,50,119,.12)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 6 }}>
              <img src="/mercadolibre-logo.png" alt="Mercado Libre" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-.02em" }}>Mercado Libre</h1>
              <p style={{ margin: 0, fontSize: ".74rem", color: "rgba(45,50,119,.65)", marginTop: 2 }}>
                Publicá tu catálogo en Mercado Libre
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
          <Loader2 size={18} className="spin" /> Cargando...
        </div>
      ) : (
        <>
          <div className={status?.connected ? "ml-header" : undefined}>
            <MercadoLibreConnection status={status} summary={summary} scrolled={scrolled} onConnected={loadAll} onDisconnected={loadAll} />

            {status?.connected && (
              <div className="ml-nav">
                {TABS.map(t => {
                  const TabIcon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                      className={`ml-nav__tab${active ? " is-active" : ""}`}>
                      <TabIcon size={14} /> {t.label}
                      {t.id === "listings" && listings.length > 0 && (
                        <span className="ml-nav__count">{listings.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {status?.connected && addressStatus?.connected && addressStatus.valid === false && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16,
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(217,119,6,.08)", border: "1px solid #f59e0b",
            }}>
              <AlertTriangle size={18} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: ".88rem", color: "#92400e" }}>No podés publicar en Mercado Libre todavía</strong>
                <p style={{ margin: "4px 0 8px", fontSize: ".82rem", color: "#92400e" }}>
                  El domicilio de despacho cargado en tu cuenta de Mercado Libre
                  {addressStatus.currentAddress ? ` (${addressStatus.currentAddress})` : ""} no coincide con el
                  depósito de Ventaz ({addressStatus.warehouseAddress}). Cambialo en tu cuenta de Mercado Libre y
                  volvé a revisar acá.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={addressStatus.changeAddressUrl} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm">
                    Cambiar dirección
                  </a>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={checkAddress} disabled={checkingAddress}>
                    {checkingAddress ? <Loader2 size={13} className="spin" /> : "Ya la cambié, revisar de nuevo"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {status?.connected && (
            <>
              {!wallet.hasCard && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px",
                  background: "rgba(217,119,6,.08)", borderRadius: 9, marginBottom: 16, fontSize: ".82rem", color: "#b45309" }}>
                  <AlertTriangle size={14} /> Guardá una tarjeta en la pestaña "Cobro" para que podamos cobrarte automáticamente la comisión de tus ventas.
                </div>
              )}

              {/* Deuda acumulada del día — visible en cualquier pestaña. Aparece con la primera
                  venta que genera deuda y desaparece sola apenas el corte diario la cobra (vuelve
                  a $0), hasta la próxima venta que la genere de nuevo. */}
              {wallet.pendingDebt > 0 && (
                <div style={{
                  display: "flex", gap: 10, alignItems: "center", padding: "12px 16px",
                  background: "#FFF4F2", borderLeft: "4px solid var(--danger,#ef4444)", borderRadius: 10,
                  marginBottom: 16, fontSize: ".84rem", color: "#374151",
                }}>
                  <CreditCard size={16} color="var(--danger,#ef4444)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    Deuda acumulada hoy: <strong style={{ color: "var(--danger,#ef4444)" }}>${Math.round(wallet.pendingDebt).toLocaleString("es-AR")}</strong> — se cobra automáticamente.
                  </span>
                  <span style={{
                    fontSize: ".72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: "#fff", border: "1px solid #fecaca", color: "#374151", whiteSpace: "nowrap",
                  }}>
                    {nextChargeLabel()}
                  </span>
                </div>
              )}

              {tab === "summary" && (
                <SummaryTab summary={summary} listings={listings} statsByItem={listingStats} onGoTo={setTab} />
              )}

              {tab === "listings" && (
                <div className="card ml-listings-tab" style={{ padding: "16px 20px" }}>
                  {listingError && (
                    <p style={{ margin: "0 0 14px", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{listingError}</p>
                  )}
                  {/* Afuera de ListingsSection a propósito: ese componente corta y no
                      renderiza nada más si todavía no hay ninguna publicación registrada en
                      Ventaz — justo el caso de quien publicó todo directo en Mercado Libre y
                      necesita este cartel para que deje de estar invisible acá. */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14,
                    background: "var(--brand-light,#eafbe0)", border: "1px solid var(--brand,#4db81a)", marginBottom: 16,
                  }}>
                    <IconBadge icon={Link2} color="var(--brand,#4db81a)" bg="#fff" size={40} iconSize={19} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: ".92rem", display: "block" }}>¿Publicaste algo directo en Mercado Libre?</strong>
                      <p style={{ margin: "2px 0 0", fontSize: ".81rem", color: "var(--text-secondary)" }}>
                        Vinculá esa publicación con un producto de tu catálogo de Ventaz para tenerla bajo control acá también.
                      </p>
                    </div>
                    <button type="button" className="btn btn--primary btn--sm" style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setLinkModalOpen(true)}>
                      <Link2 size={13} /> Vincular publicación
                    </button>
                  </div>
                  <ListingsSection listings={listings} statsByItem={listingStats} onToggleStatus={toggleListingStatus} onAddVariants={setVariantsTarget} onChangeProduct={setChangeProductTarget} />
                </div>
              )}

              {linkModalOpen && (
                <LinkListingModal
                  onClose={() => setLinkModalOpen(false)}
                  onLinked={() => { setLinkModalOpen(false); loadAll(); }}
                />
              )}

              {changeProductTarget && (
                <LinkListingModal
                  initialListing={{
                    mlItemId: changeProductTarget.ml_item_id,
                    title: changeProductTarget.product_name,
                    thumbnail: changeProductTarget.image_url,
                    linkedProductId: changeProductTarget.product_id,
                    linkedProductName: changeProductTarget.product_name,
                  }}
                  onClose={() => setChangeProductTarget(null)}
                  onLinked={() => { setChangeProductTarget(null); loadAll(); }}
                />
              )}

              {tab === "publish" && (
                <div className="card ml-publish-tab" style={{ padding: "16px 20px" }}>
                  <PageProducts mode="ml"
                    onPublishToMl={product => startPublish({ product, siteId: status?.site_id, addressStatus })}
                    onComboReadyForMl={comboId => startCombo({ comboId, addressStatus })} />
                </div>
              )}

              {tab === "wallet" && (
                <WalletSection wallet={wallet} onChanged={loadAll} />
              )}
            </>
          )}

          {variantsTarget && (
            <PublishVariantsModal
              rootListing={variantsTarget}
              siblings={listings.filter(l => variantsTarget.ml_family_id && l.ml_family_id === variantsTarget.ml_family_id && l.ml_item_id !== variantsTarget.ml_item_id)}
              onClose={() => setVariantsTarget(null)}
              onSaved={() => { setVariantsTarget(null); loadAll(); }}
            />
          )}

          {publishPending && createPortal(
            <div style={{
              position: "fixed", bottom: 24, left: 24, zIndex: 7000, maxWidth: 320,
              background: "#fff", border: "1px solid var(--border,#e2e8f0)", borderRadius: 999,
              boxShadow: "0 10px 28px rgba(0,0,0,.16)", padding: "11px 20px 11px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Loader2 size={16} className="spin" style={{ flexShrink: 0, color: "var(--brand,#4db81a)" }} />
              <span style={{ fontSize: ".84rem", fontWeight: 700, color: "var(--text)" }}>Publicando en Mercado Libre...</span>
            </div>,
            document.body
          )}

          {publishSuccess && createPortal(
            <div style={{
              position: "fixed", bottom: 24, left: 24, zIndex: 7000, maxWidth: 400,
              background: "#fff", border: "1px solid var(--border)", borderRadius: 16,
              boxShadow: "0 16px 40px rgba(0,0,0,.18)", padding: "18px 20px",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <IconBadge icon={CheckCircle2} color="var(--success,#059669)" bg="rgba(5,150,105,.12)" size={40} iconSize={20} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: ".94rem", fontWeight: 800 }}>¡Publicado en Mercado Libre!</strong>
                  <p style={{ margin: "3px 0 0", fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Tu producto ya está publicado en tu cuenta de Mercado Libre.
                  </p>
                  {publishSuccess.shipping_free && publishSuccess.requestedShippingFree === false && (
                    <p style={{ margin: "8px 0 0", fontSize: ".78rem", color: "#92400e", background: "rgba(217,119,6,.1)", padding: "7px 9px", borderRadius: 8 }}>
                      Mercado Libre exige envío gratis para este producto a este precio — se activó automáticamente.
                    </p>
                  )}
                  {publishSuccess.installmentTagsApplied === false && (
                    <p style={{ margin: "8px 0 0", fontSize: ".78rem", color: "#92400e", background: "rgba(217,119,6,.1)", padding: "7px 9px", borderRadius: 8 }}>
                      Mercado Libre no aceptó la campaña de cuotas que elegiste (a veces exige producto de fabricación nacional u otro requisito puntual) — se publicó igual, con el plan de cuotas estándar. El cargo por vender real puede ser distinto al que viste antes de publicar: revisalo en tu publicación de Mercado Libre.
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setPublishSuccess(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 2, flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {publishSuccess.permalink && (
                  <a href={publishSuccess.permalink} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ flex: 1, justifyContent: "center" }}>
                    <ExternalLink size={13} /> Ver
                  </a>
                )}
                <a href={editUrl(publishSuccess.ml_item_id)} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ flex: 1, justifyContent: "center" }}>
                  Editar
                </a>
              </div>
              {publishSuccess.product_id && !publishSuccess.catalog_product_id && (
                <button type="button" className="btn btn--ghost btn--sm" style={{ justifyContent: "center" }}
                  onClick={() => { setVariantsTarget(publishSuccess); setPublishSuccess(null); }}>
                  <Layers size={13} /> Agregar variantes
                </button>
              )}
            </div>,
            document.body
          )}
        </>
      )}
    </main>
  );
}
