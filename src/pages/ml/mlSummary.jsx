import { useMemo } from "react";
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, PauseCircle, TrendingUp } from "lucide-react";

// Resumen de Mercado Libre — lo usa la pestaña "Resumen" de /mercado-libre (track ecommerce) y
// el Dashboard (track mercadolibre, donde Resumen y Dashboard son lo mismo).

// ── Estado de una publicación — etiqueta de texto en vez de un switch, que no aclaraba
// si activaba, pausaba o sincronizaba. ────────────────────────────────────────────

function statusMeta(status, pauseReason) {
  if (status === "active") return { label: "Activo", color: "#059669", bg: "rgba(5,150,105,.1)" };
  if (status === "paused" && pauseReason === "stock") return { label: "Sin stock", color: "#d97706", bg: "rgba(217,119,6,.1)" };
  if (status === "paused" && pauseReason === "inactive") return { label: "Producto inactivo", color: "#6b7280", bg: "rgba(107,114,128,.12)" };
  if (status === "paused" && pauseReason === "charge_failed") return { label: "Error de cobro", color: "#ef4444", bg: "rgba(239,68,68,.1)" };
  if (status === "paused") return { label: "Pausado", color: "#6b7280", bg: "rgba(107,114,128,.12)" };
  if (status === "closed") return { label: "Cerrada en ML", color: "#ef4444", bg: "rgba(239,68,68,.1)" };
  return { label: status, color: "#6b7280", bg: "rgba(107,114,128,.12)" };
}

// Quién/qué pausó una publicación — para el detalle de "Actividad reciente".
function pauseReasonText(pauseReason) {
  if (pauseReason === "stock") return "pausado automático por falta de stock";
  if (pauseReason === "inactive") return "pausado automático porque el producto se desactivó";
  if (pauseReason === "charge_failed") return "pausado automático por cobro fallido";
  if (pauseReason === "plan_expired") return "pausado automático por plan vencido";
  return "pausado manualmente";
}

export function StatusLabel({ status, pauseReason, compact }) {
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

// onGoTo recibe el id de pestaña ("listings" | "wallet") — cada pantalla decide si eso es
// cambiar de pestaña o navegar a la página propia de esa sección.
export function SummaryTab({ summary, listings, statsByItem, onGoTo }) {
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
