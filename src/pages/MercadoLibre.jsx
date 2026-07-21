import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ExternalLink, Unlink, Loader2, CreditCard, Wallet, Plus, X,
  AlertTriangle, Search, Megaphone, MoreVertical, LayoutGrid, PauseCircle,
  ShoppingBag, TrendingUp, CheckCircle2, Ban,
} from "lucide-react";
import client from "../api/client";
import PageProducts from "./PageProducts";

const ML_SITE_NAMES = {
  MLA: "Argentina", MLB: "Brasil", MLM: "México",
  MCO: "Colombia",  MLC: "Chile",  MLU: "Uruguay",
};

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

// ── Modal genérico (portal a document.body — evita el bug de position:fixed
// roto por algún transform en un contenedor padre, mismo patrón que usa PageProducts.jsx) ──

function Modal({ title, onClose, children, maxWidth = 460 }) {
  return createPortal(
    <div
      style={{
        // z-index por encima de 5000: PageProducts porta una barra de búsqueda "sticky"
        // a document.body con z-index 5000 al hacer scroll, y sin esto quedaba tapando el modal.
        position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 6000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ maxWidth, width: "100%", padding: 0, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ── Conexión con Mercado Libre ──────────────────────────────────

function MercadoLibreConnection({ status, summary, onConnected, onDisconnected }) {
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

  // Conectado: una vez vinculada la cuenta, lo único que importa es el estado —
  // barra angosta con los números clave en vez de un encabezado grande y vacío.
  return (
    <div className="card ml-connection-banner" style={{ padding: "12px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: "#FFE600", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 4,
        }}>
          <img src="/mercadolibre-logo.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: ".84rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{status.ml_nickname || "—"}</div>
          <div style={{ fontSize: ".68rem", color: "var(--text-secondary)" }}>{ML_SITE_NAMES[status.site_id] || status.site_id}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, fontSize: ".78rem" }}>
        <StatChip icon={CheckCircle2} color="var(--success,#059669)" label="Activas" value={summary?.active_count ?? "—"} />
        <StatChip icon={PauseCircle} color="var(--text-secondary)" label="Pausadas" value={summary?.paused_count ?? "—"} />
        {Number(summary?.error_count) > 0 && (
          <StatChip icon={AlertTriangle} color="var(--danger,#ef4444)" label="Con error" value={summary.error_count} />
        )}
        <StatChip icon={TrendingUp} label="Ventas hoy" value={summary?.sales_today ?? "—"} />
        <span style={{ color: "var(--text-secondary)" }}>
          Última venta: {summary?.last_sale_at ? new Date(summary.last_sale_at).toLocaleDateString("es-AR") : "—"}
        </span>
      </div>

      {error && <p style={{ margin: 0, fontSize: ".78rem", color: "var(--danger,#ef4444)" }}>{error}</p>}

      <div ref={menuRef} style={{ position: "relative" }}>
        <button type="button" onClick={() => setMenuOpen(o => !o)}
          style={{ display: "flex", padding: 6, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", color: "var(--text-secondary)" }}
          aria-label="Opciones de la cuenta">
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid var(--border)",
            borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 10, minWidth: 160, overflow: "hidden" }}>
            <button type="button" onClick={disconnect}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: ".82rem", color: "var(--danger,#ef4444)", textAlign: "left" }}>
              <Unlink size={13} /> Desconectar cuenta
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
};

const CHARGE_KIND_LABELS = {
  mandatory: "Cobro obligatorio",
  optional:  "Cobro adicional",
  manual:    "Pago manual",
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      {history.map(item => {
        if (item.kind === "charge_failed") {
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
              <AlertTriangle size={14} color="var(--danger,#ef4444)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".82rem", fontWeight: 600 }}>{CHARGE_KIND_LABELS[item.chargeKind] || "Intento de cobro"}</div>
                <div style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>
                  {new Date(item.date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {item.reason ? ` · ${item.reason}` : ""}
                </div>
              </div>
              <strong style={{ fontSize: ".88rem", color: "var(--danger,#ef4444)", whiteSpace: "nowrap" }}>
                Falló ${Number(item.amount).toLocaleString("es-AR")}
              </strong>
            </div>
          );
        }
        const positive = Number(item.amount) >= 0;
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 600 }}>{TX_LABELS[item.type] || item.description || item.type}</div>
              <div style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>
                {new Date(item.date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {" · "}{item.method === "balance" ? "Desde saldo" : "Con tarjeta"}
              </div>
            </div>
            <strong style={{ fontSize: ".88rem", color: positive ? "var(--success,#059669)" : "var(--danger,#ef4444)", whiteSpace: "nowrap" }}>
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

      <div style={{ display: "flex", gap: 24, marginBottom: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Saldo disponible</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 2 }}>${Number(wallet.balance || 0).toLocaleString("es-AR")}</div>
        </div>
        <div>
          <div style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
            {hasGrace ? "Deuda pendiente (total)" : "Deuda pendiente"}
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 2, color: Number(wallet.pendingDebt) > 0 ? "var(--danger,#ef4444)" : undefined }}>
            ${Number(wallet.pendingDebt || 0).toLocaleString("es-AR")}
          </div>
        </div>
        {hasGrace && (
          <div>
            <div style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Deuda obligatoria (vencida)</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 2, color: Number(wallet.blockedDebt) > 0 ? "var(--danger,#ef4444)" : undefined }}>
              ${Number(wallet.blockedDebt || 0).toLocaleString("es-AR")}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Tarjeta</div>
          <div style={{ fontSize: ".95rem", fontWeight: 600, marginTop: 2 }}>
            {wallet.hasCard ? `•••• ${wallet.lastFour}` : "Sin tarjeta guardada"}
          </div>
        </div>
        {Number(wallet.pendingDebt) > 0 && (
          <div>
            <div style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Próximo cobro</div>
            <div style={{ fontSize: ".95rem", fontWeight: 600, marginTop: 2 }}>{nextChargeLabel()}</div>
          </div>
        )}
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
        <button type="button" className="btn btn--ghost" onClick={() => setShowCardModal(true)}>
          <CreditCard size={14} /> {wallet.hasCard ? "Cambiar tarjeta" : "Guardar tarjeta"}
        </button>
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

// ── Modal de publicación ─────────────────────────────────────────

const WIZARD_STEPS = ["Categoría", "Características principales", "Fotos", "Título", "Características secundarias", "Descripción", "Precio"];

function WizardProgress({ step, total }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: ".74rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6 }}>
        Paso {step + 1} de {total}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i <= step ? "var(--brand,#6366f1)" : "var(--border)",
          }} />
        ))}
      </div>
    </div>
  );
}

function PublishModal({ product, onClose, onPublished }) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState(product.custom_name || product.name);
  const [suggestions, setSuggestions] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [attrDefs, setAttrDefs] = useState([]);
  const [attrValues, setAttrValues] = useState({});
  const [title, setTitle] = useState(product.custom_name || product.name || "");
  const [description, setDescription] = useState(product.custom_desc || product.description || "");
  const [price, setPrice] = useState("");
  const [priceFloor, setPriceFloor] = useState(null);
  const [weightGrams, setWeightGrams] = useState(0);
  const [volumeCm3, setVolumeCm3] = useState(0);
  const [shippingFree, setShippingFree] = useState(false);
  const [withInstallments, setWithInstallments] = useState(false);
  const [existingImages, setExistingImages] = useState([]); // [{id, key, url}]
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [newPictures, setNewPictures] = useState([]); // [{previewUrl, ref, uploading}]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [suggestingDesc, setSuggestingDesc] = useState(false);
  const [suggestingAttrs, setSuggestingAttrs] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const categoryName = suggestions.find(s => s.categoryId === categoryId)?.categoryName;

  function searchCategories() {
    client.get("/seller/ml/categories/suggest", { params: { q: query } })
      .then(r => setSuggestions(r.data || []))
      .catch(() => setSuggestions([]));
  }

  useEffect(() => {
    searchCategories();
    client.get(`/seller/ml/products/${product.id}/price-floor`)
      .then(r => {
        setPriceFloor(r.data.floor);
        setWeightGrams(Number(r.data.weightGrams || 0));
        setVolumeCm3(Number(r.data.volumeCm3 || 0));
      })
      .catch(() => setPriceFloor(null));
    client.get(`/seller/images/${product.id}`, { params: { all: true } })
      .then(r => {
        const imgs = r.data || [];
        setExistingImages(imgs);
        setSelectedKeys(new Set(imgs.map(i => i.key)));
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!categoryId) { setAttrDefs([]); return; }
    client.get(`/seller/ml/categories/${categoryId}/attributes`)
      .then(r => {
        const defs = r.data || [];
        setAttrDefs(defs);
        // La marca/modelo real casi nunca la sabe quien publica (no es el fabricante) — se
        // precarga un default razonable, editable por si en algún caso sí lo sabe.
        setAttrValues(prev => {
          const next = { ...prev };
          if (defs.some(a => a.id === "BRAND") && !next.BRAND) next.BRAND = "Genérica";
          if (defs.some(a => a.id === "MODEL") && !next.MODEL) next.MODEL = product.code || product.sku || product.name || "";
          return next;
        });
      })
      .catch(() => setAttrDefs([]));
  }, [categoryId]); // eslint-disable-line

  const requiredAttrs = attrDefs.filter(a => a.required);
  const optionalAttrs = attrDefs.filter(a => !a.required);

  const priceValid = useMemo(() => {
    const p = Number(price);
    if (!p || p <= 0) return false;
    if (priceFloor != null && p < priceFloor) return false;
    return true;
  }, [price, priceFloor]);

  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);

  // Recalcula "Recibís" cada vez que cambia precio/categoría/envío — igual que la propia UI de ML.
  useEffect(() => {
    const p = Number(price);
    if (!categoryId || !p || p <= 0) { setFees(null); return; }
    let cancelled = false;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      client.get("/seller/ml/listing-fees", {
        params: {
          price: p, categoryId,
          ...(weightGrams > 0 ? { weightGrams, volumeCm3, freeShipping: String(shippingFree) } : {}),
        },
      })
        .then(r => { if (!cancelled) setFees(r.data); })
        .catch(() => { if (!cancelled) setFees(null); })
        .finally(() => { if (!cancelled) setFeesLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [price, categoryId, weightGrams, volumeCm3, shippingFree]);

  const missingAttrs = requiredAttrs.filter(a => !attrValues[a.id]?.trim());

  const shippingCost     = shippingFree ? Number(fees?.shippingCost || 0) : 0;
  const installmentsCost = withInstallments ? Number(fees?.installments?.extraCost || 0) : 0;
  const netFinal    = fees ? Number(fees.netAmount) - shippingCost - installmentsCost : null;
  const sellingAtLoss = netFinal != null && priceFloor != null && netFinal < priceFloor;

  function toggleImage(key) {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      const entry = { previewUrl, ref: null, uploading: true };
      setNewPictures(prev => [...prev, entry]);
      try {
        const form = new FormData();
        form.append("image", file);
        const res = await client.post("/seller/ml/pictures/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setNewPictures(prev => prev.map(p => p.previewUrl === previewUrl ? { ...p, ref: res.data.ref, uploading: false } : p));
      } catch {
        setNewPictures(prev => prev.map(p => p.previewUrl === previewUrl ? { ...p, uploading: false, failed: true } : p));
      }
    }
  }

  function removeNewPicture(previewUrl) {
    setNewPictures(prev => prev.filter(p => p.previewUrl !== previewUrl));
  }

  function goBack() { setError(""); setStep(s => Math.max(0, s - 1)); }

  function goNext() {
    setError("");
    if (step === 0 && !categoryId) { setError("Elegí una categoría de Mercado Libre"); return; }
    if (step === 1 && missingAttrs.length > 0) { setError(`Faltan completar: ${missingAttrs.map(a => a.name).join(", ")}`); return; }
    if (step === 2) {
      if (newPictures.some(p => p.uploading)) { setError("Esperá a que terminen de subirse las imágenes"); return; }
      const pictureCount = selectedKeys.size + newPictures.filter(p => p.ref).length;
      if (pictureCount === 0) { setError("Seleccioná o subí al menos una imagen — Mercado Libre no permite publicar sin fotos"); return; }
    }
    if (step === 3 && !title.trim()) { setError("Ingresá un título"); return; }
    setStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1));
  }

  async function suggestTitleAi() {
    setSuggestingTitle(true);
    try {
      const res = await client.post("/seller/ml/suggest/title", { productName: product.name, categoryName });
      setTitle(res.data.title);
    } catch { setError("No se pudo generar el título"); }
    finally { setSuggestingTitle(false); }
  }

  async function suggestDescriptionAi() {
    setSuggestingDesc(true);
    try {
      const res = await client.post("/seller/ml/suggest/description", {
        productName: product.name, description,
        imageUrls: existingImages.map(i => i.url),
      });
      setDescription(res.data.description);
    } catch { setError("No se pudo generar la descripción"); }
    finally { setSuggestingDesc(false); }
  }

  async function suggestAttrsAi(attrsToFill) {
    const pending = attrsToFill.filter(a => !attrValues[a.id]?.trim());
    if (pending.length === 0) return;
    setSuggestingAttrs(true);
    try {
      const res = await client.post("/seller/ml/suggest/attributes", {
        productName: product.name, description, categoryName,
        attrDefs: pending.map(a => ({ id: a.id, name: a.name, values: a.values })),
        imageUrls: existingImages.map(i => i.url),
      });
      setAttrValues(prev => ({ ...prev, ...res.data.values }));
    } catch { setError("No se pudieron sugerir las características"); }
    finally { setSuggestingAttrs(false); }
  }

  async function generateImageAi() {
    setGeneratingImage(true); setError("");
    try {
      const res = await client.post("/seller/ml/pictures/generate",
        { productName: product.name, description, imageUrls: existingImages.map(i => i.url) },
        { timeout: 90000 });
      setNewPictures(prev => [...prev, { previewUrl: res.data.previewUrl, ref: res.data.ref, uploading: false }]);
    } catch (err) {
      console.error("[ml] generateImageAi:", err);
      setError(err.response?.data?.message || "No se pudo generar la imagen");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function publish() {
    if (!categoryId) { setError("Elegí una categoría de Mercado Libre"); return; }
    if (!priceValid) {
      setError(priceFloor != null
        ? `El precio no puede ser menor a $${Math.round(priceFloor).toLocaleString("es-AR")} (costo total del producto)`
        : "Ingresá un precio válido");
      return;
    }
    if (missingAttrs.length > 0) {
      setError(`Faltan completar: ${missingAttrs.map(a => a.name).join(", ")}`);
      return;
    }
    if (newPictures.some(p => p.uploading)) { setError("Esperá a que terminen de subirse las imágenes"); return; }
    const pictureCount = selectedKeys.size + newPictures.filter(p => p.ref).length;
    if (pictureCount === 0) { setError("Seleccioná o subí al menos una imagen — Mercado Libre no permite publicar sin fotos"); return; }

    setSaving(true); setError("");
    try {
      const attributes = attrDefs
        .filter(a => attrValues[a.id]?.trim())
        .map(a => ({
          id: a.id,
          value_name: a.valueType === "number_unit" ? formatNumberUnitValue(a, attrValues[a.id]) : attrValues[a.id],
        }));
      const pictureRefs = newPictures.filter(p => p.ref).map(p => p.ref);

      const res = await client.post(`/seller/ml/products/${product.id}/publish`, {
        mlCategoryId: categoryId, price: Number(price), shippingFree, attributes,
        title, description,
        imageKeys: Array.from(selectedKeys),
        pictureRefs,
        listingTypeId: withInstallments ? "gold_pro" : "gold_special",
      });
      onPublished(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo publicar el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Publicar en Mercado Libre" onClose={onClose} maxWidth={640}>
      <WizardProgress step={step} total={WIZARD_STEPS.length} />
      <h4 style={{ margin: "0 0 14px", fontSize: ".95rem" }}>{WIZARD_STEPS[step]}</h4>

      {step === 0 && (
        <>
          <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Categoría de Mercado Libre</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="form-input" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchCategories()}
              placeholder="Palabras clave para buscar la categoría" />
            <button type="button" className="btn btn--ghost btn--sm" onClick={searchCategories}><Search size={13} /></button>
          </div>
          {suggestions.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Buscá una categoría para ver las opciones.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {suggestions.map(s => {
                const selected = s.categoryId === categoryId;
                return (
                  <button key={s.categoryId} type="button" onClick={() => setCategoryId(s.categoryId)}
                    style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: selected ? "2px solid var(--brand,#6366f1)" : "1px solid var(--border)",
                      background: selected ? "rgba(99,102,241,.06)" : "#fff",
                    }}>
                    <div style={{ fontWeight: 600, fontSize: ".86rem" }}>{s.categoryName}</div>
                    {s.path && <div style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginTop: 2 }}>{s.path}</div>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {step === 1 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)" }}>Datos requeridos por "{categoryName}"</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => suggestAttrsAi(requiredAttrs)} disabled={suggestingAttrs}>
              {suggestingAttrs ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          {requiredAttrs.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Esta categoría no pide datos obligatorios.</p>
          ) : (
            <div style={{ padding: "12px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, display: "flex", flexDirection: "column", gap: 8 }}>
              {requiredAttrs.map(a => (
                <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          {existingImages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {existingImages.map(img => {
                const selected = selectedKeys.has(img.key);
                return (
                  <button key={img.id || img.key} type="button" onClick={() => toggleImage(img.key)}
                    style={{
                      position: "relative", width: 72, height: 72, padding: 0, borderRadius: 8, overflow: "hidden",
                      border: selected ? "2px solid var(--brand,#6366f1)" : "2px solid var(--border)",
                      opacity: selected ? 1 : .4, cursor: "pointer", background: "none",
                    }}>
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                );
              })}
            </div>
          )}
          <p style={{ margin: "0 0 10px", fontSize: ".76rem", color: "var(--text-secondary)" }}>
            Las imágenes de tu catálogo aparecen tildadas por defecto — desmarcá las que no quieras incluir en Mercado Libre.
          </p>

          {newPictures.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {newPictures.map(p => (
                <div key={p.previewUrl} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "2px solid var(--border)" }}>
                  <img src={p.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.uploading && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Loader2 size={16} className="spin" />
                    </div>
                  )}
                  {p.failed && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,.15)" }} title="No se pudo subir" />
                  )}
                  <button type="button" onClick={() => removeNewPicture(p.previewUrl)}
                    style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 99, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label className="btn btn--ghost btn--sm" style={{ display: "inline-flex", cursor: "pointer" }}>
              <Plus size={13} /> Subir imagen nueva
              <input type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
            <button type="button" className="btn btn--ghost btn--sm" onClick={generateImageAi} disabled={generatingImage}>
              {generatingImage ? <Loader2 size={13} className="spin" /> : "✨ Generar con IA"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ fontSize: ".8rem", fontWeight: 600 }}>Título de la publicación</label>
            <button type="button" className="btn btn--ghost btn--sm" onClick={suggestTitleAi} disabled={suggestingTitle}>
              {suggestingTitle ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          <input className="form-input" maxLength={60} value={title} onChange={e => setTitle(e.target.value)} />
          <small style={{ display: "block", marginTop: 4, textAlign: "right", color: "var(--text-secondary)" }}>{title.length}/60</small>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)" }}>Opcional — mejora la exposición de la publicación</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => suggestAttrsAi(optionalAttrs)} disabled={suggestingAttrs || optionalAttrs.length === 0}>
              {suggestingAttrs ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          {optionalAttrs.length === 0 ? (
            <p style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Esta categoría no tiene características opcionales.</p>
          ) : (
            <div style={{ padding: "12px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, display: "flex", flexDirection: "column", gap: 8 }}>
              {optionalAttrs.map(a => (
                <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ fontSize: ".8rem", fontWeight: 600 }}>Descripción</label>
            <button type="button" className="btn btn--ghost btn--sm" onClick={suggestDescriptionAi} disabled={suggestingDesc}>
              {suggestingDesc ? <Loader2 size={13} className="spin" /> : "✨ Sugerir con IA"}
            </button>
          </div>
          <textarea className="form-input" rows={8} style={{ resize: "vertical" }}
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      )}

      {step === 6 && (
        <div>
          <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Precio en Mercado Libre</label>
          <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)}
            style={{ marginBottom: 4, borderColor: price && !priceValid ? "var(--danger,#ef4444)" : undefined }} />
          {priceFloor != null && (
            <small style={{ display: "block", marginBottom: 12, color: "var(--text-secondary)" }}>
              Costo total: ${Math.round(priceFloor).toLocaleString("es-AR")}
            </small>
          )}

          {weightGrams > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".84rem", marginBottom: 10 }}>
              <input type="checkbox" checked={shippingFree} onChange={e => setShippingFree(e.target.checked)} />
              Ofrecer envío gratis (a veces Mercado Libre lo exige a partir de cierto precio)
            </label>
          )}

          {fees?.installments && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".84rem", marginBottom: 16 }}>
              <input type="checkbox" checked={withInstallments} onChange={e => setWithInstallments(e.target.checked)} />
              Ofrecer cuotas sin interés (publicación Premium)
            </label>
          )}

          {priceValid && categoryId && (
            feesLoading ? (
              <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Loader2 size={12} className="spin" /> Calculando comisión...
              </p>
            ) : fees ? (
              <div style={{ marginBottom: 16, padding: "4px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9 }}>
                {[
                  ["Precio de venta", `$${Math.round(Number(price)).toLocaleString("es-AR")}`],
                  ["Cargo por vender", `-$${Math.round(fees.saleFeeAmount).toLocaleString("es-AR")}`],
                  ["Costo por ofrecer cuotas", installmentsCost > 0 ? `-$${Math.round(installmentsCost).toLocaleString("es-AR")}` : "$0"],
                  ...(shippingFree ? [["Costo por envío", shippingCost > 0 ? `-$${Math.round(shippingCost).toLocaleString("es-AR")}` : "$0"]] : []),
                  ["Impuestos estimados", "$0"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>{label}</span>
                    <strong style={{ fontSize: ".86rem" }}>{value}</strong>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 8px" }}>
                  <span style={{ fontSize: ".88rem", fontWeight: 600 }}>Recibís</span>
                  <strong style={{ fontSize: "1.05rem", color: "var(--success,#059669)" }}>${Math.round(netFinal).toLocaleString("es-AR")}</strong>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", marginBottom: 16 }}>No se pudo calcular la comisión</p>
            )
          )}

          {sellingAtLoss && (
            <p style={{ margin: "0 0 16px", padding: "10px 12px", background: "rgba(239,68,68,.1)",
              border: "1px solid var(--danger,#ef4444)", borderRadius: 8, fontSize: ".8rem",
              color: "var(--danger,#ef4444)", fontWeight: 600 }}>
              ⚠ Estás vendiendo a pérdida: lo que recibís (${Math.round(netFinal).toLocaleString("es-AR")}) es menor al costo del producto (${Math.round(priceFloor).toLocaleString("es-AR")}).
            </p>
          )}
        </div>
      )}

      {error && <p style={{ margin: "16px 0 0", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {step > 0 && (
          <button type="button" className="btn btn--ghost" onClick={goBack} disabled={saving}>Atrás</button>
        )}
        {step < WIZARD_STEPS.length - 1 ? (
          <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={goNext}>Siguiente</button>
        ) : (
          <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={publish} disabled={saving}>
            {saving ? <Loader2 size={14} className="spin" /> : "Publicar"}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Modal de publicación de un combo ────────────────────────────
// Mismo flujo que PublishModal (categoría, atributos, precio, envío gratis), con 3
// diferencias: no hay selector de fotos (se completan solas con las de cada producto del
// combo), hay un stepper de cantidad por producto, y el precio piso es la suma de costos.
function PublishComboModal({ comboId, onClose, onPublished }) {
  const [detail, setDetail] = useState(null); // { products, priceFloor }
  const [savingQty, setSavingQty] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [attrDefs, setAttrDefs] = useState([]);
  const [attrValues, setAttrValues] = useState({});
  const [showOptionalAttrs, setShowOptionalAttrs] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [shippingFree, setShippingFree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const comboLabel = useMemo(() => (detail?.products || [])
    .map(p => `${p.quantity > 1 ? `${p.quantity}× ` : ""}${p.name}`).join(" + "), [detail]);

  function searchCategories(q) {
    client.get("/seller/ml/categories/suggest", { params: { q: q ?? query } })
      .then(r => setSuggestions(r.data || []))
      .catch(() => setSuggestions([]));
  }

  useEffect(() => {
    client.get(`/seller/ml/combos/${comboId}`).then(r => {
      setDetail(r.data);
      const label = r.data.products.map(p => `${p.quantity > 1 ? `${p.quantity}× ` : ""}${p.name}`).join(" + ");
      setTitle(label);
      setQuery(label);
      searchCategories(label);
    }).catch(() => setError("No se pudo cargar el combo"));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!categoryId) { setAttrDefs([]); return; }
    client.get(`/seller/ml/categories/${categoryId}/attributes`)
      .then(r => {
        const defs = r.data || [];
        setAttrDefs(defs);
        // Un combo no tiene un único código de producto — solo precargamos la marca.
        if (defs.some(a => a.id === "BRAND")) {
          setAttrValues(prev => prev.BRAND ? prev : { ...prev, BRAND: "Genérica" });
        }
      })
      .catch(() => setAttrDefs([]));
  }, [categoryId]);

  async function changeQuantity(productId, quantity) {
    if (quantity < 1) return;
    setSavingQty(true);
    try {
      const products = detail.products.map(p => ({ productId: p.productId, quantity: p.productId === productId ? quantity : p.quantity }));
      const res = await client.patch(`/seller/ml/combos/${comboId}`, { products });
      setDetail(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo actualizar la cantidad");
    } finally {
      setSavingQty(false);
    }
  }

  const requiredAttrs = attrDefs.filter(a => a.required);
  const optionalAttrs = attrDefs.filter(a => !a.required);
  const missingAttrs  = requiredAttrs.filter(a => !attrValues[a.id]?.trim());

  const priceFloor = detail?.priceFloor ?? null;
  const priceValid = useMemo(() => {
    const p = Number(price);
    if (!p || p <= 0) return false;
    if (priceFloor != null && p < priceFloor) return false;
    return true;
  }, [price, priceFloor]);

  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);

  useEffect(() => {
    const p = Number(price);
    if (!categoryId || !p || p <= 0) { setFees(null); return; }
    let cancelled = false;
    setFeesLoading(true);
    const timer = setTimeout(() => {
      client.get("/seller/ml/listing-fees", { params: { price: p, categoryId } })
        .then(r => { if (!cancelled) setFees(r.data); })
        .catch(() => { if (!cancelled) setFees(null); })
        .finally(() => { if (!cancelled) setFeesLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [price, categoryId]);

  async function publish() {
    if (!categoryId) { setError("Elegí una categoría de Mercado Libre"); return; }
    if (!priceValid) {
      setError(priceFloor != null
        ? `El precio no puede ser menor a $${Math.round(priceFloor).toLocaleString("es-AR")} (costo total del combo)`
        : "Ingresá un precio válido");
      return;
    }
    if (missingAttrs.length > 0) {
      setError(`Faltan completar: ${missingAttrs.map(a => a.name).join(", ")}`);
      return;
    }

    setSaving(true); setError("");
    try {
      const attributes = attrDefs
        .filter(a => attrValues[a.id]?.trim())
        .map(a => ({
          id: a.id,
          value_name: a.valueType === "number_unit" ? formatNumberUnitValue(a, attrValues[a.id]) : attrValues[a.id],
        }));

      const res = await client.post(`/seller/ml/combos/${comboId}/publish`, {
        mlCategoryId: categoryId, price: Number(price), shippingFree, attributes,
        title, description,
      });
      onPublished(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo publicar el combo");
    } finally {
      setSaving(false);
    }
  }

  if (!detail) {
    return (
      <Modal title="Publicar combo en Mercado Libre" onClose={onClose} maxWidth={560}>
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <Loader2 size={20} className="spin" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Publicar combo en Mercado Libre" onClose={onClose} maxWidth={560}>
      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Productos del combo</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {detail.products.map(p => (
          <div key={p.productId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface-2,#f9fafb)", borderRadius: 8 }}>
            <span style={{ flex: 1, fontSize: ".84rem", fontWeight: 600 }}>{p.name}</span>
            <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>Stock: {p.availableStock}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button type="button" className="btn btn--ghost btn--sm" disabled={savingQty || p.quantity <= 1}
                onClick={() => changeQuantity(p.productId, p.quantity - 1)} style={{ padding: "2px 8px" }}>−</button>
              <span style={{ minWidth: 18, textAlign: "center", fontSize: ".84rem", fontWeight: 700 }}>{p.quantity}</span>
              <button type="button" className="btn btn--ghost btn--sm" disabled={savingQty}
                onClick={() => changeQuantity(p.productId, p.quantity + 1)} style={{ padding: "2px 8px" }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "0 0 16px", fontSize: ".76rem", color: "var(--text-secondary)" }}>
        Las fotos de la publicación se completan automáticamente con las fotos de estos productos — no hace falta subir nada nuevo.
      </p>

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Título de la publicación</label>
      <input className="form-input" style={{ marginBottom: 14 }} value={title} onChange={e => setTitle(e.target.value)} />

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Descripción</label>
      <textarea className="form-input" rows={4} style={{ marginBottom: 16, resize: "vertical" }}
        value={description} onChange={e => setDescription(e.target.value)} placeholder={`Combo: ${comboLabel}`} />

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Categoría de Mercado Libre</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input className="form-input" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchCategories()}
          placeholder="Palabras clave para buscar la categoría" />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => searchCategories()}><Search size={13} /></button>
      </div>
      <select className="form-input" style={{ marginBottom: 16 }} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        <option value="">Seleccioná...</option>
        {suggestions.map(s => <option key={s.categoryId} value={s.categoryId}>{s.categoryName}</option>)}
      </select>

      {requiredAttrs.length > 0 && (
        <div style={{ marginBottom: 12, padding: "12px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9 }}>
          <p style={{ margin: "0 0 10px", fontSize: ".78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Datos requeridos por esta categoría
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requiredAttrs.map(a => (
              <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
            ))}
          </div>
        </div>
      )}

      {optionalAttrs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button type="button" onClick={() => setShowOptionalAttrs(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand,#6366f1)", fontSize: ".8rem", fontWeight: 600, padding: 0 }}>
            {showOptionalAttrs ? "Ocultar" : "Mostrar"} características opcionales ({optionalAttrs.length})
          </button>
          {showOptionalAttrs && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, display: "flex", flexDirection: "column", gap: 8 }}>
              {optionalAttrs.map(a => (
                <AttributeField key={a.id} attr={a} value={attrValues[a.id]} onChange={v => setAttrValues(p => ({ ...p, [a.id]: v }))} />
              ))}
            </div>
          )}
        </div>
      )}

      <label style={{ fontSize: ".8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Precio en Mercado Libre</label>
      <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)}
        style={{ marginBottom: 4, borderColor: price && !priceValid ? "var(--danger,#ef4444)" : undefined }} />
      {priceFloor != null && (
        <small style={{ display: "block", marginBottom: 12, color: "var(--text-secondary)" }}>
          Costo total: ${Math.round(priceFloor).toLocaleString("es-AR")}
        </small>
      )}

      {priceValid && categoryId && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 9, marginBottom: 16 }}>
          {feesLoading ? (
            <span style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={12} className="spin" /> Calculando comisión...
            </span>
          ) : fees ? (
            <>
              <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>
                Cargo por vender: ${Math.round(fees.saleFeeAmount).toLocaleString("es-AR")}
              </span>
              <span style={{ fontSize: ".92rem", fontWeight: 700, color: "var(--success,#059669)" }}>
                Recibís: ${Math.round(fees.netAmount).toLocaleString("es-AR")}
              </span>
            </>
          ) : (
            <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>No se pudo calcular la comisión</span>
          )}
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".84rem", marginBottom: 16 }}>
        <input type="checkbox" checked={shippingFree} onChange={e => setShippingFree(e.target.checked)} />
        Ofrecer envío gratis (Mercado Libre descuenta su costo automáticamente de la venta)
      </label>

      {error && <p style={{ margin: "0 0 12px", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{error}</p>}

      <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={publish} disabled={saving}>
        {saving ? <Loader2 size={14} className="spin" /> : "Publicar combo"}
      </button>
    </Modal>
  );
}

// ML rechaza los atributos "number_unit" (LENGTH, WIDTH, HEIGHT, WEIGHT, MIN_RECOMMENDED_AGE,
// etc.) si el valor no trae una unidad ("50" no sirve, tiene que ser "50 cm") — como el
// vendedor solo tipea el número, se la agregamos automáticamente al armar el payload de
// publish(). Cada atributo tiene SU PROPIA unidad válida (cm, g, años...), que viaja desde ML
// en attr.defaultUnit (mlService.getCategoryAttributes) — este mapa es solo un respaldo por si
// ML no la informara para algún atributo puntual.
const NUMBER_UNIT_DEFAULTS = { LENGTH: "cm", WIDTH: "cm", HEIGHT: "cm", DEPTH: "cm", WEIGHT: "g" };

function unitFor(attr) {
  return attr.defaultUnit || NUMBER_UNIT_DEFAULTS[attr.id] || "cm";
}

function formatNumberUnitValue(attr, raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return trimmed;
  if (/[a-zA-Zµ"]/.test(trimmed)) return trimmed; // ya trae una unidad tipeada
  return `${trimmed} ${unitFor(attr)}`;
}

// Mercado Libre a veces da una lista fija (marca, por ejemplo) que no siempre tiene la opción
// real del producto — como igual mandamos value_name como texto (no value_id), ML acepta un
// valor que no esté en la lista, así que dejamos una opción "Otra" que pasa a un input libre.
function AttributeField({ attr, value, onChange }) {
  const isNumberUnit = attr.valueType === "number_unit";
  const hasOptions   = attr.values?.length > 0;
  const matchesOption = hasOptions && attr.values.some(v => v.name === value);
  const [customMode, setCustomMode] = useState(hasOptions && !!value && !matchesOption);

  return (
    <div>
      <label style={{ fontSize: ".78rem", display: "block", marginBottom: 3 }}>
        {attr.name}
        {isNumberUnit && (
          <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}> ({unitFor(attr)})</span>
        )}
      </label>
      {hasOptions && !customMode ? (
        <select className="form-input" value={value || ""} onChange={e => {
          if (e.target.value === "__custom__") { setCustomMode(true); onChange(""); return; }
          onChange(e.target.value);
        }}>
          <option value="">Seleccioná...</option>
          {attr.values.map(v => <option key={v.id || v.name} value={v.name}>{v.name}</option>)}
          <option value="__custom__">No está en la lista (escribir)...</option>
        </select>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <input
            className="form-input"
            type={isNumberUnit ? "number" : "text"}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
          />
          {hasOptions && (
            <button type="button" onClick={() => { setCustomMode(false); onChange(""); }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: ".74rem", color: "var(--brand,#4db81a)", textAlign: "left" }}>
              Elegir de la lista
            </button>
          )}
        </div>
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
  return { label: status, color: "#6b7280", bg: "rgba(107,114,128,.12)" };
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
  { id: "all",    label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "paused", label: "Pausadas" },
  { id: "error",  label: "Con error" },
];

function ListingsSection({ listings, statsByItem, onToggleStatus }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // Si el vendedor publicó todo con la misma cuenta de ML, no tiene sentido mostrar de cuál —
  // solo aporta cuando hay publicaciones de más de una cuenta distinta (alternó conexiones).
  const showAccount = useMemo(() => {
    const accounts = new Set(listings.map(l => l.ml_account_id).filter(Boolean));
    return accounts.size > 1;
  }, [listings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(l => {
      if (filter === "active" && l.status !== "active") return false;
      if (filter === "paused" && l.status !== "paused") return false;
      if (filter === "error" && l.pause_reason !== "charge_failed") return false;
      if (q && !l.product_name?.toLowerCase().includes(q) && !l.sku?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, filter, query]);

  if (listings.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0", fontSize: ".85rem" }}>
        Todavía no publicaste ningún producto. Andá a "Catálogo" para elegir uno de tu catálogo.
      </p>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nombre o SKU..."
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LISTING_FILTERS.map(f => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              style={{
                padding: "6px 12px", borderRadius: 99, border: "1px solid var(--border)", cursor: "pointer",
                background: filter === f.id ? "var(--brand)" : "#fff",
                color: filter === f.id ? "#fff" : "var(--text)",
                fontSize: ".78rem", fontWeight: 600,
              }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(l => {
            const stats = statsByItem[l.ml_item_id];
            return (
            <div key={l.ml_item_id} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px",
              border: "1px solid var(--border)", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--surface-2,#f3f4f6)" }}>
                  {l.image_url && <img src={l.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{l.product_name}</div>
                  <div style={{ fontSize: ".74rem", color: "var(--text-secondary)" }}>
                    SKU {l.sku || "—"} · ${Number(l.price || 0).toLocaleString("es-AR")} · Stock {l.available_stock ?? "—"} · {l.units_sold ?? 0} vendidas
                    {showAccount && (
                      <span style={{
                        marginLeft: 8, fontSize: ".68rem", fontWeight: 700, padding: "1px 7px",
                        borderRadius: 99, background: "var(--surface-2,#f3f4f6)", color: "var(--text-secondary)",
                      }}>
                        {l.ml_account_nickname || l.ml_account_id}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    {stats && `${stats.visits} visitas`}
                    {stats?.health != null && ` · Calidad: ${Math.round(stats.health.pct * 100)}%`}
                    {` · Actualizado ${new Date(l.updated_at).toLocaleDateString("es-AR")}`}
                  </div>
                </div>
                <StatusLabel status={l.status} pauseReason={l.pause_reason} />
                {l.permalink && (
                  <a href={l.permalink} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}>
                    <ExternalLink size={13} /> Ver
                  </a>
                )}
                <a href={editUrl(l.ml_item_id)} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}>
                  Editar
                </a>
                <button type="button" className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}
                  onClick={() => onToggleStatus(l.ml_item_id, l.status === "active" ? "paused" : "active")}>
                  {l.status === "active" ? <PauseCircle size={13} /> : <CheckCircle2 size={13} />}
                  {l.status === "active" ? "Pausar" : "Activar"}
                </button>
              </div>
              {stats?.fees && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: ".76rem", color: "var(--text-secondary)",
                  padding: "8px 12px", background: "var(--surface-2,#f9fafb)", borderRadius: 8 }}>
                  <span>Cargo por vender: ${Math.round(stats.fees.saleFeeAmount).toLocaleString("es-AR")}</span>
                  <span style={{ fontWeight: 700, color: "var(--success,#059669)" }}>
                    Recibís: ${Math.round(stats.fees.netAmount).toLocaleString("es-AR")}
                  </span>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Resumen — lo primero que ve el vendedor, responde "¿está todo bien?" sin
// tener que entrar a cada publicación una por una. ──────────────────────────

function SummaryCard({ icon, color, label, value, onClick }) {
  const Icon = icon;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className="card" style={{
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flex: "1 1 160px",
      textAlign: "left", cursor: onClick ? "pointer" : "default", border: "1px solid var(--border)",
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, color,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} />
      </div>
      <div>
        <div style={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: ".76rem", color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
      </div>
    </Tag>
  );
}

function SummaryTab({ summary, listings, onGoTo }) {
  const recent = useMemo(() => [...listings].slice(0, 6), [listings]);
  const s = summary || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SummaryCard icon={CheckCircle2} color="#059669" label="Publicaciones activas" value={s.active_count ?? "—"} onClick={() => onGoTo("listings")} />
        <SummaryCard icon={PauseCircle} color="#6b7280" label="Pausadas" value={s.paused_count ?? "—"} onClick={() => onGoTo("listings")} />
        <SummaryCard icon={AlertTriangle} color="#ef4444" label="Con error de cobro" value={s.error_count ?? "—"} onClick={() => onGoTo("listings")} />
        <SummaryCard icon={Ban} color="#d97706" label="Pausadas sin stock" value={s.stock_paused_count ?? "—"} onClick={() => onGoTo("listings")} />
        <SummaryCard icon={TrendingUp} color="#4db81a" label="Ventas de hoy" value={s.sales_today ?? "—"} onClick={() => onGoTo("wallet")} />
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
          <button type="button" onClick={() => onGoTo("listings")} className="btn btn--ghost btn--sm">Ver todas</button>
        </div>
        {recent.length === 0 ? (
          <p style={{ margin: 0, fontSize: ".84rem", color: "var(--text-secondary)" }}>Todavía no publicaste ningún producto.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recent.map(l => (
              <div key={l.ml_item_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "var(--surface-2,#f3f4f6)" }}>
                  {l.image_url && <img src={l.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <span style={{ flex: 1, minWidth: 0, fontSize: ".82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.product_name}</span>
                <StatusLabel status={l.status} pauseReason={l.pause_reason} compact />
                <span style={{ fontSize: ".74rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {new Date(l.updated_at).toLocaleDateString("es-AR")}
                </span>
              </div>
            ))}
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
  { id: "publish",  label: "Catálogo",            icon: Search },
  { id: "wallet",   label: "Cobro",               icon: Wallet },
];

export default function MercadoLibre() {
  const [status, setStatus] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, pendingDebt: 0, blockedDebt: 0, hasCard: false, lastFour: null, planId: "inicial", graceHours: 0 });
  const [summary, setSummary] = useState(null);
  const [listings, setListings] = useState([]);
  const [listingStats, setListingStats] = useState({});
  const [publishTarget, setPublishTarget] = useState(null);
  const [comboToPublish, setComboToPublish] = useState(null);
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [publishPending, setPublishPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const [listingError, setListingError] = useState("");

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
    }).catch(() => {}).finally(() => setLoading(false));
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
      {status?.connected ? (
        // Una vez conectado, la barra compacta de abajo ya muestra cuenta y estado —
        // este encabezado grande dejaba de aportar nada y ocupaba un tercio de la pantalla.
        <h1 style={{ margin: "0 0 12px", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-.02em" }}>Mercado Libre</h1>
      ) : (
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
          <MercadoLibreConnection status={status} summary={summary} onConnected={loadAll} onDisconnected={loadAll} />

          {status?.connected && (
            <>
              <div className="ml-tabs" style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
                {TABS.map(t => {
                  const TabIcon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                        background: "none", border: "none", cursor: "pointer",
                        borderBottom: active ? "2px solid #2D3277" : "2px solid transparent",
                        color: active ? "var(--text)" : "var(--text-secondary)",
                        fontWeight: active ? 700 : 500, fontSize: ".86rem", marginBottom: -1,
                      }}>
                      <TabIcon size={14} /> {t.label}
                      {t.id === "listings" && listings.length > 0 && (
                        <span style={{ fontSize: ".68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "var(--surface-2,#f3f4f6)", color: "var(--text-secondary)" }}>
                          {listings.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!wallet.hasCard && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px",
                  background: "rgba(217,119,6,.08)", borderRadius: 9, marginBottom: 16, fontSize: ".82rem", color: "#b45309" }}>
                  <AlertTriangle size={14} /> Guardá una tarjeta en la pestaña "Cobro" antes de publicar productos.
                </div>
              )}

              {/* Deuda acumulada del día — visible en cualquier pestaña. Aparece con la primera
                  venta que genera deuda y desaparece sola apenas el corte diario la cobra (vuelve
                  a $0), hasta la próxima venta que la genere de nuevo. */}
              {wallet.pendingDebt > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px",
                  background: "rgba(239,68,68,.08)", borderRadius: 9, marginBottom: 16, fontSize: ".82rem", color: "#b91c1c" }}>
                  <Wallet size={14} />
                  Deuda acumulada hoy: <strong>${Math.round(wallet.pendingDebt).toLocaleString("es-AR")}</strong>
                  &nbsp;— se cobra automáticamente {nextChargeLabel()}.
                </div>
              )}

              {tab === "summary" && (
                <SummaryTab summary={summary} listings={listings} onGoTo={setTab} />
              )}

              {tab === "listings" && (
                <div className="card ml-listings-tab" style={{ padding: "16px 20px" }}>
                  {listingError && (
                    <p style={{ margin: "0 0 14px", fontSize: ".82rem", color: "var(--danger,#ef4444)" }}>{listingError}</p>
                  )}
                  <ListingsSection listings={listings} statsByItem={listingStats} onToggleStatus={toggleListingStatus} />
                </div>
              )}

              {tab === "publish" && (
                <div className="card ml-publish-tab" style={{ padding: "16px 20px" }}>
                  <PageProducts mode="ml" onPublishToMl={product => setPublishTarget(product)} onComboReadyForMl={comboId => setComboToPublish(comboId)} />
                </div>
              )}

              {tab === "wallet" && (
                <WalletSection wallet={wallet} onChanged={loadAll} />
              )}
            </>
          )}

          {publishTarget && (
            <PublishModal
              product={publishTarget}
              onClose={() => setPublishTarget(null)}
              onPublished={(listing) => { setPublishTarget(null); setPublishPending(listing); loadAll(); }}
            />
          )}

          {comboToPublish && (
            <PublishComboModal
              comboId={comboToPublish}
              onClose={() => setComboToPublish(null)}
              onPublished={(listing) => { setComboToPublish(null); setPublishPending(listing); loadAll(); }}
            />
          )}

          {publishPending && createPortal(
            <div style={{
              position: "fixed", bottom: 24, left: 24, zIndex: 7000, maxWidth: 300,
              background: "#fff", border: "1px solid var(--border,#e2e8f0)", borderRadius: 999,
              boxShadow: "0 8px 24px rgba(0,0,0,.14)", padding: "9px 16px 9px 12px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Loader2 size={15} className="spin" style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
              <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text)" }}>Publicando en Mercado Libre...</span>
            </div>,
            document.body
          )}

          {publishSuccess && createPortal(
            <div style={{
              position: "fixed", bottom: 24, left: 24, zIndex: 7000, maxWidth: 380,
              background: "#fff", border: "1px solid var(--success,#059669)", borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,.16)", padding: "16px 18px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <CheckCircle2 size={20} color="var(--success,#059669)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: ".9rem" }}>¡Publicado en Mercado Libre!</strong>
                  <p style={{ margin: "2px 0 0", fontSize: ".8rem", color: "var(--text-secondary)" }}>
                    Tu producto ya está publicado en tu cuenta de Mercado Libre.
                  </p>
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
            </div>,
            document.body
          )}
        </>
      )}
    </main>
  );
}
