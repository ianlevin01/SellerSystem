import { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus, Trash2, Edit3, ChevronDown, ChevronUp,
  Loader2, Sparkles, Copy, Check, Target, DollarSign,
  BarChart2, Search, X, FileText, Image, MessageCircle,
  Send, ArrowRight, Megaphone, GraduationCap,
  Calendar, Store, Layers, ExternalLink, Unlink,
  Play, Pause, RefreshCw, Zap, TrendingUp, Eye,
  MousePointer, Activity, Bot, ChevronRight,
} from "lucide-react";
import client from "../api/client";

const ACADEMY_URL = import.meta.env.VITE_ACADEMY_URL || "https://academia.ventaz.com.ar";

const OBJECTIVES = [
  { value: "sales",     label: "Ventas",        desc: "Conversiones directas" },
  { value: "traffic",   label: "Tráfico",        desc: "Visitas a la tienda" },
  { value: "awareness", label: "Reconocimiento", desc: "Dar a conocer la marca" },
  { value: "leads",     label: "Contactos",      desc: "Leads interesados" },
];

const META_OBJECTIVE_LABEL = {
  OUTCOME_SALES: "Ventas", OUTCOME_TRAFFIC: "Tráfico", OUTCOME_AWARENESS: "Reconocimiento",
  OUTCOME_LEADS: "Leads", LINK_CLICKS: "Clics", PAGE_LIKES: "Me gusta",
  BRAND_AWARENESS: "Reconocimiento", CONVERSIONS: "Conversiones",
};

const STATUS_META_LOCAL = {
  draft:  { label: "Borrador",   color: "#6b7280", bg: "#f3f4f6" },
  active: { label: "Activa",     color: "#059669", bg: "#d1fae5" },
  paused: { label: "Pausada",    color: "#d97706", bg: "#fef3c7" },
  ended:  { label: "Finalizada", color: "#4b5563", bg: "#e5e7eb" },
};

const FORMAT_LABELS = { feed: "Feed", story: "Historia", reel: "Reel", carousel: "Carrusel" };
const CTAS = ["Comprar ahora", "Ver más", "Conocé más", "Pedir ahora", "Contactar", "Registrarse"];
const IMAGE_STYLES = [
  { value: "clean",     label: "Producto limpio", desc: "Fondo neutro, e-commerce" },
  { value: "lifestyle", label: "Lifestyle",       desc: "Ambiente natural" },
  { value: "bold",      label: "Gráfico bold",    desc: "Alto contraste, moderno" },
  { value: "minimal",   label: "Minimalista",     desc: "Elegante, mucho espacio" },
];

const TOOL_LABELS = {
  get_campaigns:     "Campañas cargadas",
  get_insights:      "Métricas obtenidas",
  get_ad_sets:       "Conjuntos cargados",
  get_ads:           "Anuncios cargados",
  get_pages:         "Páginas obtenidas",
  get_pixels:        "Píxeles obtenidos",
  get_ad_images:     "Imágenes obtenidas",
  search_interests:  "Intereses buscados",
  create_campaign:   "Campaña creada ✓",
  pause_campaign:    "Campaña pausada",
  activate_campaign: "Campaña activada",
  update_budget:     "Presupuesto actualizado",
  create_ad_set:     "Conjunto de anuncios creado ✓",
  update_ad_set:     "Conjunto actualizado",
  create_ad_creative:"Creativo creado ✓",
  create_ad:         "Anuncio creado ✓",
};

const DATE_PRESETS = [
  { value: "today",      label: "Hoy" },
  { value: "last_7d",   label: "7 días" },
  { value: "last_30d",  label: "30 días" },
  { value: "this_month", label: "Este mes" },
];

// ── Helpers ───────────────────────────────────────────────────

const ls = { fontSize: ".78rem", color: "var(--text-secondary)", display: "block", marginBottom: 4, fontWeight: 500 };

function fmt(n, decimals = 0) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: decimals });
}
function fmtMoney(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${fmt(v)}`;
}
function fmtImpr(n) {
  const v = parseInt(n) || 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return fmt(v);
}

function LocalBadge({ status }) {
  const m = STATUS_META_LOCAL[status] || STATUS_META_LOCAL.draft;
  return (
    <span style={{ fontSize: ".72rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99,
      background: m.bg, color: m.color, letterSpacing: ".01em" }}>
      {m.label}
    </span>
  );
}

function MetaStatusBadge({ status }) {
  const isActive = status === "ACTIVE";
  const isPaused = status === "PAUSED";
  const color  = isActive ? "#059669" : isPaused ? "#d97706" : "#6b7280";
  const bg     = isActive ? "#d1fae5" : isPaused ? "#fef3c7" : "#f3f4f6";
  const label  = isActive ? "Activa" : isPaused ? "Pausada" : "Archivada";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".72rem",
      fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: bg, color }}>
      {isActive && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color,
          animation: "pulse 2s infinite", flexShrink: 0 }} />
      )}
      {label}
    </span>
  );
}

function useClipboard() {
  const [copied, setCopied] = useState(null);
  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 1800);
    });
  }
  return { copy, copied };
}

function ProductSearch({ products, value, onChange, placeholder = "Buscar producto..." }) {
  const [query, setQuery] = useState(value?.name || "");
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (value) setQuery(value.custom_name || value.name || ""); }, [value]);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = query.trim()
    ? products.filter(p => (p.custom_name || p.name).toLowerCase().includes(query.toLowerCase()))
    : products;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <div style={{ position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
        <input className="form-input" style={{ paddingLeft: 30, paddingRight: 28 }}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); onChange(null); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
            <X size={13} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 200, overflowY: "auto" }}>
          {filtered.slice(0, 20).map(p => (
            <button key={p.id} type="button"
              onMouseDown={() => { onChange(p); setQuery(p.custom_name || p.name); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 13px",
                fontSize: ".85rem", background: value?.id === p.id ? "var(--surface-2)" : "none",
                border: "none", cursor: "pointer", color: "var(--text)" }}>
              <span style={{ fontWeight: 500 }}>{p.custom_name || p.name}</span>
              {p.custom_price && <span style={{ marginLeft: 8, fontSize: ".73rem", color: "var(--text-secondary)" }}>${Number(p.custom_price).toLocaleString("es-AR")}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AiFieldBtn({ loading, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} title="Generar con IA"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
        fontSize: ".72rem", fontWeight: 600, borderRadius: 6,
        border: "1px solid var(--border)", background: "var(--surface)",
        color: "var(--text-secondary)", cursor: loading ? "wait" : "pointer", flexShrink: 0 }}>
      {loading ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}
      {loading ? "" : "IA"}
    </button>
  );
}

// ── Meta Live: Real Campaigns Tab ─────────────────────────────

function CampaignCard({ campaign, onToggleStatus, onUpdateBudget, updating }) {
  const [editBudget,   setEditBudget]   = useState(false);
  const [budgetInput,  setBudgetInput]  = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const ins      = campaign.insights;
  const isActive = campaign.status === "ACTIVE";
  const isPaused = campaign.status === "PAUSED";
  const budgetArs = campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : null;
  const objLabel  = META_OBJECTIVE_LABEL[campaign.objective] || campaign.objective || "—";
  const borderColor = isActive ? "#059669" : isPaused ? "#d97706" : "#d1d5db";

  async function handleSaveBudget() {
    const val = parseFloat(budgetInput);
    if (!val || val <= 0) return;
    setSavingBudget(true);
    await onUpdateBudget(campaign.id, val);
    setSavingBudget(false);
    setEditBudget(false);
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <MetaStatusBadge status={campaign.status} />
            <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", background: "var(--surface-2,#f3f4f6)",
              padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{objLabel}</span>
          </div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text)", lineHeight: 1.3 }}>
            {campaign.name}
          </p>

          {/* Budget row */}
          {!editBudget ? (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <DollarSign size={12} color="var(--text-secondary)" />
              <span style={{ fontSize: ".84rem", color: "var(--text-secondary)" }}>
                {budgetArs ? `$${fmt(budgetArs)}/día` : "Sin presupuesto diario"}
              </span>
              <button type="button"
                onClick={() => { setBudgetInput(String(budgetArs || "")); setEditBudget(true); }}
                style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #e0e7ff",
                  background: "#eef2ff", color: "#6366f1", fontSize: ".72rem", fontWeight: 600, cursor: "pointer" }}>
                Editar
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
                  fontSize: ".82rem", color: "var(--text-secondary)" }}>$</span>
                <input className="form-input" style={{ paddingLeft: 20, width: 150, fontSize: ".84rem" }}
                  type="number" value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="Presupuesto diario" autoFocus
                  onKeyDown={e => e.key === "Enter" && handleSaveBudget()} />
              </div>
              <button className="btn btn--primary btn--sm" onClick={handleSaveBudget} disabled={savingBudget}>
                {savingBudget ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditBudget(false)}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => onToggleStatus(campaign.id, isActive ? "PAUSED" : "ACTIVE")}
          disabled={updating === campaign.id || (!isActive && !isPaused)}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
            borderRadius: 9, border: "1px solid transparent",
            background: isActive ? "#fef3c7" : isPaused ? "#d1fae5" : "var(--surface-2,#f3f4f6)",
            borderColor: isActive ? "#fde68a" : isPaused ? "#a7f3d0" : "var(--border)",
            cursor: (!isActive && !isPaused) ? "default" : "pointer",
            fontSize: ".82rem", fontWeight: 700,
            color: isActive ? "#b45309" : isPaused ? "#047857" : "#9ca3af",
            opacity: updating === campaign.id ? 0.6 : 1, transition: "all .15s",
            flexShrink: 0,
          }}
        >
          {updating === campaign.id
            ? <Loader2 size={13} className="spin" />
            : isActive
              ? <><Pause size={13} /> Pausar</>
              : isPaused
                ? <><Play size={13} /> Activar</>
                : "—"
          }
        </button>
      </div>

      {/* Metrics bar */}
      {ins ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          borderTop: "1px solid var(--border)", background: "var(--surface-2,#f9fafb)" }}>
          {[
            { label: "Gasto",       value: fmtMoney(ins.spend),                            color: "#6366f1" },
            { label: "Alcance",     value: fmtImpr(ins.reach),                             color: "#0ea5e9" },
            { label: "Clics",       value: fmtImpr(ins.clicks),                            color: "#8b5cf6" },
            { label: "CTR",         value: `${parseFloat(ins.ctr || 0).toFixed(2)}%`,      color: "#059669" },
          ].map((m, idx) => (
            <div key={m.label} style={{ padding: "13px 0", textAlign: "center",
              borderRight: idx < 3 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: ".68rem", color: "var(--text-secondary)", textTransform: "uppercase",
                letterSpacing: ".05em", marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "11px 18px", borderTop: "1px solid var(--border)",
          background: "var(--surface-2,#f9fafb)", fontSize: ".78rem",
          color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={12} style={{ opacity: .4 }} /> Sin métricas para el período seleccionado
        </div>
      )}
    </div>
  );
}

function MetaCampaignsSection({ metaStatus }) {
  const [campaigns,  setCampaigns]  = useState([]);
  const [acctStats,  setAcctStats]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [updating,   setUpdating]   = useState(null);
  const [datePreset, setDatePreset] = useState("last_7d");
  const [error,      setError]      = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (preset = datePreset, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [campaignsRes, insightsRes] = await Promise.all([
        client.get(`/seller/meta/campaigns?date_preset=${preset}`),
        client.get(`/seller/meta/insights?date_preset=${preset}`),
      ]);
      setCampaigns(campaignsRes.data || []);
      setAcctStats(insightsRes.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "No se pudieron cargar las campañas");
    } finally { setLoading(false); setRefreshing(false); }
  }, [datePreset]);

  useEffect(() => { if (metaStatus?.connected && metaStatus?.ad_account_id) load(); }, [metaStatus]);

  async function changePreset(p) {
    setDatePreset(p);
    await load(p, true);
  }

  async function handleToggle(campaignId, newStatus) {
    setUpdating(campaignId);
    try {
      await client.patch(`/seller/meta/campaigns/${campaignId}`, { status: newStatus });
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c));
    } catch (e) {
      setError(e.response?.data?.message || "No se pudo actualizar la campaña");
    } finally { setUpdating(null); }
  }

  async function handleUpdateBudget(campaignId, dailyBudgetArs) {
    try {
      await client.patch(`/seller/meta/campaigns/${campaignId}`, { daily_budget_ars: dailyBudgetArs });
      const newCents = Math.round(dailyBudgetArs * 100).toString();
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, daily_budget: newCents } : c));
    } catch (e) {
      setError(e.response?.data?.message || "No se pudo actualizar el presupuesto");
    }
  }

  if (!metaStatus?.connected || !metaStatus?.ad_account_id) {
    return (
      <div style={{ textAlign: "center", padding: "56px 0", color: "var(--text-secondary)" }}>
        <Target size={44} strokeWidth={1.2} style={{ opacity: .18, marginBottom: 16 }} />
        <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
          {!metaStatus?.connected ? "Conectá tu cuenta de Meta" : "Elegí una cuenta publicitaria"}
        </p>
        <p style={{ margin: 0, fontSize: ".84rem" }}>
          {!metaStatus?.connected
            ? "Usá el botón de arriba para conectar tu Facebook/Instagram y ver tus campañas reales"
            : "Seleccioná la cuenta publicitaria en el banner de conexión"}
        </p>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center",
      padding: "56px 0", color: "var(--text-secondary)" }}>
      <Loader2 size={18} className="spin" />
      <span style={{ fontSize: ".88rem" }}>Cargando campañas...</span>
    </div>
  );

  const active  = campaigns.filter(c => c.status === "ACTIVE");
  const paused  = campaigns.filter(c => c.status === "PAUSED");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Campañas en Meta</h3>
          <span style={{ fontSize: ".73rem", padding: "3px 10px", borderRadius: 99,
            background: "var(--surface-2,#f3f4f6)", color: "var(--text-secondary)", fontWeight: 600 }}>
            {active.length} activas · {paused.length} pausadas
          </span>
          <button onClick={() => load(datePreset, true)} disabled={refreshing}
            title="Actualizar" style={{ background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", padding: 4 }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--surface-2,#f3f4f6)", borderRadius: 9, padding: 3 }}>
          {DATE_PRESETS.map(p => (
            <button key={p.value} onClick={() => changePreset(p.value)}
              style={{ padding: "5px 13px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: ".74rem", fontWeight: 600, transition: "all .15s",
                background: datePreset === p.value ? "var(--surface)" : "none",
                color: datePreset === p.value ? "var(--text)" : "var(--text-secondary)",
                boxShadow: datePreset === p.value ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account KPI bar */}
      {acctStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Gasto total",    value: fmtMoney(acctStats.spend),         sub: "período seleccionado",  icon: DollarSign,   color: "#6366f1" },
            { label: "Alcance",        value: fmtImpr(acctStats.reach),           sub: "personas únicas",       icon: Eye,          color: "#0ea5e9" },
            { label: "Impresiones",    value: fmtImpr(acctStats.impressions),     sub: "total de vistas",       icon: TrendingUp,   color: "#8b5cf6" },
            { label: "Clics",          value: fmtImpr(acctStats.clicks),          sub: `CTR ${parseFloat(acctStats.ctr || 0).toFixed(2)}%`, icon: MousePointer, color: "#059669" },
          ].map(k => {
            const KIcon = k.icon;
            return (
              <div key={k.label} style={{ background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${k.color}14`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <KIcon size={15} color={k.color} />
                  </div>
                  <span style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".05em" }}>{k.label}</span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: ".73rem", color: "var(--text-secondary)", marginTop: 5 }}>{k.sub}</div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ padding: "11px 16px", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)",
          borderRadius: 9, marginBottom: 16, fontSize: ".82rem", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
          <Megaphone size={36} strokeWidth={1.4} style={{ opacity: .2, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: ".9rem", fontWeight: 500 }}>No hay campañas en esta cuenta</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c}
              onToggleStatus={handleToggle}
              onUpdateBudget={handleUpdateBudget}
              updating={updating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Local Draft Campaigns (organizer) ─────────────────────────

function DraftCampaignsSection({ pages, products }) {
  const [open,         setOpen]         = useState(false);
  const [campaigns,    setCampaigns]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [expanded,     setExpanded]     = useState(null);
  const [form,         setForm]         = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState("");
  const [creatives,    setCreatives]    = useState({});
  const [loadingCr,    setLoadingCr]    = useState({});
  const [creativeForm, setCreativeForm] = useState(null);
  const [editCreative, setEditCreative] = useState(null);
  const [genCreField,  setGenCreField]  = useState({});

  function load() {
    setLoading(true);
    client.get("/seller/ads/campaigns")
      .then(r => setCampaigns(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleOpen() {
    if (!open && campaigns.length === 0 && !loading) load();
    setOpen(p => !p);
  }

  async function loadCreatives(campaignId) {
    if (creatives[campaignId]) return;
    setLoadingCr(p => ({ ...p, [campaignId]: true }));
    try {
      const r = await client.get(`/seller/ads/campaigns/${campaignId}/creatives`);
      setCreatives(p => ({ ...p, [campaignId]: r.data || [] }));
    } catch { /**/ } finally { setLoadingCr(p => ({ ...p, [campaignId]: false })); }
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id); loadCreatives(id);
  }

  async function saveCampaign() {
    if (!form?.name?.trim()) { setMsg("El nombre es requerido"); return; }
    setSaving(true); setMsg("");
    try {
      if (form.id) {
        const r = await client.put(`/seller/ads/campaigns/${form.id}`, form);
        setCampaigns(p => p.map(c => c.id === form.id ? r.data : c));
      } else {
        const r = await client.post("/seller/ads/campaigns", form);
        setCampaigns(p => [r.data, ...p]);
      }
      setForm(null);
    } catch (e) { setMsg(e.response?.data?.message || "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function deleteCampaign(id) {
    if (!confirm("¿Eliminar esta campaña y todos sus creativos?")) return;
    try {
      await client.delete(`/seller/ads/campaigns/${id}`);
      setCampaigns(p => p.filter(c => c.id !== id));
      if (expanded === id) setExpanded(null);
    } catch { /**/ }
  }

  async function genCreativeField(field, product, setForm) {
    const key = `cr-${field}`;
    setGenCreField(p => ({ ...p, [key]: true }));
    try {
      const r = await client.post("/seller/ads/generate-field", {
        field, product_id: product?.id,
        product_name: product?.custom_name || product?.name, objective: "sales",
      });
      setForm(p => ({ ...p, [field]: r.data.value }));
    } catch { /**/ }
    finally { setGenCreField(p => ({ ...p, [key]: false })); }
  }

  const emptyForm = { name: "", objective: "sales", status: "draft", daily_budget: "", start_date: "", page_id: pages[0]?.id || "", notes: "" };

  return (
    <div style={{ marginTop: 24, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={handleOpen}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "var(--surface)", border: "none", cursor: "pointer", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Layers size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--text)" }}>Organizador de borradores</span>
          <span style={{ fontSize: ".73rem", color: "var(--text-secondary)", background: "var(--surface-2,#f3f4f6)", padding: "1px 8px", borderRadius: 99 }}>
            local
          </span>
        </div>
        {open ? <ChevronUp size={15} color="var(--text-secondary)" /> : <ChevronDown size={15} color="var(--text-secondary)" />}
      </button>

      {open && (
        <div style={{ padding: 18, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
              Planificá campañas y guardá creativos antes de publicarlos en Meta.
            </p>
            <button className="btn btn--primary btn--sm" onClick={() => { if (!open) setOpen(true); setForm(emptyForm); }}>
              <Plus size={13} /> Nueva
            </button>
          </div>

          {form && (
            <div className="card" style={{ padding: 18, marginBottom: 16, border: "1.5px solid var(--brand,#6366f1)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: ".9rem", fontWeight: 700 }}>{form.id ? "Editar" : "Nueva campaña"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={ls}>Nombre *</label>
                  <input className="form-input" placeholder="Ej: Campaña invierno"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label style={ls}>Objetivo</label>
                  <select className="form-input" value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))}>
                    {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={ls}>Presupuesto diario (ARS)</label>
                  <input className="form-input" type="number" placeholder="2000"
                    value={form.daily_budget || ""} onChange={e => setForm(p => ({ ...p, daily_budget: e.target.value || null }))} />
                </div>
                <div>
                  <label style={ls}>Estado</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_META_LOCAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              {msg && <p style={{ margin: "0 0 8px", fontSize: ".8rem", color: "var(--danger,#ef4444)" }}>{msg}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn--primary btn--sm" onClick={saveCampaign} disabled={saving}>
                  {saving ? <Loader2 size={12} className="spin" /> : <Check size={12} />} Guardar
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => { setForm(null); setMsg(""); }}>Cancelar</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: "20px 0", color: "var(--text-secondary)" }}>
              <Loader2 size={14} className="spin" /> Cargando...
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)" }}>
              <p style={{ margin: 0, fontSize: ".85rem" }}>Sin borradores. Creá tu primera campaña.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}
                    onClick={() => toggleExpand(c.id)}>
                    <LocalBadge status={c.status} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: ".88rem" }}>{c.name}</span>
                    {c.daily_budget && <span style={{ fontSize: ".77rem", color: "var(--text-secondary)" }}>${fmt(c.daily_budget)}/día</span>}
                    <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>{c.creatives_count || 0} creativos</span>
                    <button onClick={e => { e.stopPropagation(); setForm({ ...c }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 2 }}>
                      <Edit3 size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteCampaign(c.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger,#ef4444)", display: "flex", padding: 2 }}>
                      <Trash2 size={13} />
                    </button>
                    {expanded === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>

                  {expanded === c.id && (
                    <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
                      {loadingCr[c.id] ? (
                        <div style={{ padding: "12px 0", display: "flex", gap: 6, color: "var(--text-secondary)", fontSize: ".8rem" }}>
                          <Loader2 size={13} className="spin" /> Cargando creativos...
                        </div>
                      ) : (creatives[c.id] || []).length === 0 ? (
                        <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--text-secondary)" }}>Sin creativos todavía.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                          {(creatives[c.id] || []).map(cr => (
                            <div key={cr.id} style={{ background: "var(--surface-2,#f9fafb)", borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: ".72rem", fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)" }}>
                                  {FORMAT_LABELS[cr.format] || cr.format}
                                </span>
                                {cr.product_name && <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>{cr.product_name}</span>}
                              </div>
                              {cr.headline && <p style={{ margin: "2px 0", fontSize: ".82rem", fontWeight: 600 }}>{cr.headline}</p>}
                              {cr.primary_text && <p style={{ margin: "2px 0", fontSize: ".78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{cr.primary_text}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Campañas Tab ─────────────────────────────────────────────

function CampaignsTab({ metaStatus, pages, products }) {
  return (
    <div>
      <MetaCampaignsSection metaStatus={metaStatus} />
    </div>
  );
}

// ── Assistant Tab (full page, with tool_use) ──────────────────

const CHAT_LS_KEY = "vtz_pub_chat";
const INITIAL_MSG = { role: "assistant", content: "Hola. Soy tu asistente de publicidad con acceso real a Meta Ads. Puedo ver tus campañas, métricas y ejecutar acciones como pausar o cambiar presupuestos. ¿Qué necesitás?", actions: [] };

function AssistantTab({ metaStatus }) {
  const [messages, setMessages] = useState(() => {
    try { const s = localStorage.getItem(CHAT_LS_KEY); return s ? JSON.parse(s) : [INITIAL_MSG]; }
    catch { return [INITIAL_MSG]; }
  });
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const hasAccount = metaStatus?.connected && metaStatus?.ad_account_id;

  useEffect(() => {
    localStorage.setItem(CHAT_LS_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: msg, actions: [] }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.slice(1, -1).map(m => ({ role: m.role, content: m.content }));
      const r = await client.post("/seller/meta/ai", { message: msg, history });
      setMessages(p => [...p, { role: "assistant", content: r.data.reply, actions: r.data.actions || [] }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "No pude procesar tu consulta. Intentá de nuevo.", actions: [] }]);
    } finally { setLoading(false); }
  }

  function send() { return sendMessage(); }

  function clearChat() {
    localStorage.removeItem(CHAT_LS_KEY);
    setMessages([{ role: "assistant", content: "Chat limpio. ¿En qué te ayudo?", actions: [] }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 500, gap: 0 }}>
      {/* Context bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px 12px 0 0", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: hasAccount ? "#d1fae5" : "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={16} color={hasAccount ? "#059669" : "#9ca3af"} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: ".85rem", fontWeight: 700 }}>Asistente de publicidad</p>
            <p style={{ margin: 0, fontSize: ".72rem", color: hasAccount ? "#059669" : "var(--text-secondary)" }}>
              {hasAccount
                ? `Conectado a ${metaStatus.ad_account_name || metaStatus.ad_account_id}`
                : "Sin cuenta Meta — modo asesoría"}
            </p>
          </div>
        </div>
        <button onClick={clearChat} style={{ background: "none", border: "none", cursor: "pointer",
          color: "var(--text-secondary)", fontSize: ".75rem", display: "flex", alignItems: "center", gap: 4 }}>
          <RefreshCw size={12} /> Limpiar
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex",
        flexDirection: "column", gap: 12, background: "var(--surface-2,#f8f9fa)",
        border: "1px solid var(--border)", borderTop: "none" }}>

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#052e16",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                <Bot size={14} color="#86efac" />
              </div>
            )}
            <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Action chips */}
              {m.actions?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {m.actions.map((a, ai) => (
                    <span key={ai} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 8px", borderRadius: 99, fontSize: ".68rem", fontWeight: 600,
                      background: a.ok ? "#d1fae5" : "#fee2e2",
                      color: a.ok ? "#059669" : "#dc2626",
                      border: `1px solid ${a.ok ? "#a7f3d0" : "#fecaca"}`,
                    }}>
                      {a.ok ? <Check size={9} /> : <X size={9} />}
                      {TOOL_LABELS[a.tool] || a.tool}
                    </span>
                  ))}
                </div>
              )}
              <div style={{
                padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                background: m.role === "user" ? "#052e16" : "var(--surface)",
                color: m.role === "user" ? "#fff" : "var(--text)",
                fontSize: ".85rem", lineHeight: 1.55,
                border: m.role === "assistant" ? "1px solid var(--border)" : "none",
                boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#052e16",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bot size={14} color="#86efac" />
            </div>
            <div style={{ padding: "11px 16px", borderRadius: "14px 14px 14px 2px",
              background: "var(--surface)", border: "1px solid var(--border)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", animation: "pulse 1.2s infinite" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", animation: "pulse 1.2s infinite .2s" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", animation: "pulse 1.2s infinite .4s" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — always visible */}
      <div style={{ padding: "8px 14px", background: "var(--surface-2,#f8f9fa)",
        borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)",
        display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--border)" }}>
        {[
          hasAccount ? "¿Cuáles son mis campañas activas?" : "¿Cuánto debería gastar en Meta?",
          hasAccount ? "Mostrá las métricas de los últimos 30 días" : "¿Qué es el CTR y cómo mejorarlo?",
          hasAccount ? "Quiero crear una campaña nueva" : "Explicame el funnel de conversión",
          hasAccount ? "¿Qué conjuntos de anuncios tengo?" : "¿Cómo defino mi audiencia ideal?",
        ].map(prompt => (
          <button key={prompt} onClick={() => sendMessage(prompt)}
            style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid var(--border)",
              background: "var(--surface)", cursor: "pointer", fontSize: ".74rem",
              color: "var(--text-secondary)", transition: "all .15s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#052e16"; e.currentTarget.style.color = "#052e16"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "none", border: "1px solid var(--border)",
        borderTop: "1px solid var(--border)", borderRadius: "0 0 12px 12px", background: "var(--surface)",
        display: "flex", gap: 8 }}>
        <input ref={inputRef} className="form-input" style={{ flex: 1, fontSize: ".85rem" }}
          placeholder={hasAccount ? "Preguntá sobre tus campañas o pedí una acción..." : "Preguntá sobre estrategia de Meta Ads..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
        />
        <button className="btn btn--primary btn--sm" onClick={send} disabled={loading || !input.trim()}
          style={{ background: "#052e16", borderColor: "#052e16" }}>
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Copy AI Tab ───────────────────────────────────────────────

function CopyTab({ pages, products, campaigns }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [objective,       setObjective]       = useState("sales");
  const [context,         setContext]         = useState("");
  const [storeName,       setStoreName]       = useState(pages[0]?.store_name || "");
  const [generating,      setGenerating]      = useState(false);
  const [result,          setResult]          = useState(null);
  const [msg,             setMsg]             = useState("");
  const [fieldLoading,    setFieldLoading]    = useState({});
  const [assigning,       setAssigning]       = useState(null);
  const [assignTo,        setAssignTo]        = useState("");
  const [assignFmt,       setAssignFmt]       = useState("feed");
  const [assignMsg,       setAssignMsg]       = useState({});
  const { copy, copied } = useClipboard();

  async function generate() {
    setGenerating(true); setMsg(""); setResult(null);
    try {
      const r = await client.post("/seller/ads/generate-copy", {
        product_id:   selectedProduct?.id,
        product_name: selectedProduct?.custom_name || selectedProduct?.name,
        product_desc: selectedProduct?.description,
        price:        selectedProduct?.custom_price || selectedProduct?.precio_1,
        objective, context, store_name: storeName,
      });
      setResult(r.data);
    } catch (e) { setMsg(e.response?.data?.message || "Error al generar"); }
    finally { setGenerating(false); }
  }

  async function generateField(field, variantIdx) {
    const key = `${variantIdx}-${field}`;
    setFieldLoading(p => ({ ...p, [key]: true }));
    try {
      const r = await client.post("/seller/ads/generate-field", {
        field, product_id: selectedProduct?.id,
        product_name: selectedProduct?.custom_name || selectedProduct?.name,
        objective,
        existing_copy: { headline: result?.variants[variantIdx]?.headline, primary_text: result?.variants[variantIdx]?.primary_text },
      });
      setResult(p => {
        const variants = [...(p.variants || [])];
        variants[variantIdx] = { ...variants[variantIdx], [field]: r.data.value };
        return { ...p, variants };
      });
    } catch { /**/ }
    finally { setFieldLoading(p => ({ ...p, [key]: false })); }
  }

  async function assignVariant(variant, idx) {
    if (!assignTo) return;
    try {
      await client.post(`/seller/ads/campaigns/${assignTo}/creatives`, {
        product_id: selectedProduct?.id, format: assignFmt,
        headline: variant.headline, primary_text: variant.primary_text,
        description: variant.description, cta: variant.cta,
      });
      setAssignMsg(p => ({ ...p, [idx]: "ok" }));
      setTimeout(() => setAssignMsg(p => ({ ...p, [idx]: "" })), 2000);
    } catch (e) {
      setAssignMsg(p => ({ ...p, [idx]: e.response?.data?.message || "Error" }));
    } finally { setAssigning(null); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: 700 }}>Generador de copy</h2>
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
          Creá copy optimizado para Meta Ads con 3 variantes (urgencia, beneficio, curiosidad).
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "380px 1fr" : "1fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={ls}>Producto (opcional)</label>
              <ProductSearch products={products} value={selectedProduct} onChange={setSelectedProduct} />
            </div>
            <div>
              <label style={ls}>Tienda</label>
              <input className="form-input" placeholder="Nombre de tu tienda" value={storeName}
                onChange={e => setStoreName(e.target.value)} />
            </div>
            <div>
              <label style={ls}>Objetivo</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {OBJECTIVES.map(o => (
                  <button key={o.value} type="button" onClick={() => setObjective(o.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${objective === o.value ? "var(--brand,#6366f1)" : "var(--border)"}`,
                      background: objective === o.value ? "var(--brand-light,#eef2ff)" : "var(--surface)",
                      color: objective === o.value ? "var(--brand,#6366f1)" : "var(--text-secondary)",
                      cursor: "pointer", fontSize: ".78rem", fontWeight: objective === o.value ? 700 : 400, transition: "all .15s", textAlign: "left" }}>
                    <span style={{ display: "block", fontWeight: 600 }}>{o.label}</span>
                    <span style={{ display: "block", fontSize: ".7rem", opacity: .7 }}>{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={ls}>Contexto adicional (opcional)</label>
              <textarea className="form-input" rows={2} placeholder="Descuentos, temporada, público objetivo..."
                value={context} onChange={e => setContext(e.target.value)} style={{ resize: "vertical" }} />
            </div>
          </div>
          {msg && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--danger,#ef4444)" }}>{msg}</p>}
          <button className="btn btn--primary" style={{ marginTop: 16, width: "100%" }}
            onClick={generate} disabled={generating}>
            {generating ? <><Loader2 size={14} className="spin" /> Generando...</> : <><Sparkles size={14} /> Generar copy</>}
          </button>
        </div>

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.variants?.map((v, i) => (
              <div key={i} className="card" style={{ padding: 18, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--brand,#6366f1)" }}>Variante {v.variant}</span>
                    <span style={{ marginLeft: 8, fontSize: ".76rem", color: "var(--text-secondary)" }}>{v.label}</span>
                  </div>
                  <button onClick={() => copy(`${v.headline}\n\n${v.primary_text}\n\n${v.description}`, i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", gap: 5, alignItems: "center", fontSize: ".75rem" }}>
                    {copied === i ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>

                {[
                  { key: "headline",     label: "Headline" },
                  { key: "primary_text", label: "Texto principal" },
                  { key: "description",  label: "Descripción" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ ...ls, margin: 0 }}>{label}</label>
                      <AiFieldBtn loading={!!fieldLoading[`${i}-${key}`]} onClick={() => generateField(key, i)} />
                    </div>
                    <textarea className="form-input" rows={key === "primary_text" ? 3 : 1}
                      value={v[key] || ""} style={{ resize: "vertical", fontSize: ".83rem" }}
                      onChange={e => setResult(p => {
                        const variants = [...p.variants];
                        variants[i] = { ...variants[i], [key]: e.target.value };
                        return { ...p, variants };
                      })} />
                  </div>
                ))}

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={ls}>CTA</label>
                    <select className="form-input" value={v.cta || ""}
                      onChange={e => setResult(p => {
                        const variants = [...p.variants];
                        variants[i] = { ...variants[i], cta: e.target.value };
                        return { ...p, variants };
                      })}>
                      {CTAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={() => setAssigning(assigning === i ? null : i)}
                  style={{ fontSize: ".76rem", background: "none", border: "1px solid var(--border)",
                    borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: "var(--text-secondary)" }}>
                  {assigning === i ? "Cancelar" : "Usar en campaña"}
                </button>

                {assigning === i && (
                  <div style={{ marginTop: 10, padding: "10px 0 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={ls}>Campaña</label>
                        <select className="form-input" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                          <option value="">Seleccioná</option>
                          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={ls}>Formato</label>
                        <select className="form-input" value={assignFmt} onChange={e => setAssignFmt(e.target.value)}>
                          {Object.entries(FORMAT_LABELS).map(([k, val]) => <option key={k} value={k}>{val}</option>)}
                        </select>
                      </div>
                    </div>
                    {assignMsg[i] && (
                      <p style={{ margin: 0, fontSize: ".78rem", color: assignMsg[i] === "ok" ? "var(--success,#059669)" : "var(--danger,#ef4444)" }}>
                        {assignMsg[i] === "ok" ? "Guardado en la campaña" : assignMsg[i]}
                      </p>
                    )}
                    <button className="btn btn--primary btn--sm" onClick={() => assignVariant(v, i)}>
                      <ArrowRight size={13} /> Guardar en campaña
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Image Generator Tab ───────────────────────────────────────

function ImageTab({ products, campaigns }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [prompt,          setPrompt]          = useState("");
  const [format,          setFormat]          = useState("feed");
  const [style,           setStyle]           = useState("clean");
  const [generating,      setGenerating]      = useState(false);
  const [result,          setResult]          = useState(null);
  const [msg,             setMsg]             = useState("");
  const [assignTo,        setAssignTo]        = useState("");
  const [assigning,       setAssigning]       = useState(false);
  const [assignOk,        setAssignOk]        = useState(false);

  async function generate() {
    setGenerating(true); setMsg(""); setResult(null); setAssignOk(false);
    try {
      const r = await client.post("/seller/ads/generate-image", {
        prompt, product_id: selectedProduct?.id,
        product_name: selectedProduct?.custom_name || selectedProduct?.name,
        format, style,
      }, { timeout: 120000 });
      setResult(r.data);
    } catch (e) {
      setMsg(e.code === "ECONNABORTED" ? "La generación tardó demasiado. Intentá de nuevo." : e.response?.data?.message || "Error al generar");
    } finally { setGenerating(false); }
  }

  async function saveToCreative() {
    if (!assignTo) return;
    setAssigning(true);
    try {
      await client.post(`/seller/ads/campaigns/${assignTo}/creatives`, {
        product_id: selectedProduct?.id, format, image_url: result.url,
        image_prompt: result.revised_prompt || prompt, cta: "Comprar ahora",
      });
      setAssignOk(true);
    } catch { /**/ } finally { setAssigning(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: 700 }}>Generador de imágenes</h2>
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
          Creá imágenes para tus anuncios con IA. Describí lo que necesitás.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "380px 1fr" : "1fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={ls}>Producto (opcional)</label>
              <ProductSearch products={products} value={selectedProduct} onChange={setSelectedProduct} />
            </div>
            <div>
              <label style={ls}>Formato</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setFormat(k)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${format === k ? "var(--brand,#6366f1)" : "var(--border)"}`,
                      background: format === k ? "var(--brand-light,#eef2ff)" : "var(--surface)",
                      color: format === k ? "var(--brand,#6366f1)" : "var(--text-secondary)",
                      cursor: "pointer", fontSize: ".82rem", fontWeight: format === k ? 700 : 400, transition: "all .15s" }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={ls}>Estilo visual</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {IMAGE_STYLES.map(s => (
                  <button key={s.value} type="button" onClick={() => setStyle(s.value)}
                    style={{ padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${style === s.value ? "var(--brand,#6366f1)" : "var(--border)"}`,
                      background: style === s.value ? "var(--brand-light,#eef2ff)" : "var(--surface)",
                      cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                    <span style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: style === s.value ? "var(--brand,#6366f1)" : "var(--text)" }}>{s.label}</span>
                    <span style={{ display: "block", fontSize: ".75rem", color: "var(--text-secondary)", marginTop: 1 }}>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={ls}>Dirección creativa (opcional)</label>
              <textarea className="form-input" rows={3}
                placeholder="Ej: producto en un escritorio moderno con luz natural..."
                value={prompt} onChange={e => setPrompt(e.target.value)} style={{ resize: "vertical" }} />
            </div>
          </div>
          {msg && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--danger,#ef4444)" }}>{msg}</p>}
          <button className="btn btn--primary" style={{ marginTop: 16, width: "100%" }}
            onClick={generate} disabled={generating}>
            {generating ? <><Loader2 size={14} className="spin" /> Generando...</> : <><Image size={14} /> Generar imagen</>}
          </button>
          {generating && (
            <p style={{ margin: "8px 0 0", fontSize: ".75rem", color: "var(--text-secondary)", textAlign: "center" }}>
              DALL-E tarda entre 15 y 30 segundos...
            </p>
          )}
        </div>

        {result && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <img src={result.url} alt="Imagen generada"
              style={{ width: "100%", display: "block", maxHeight: 500, objectFit: "contain", background: "#f9fafb" }} />
            <div style={{ padding: 16 }}>
              {result.revised_prompt && (
                <p style={{ margin: "0 0 14px", fontSize: ".75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {result.revised_prompt}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={ls}>Asignar a campaña</label>
                  <select className="form-input" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                    <option value="">Seleccioná una campaña</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button className="btn btn--primary btn--sm" onClick={saveToCreative}
                  disabled={!assignTo || assigning || assignOk}>
                  {assignOk ? <><Check size={13} /> Guardado</> : assigning ? <Loader2 size={13} className="spin" /> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Calculator Tab ────────────────────────────────────────────

function Metric({ label, value, sub, positive, neutral }) {
  const color = neutral ? "var(--text)" : positive ? "var(--success,#059669)" : "var(--danger,#ef4444)";
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <p style={{ margin: "0 0 2px", fontSize: ".73rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</p>
      <p style={{ margin: "0 0 3px", fontSize: "1.35rem", fontWeight: 800, color }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: ".73rem", color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function CalculatorTab({ products }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [costPrice,      setCostPrice]      = useState("");
  const [salePrice,      setSalePrice]      = useState("");
  const [shippingCost,   setShippingCost]   = useState("");
  const [freeShipping,   setFreeShipping]   = useState(false);
  const [dailyBudget,    setDailyBudget]    = useState("");
  const [durationDays,   setDurationDays]   = useState("30");
  const [cpm,            setCpm]            = useState("1500");
  const [conversionRate, setConversionRate] = useState("2");

  useEffect(() => {
    if (!selectedProduct) return;
    if (selectedProduct.custom_price) setSalePrice(String(selectedProduct.custom_price));
    if (selectedProduct.precio_1) setCostPrice(String(Math.round(selectedProduct.precio_1 * 0.7)));
  }, [selectedProduct]);

  const cost     = parseFloat(costPrice) || 0;
  const sale     = parseFloat(salePrice) || 0;
  const shipping = parseFloat(shippingCost) || 0;
  const budget   = parseFloat(dailyBudget) || 0;
  const days     = parseInt(durationDays) || 30;
  const cpmVal   = parseFloat(cpm) || 1500;
  const convRate = parseFloat(conversionRate) / 100 || 0.02;

  const totalAdSpend     = budget * days;
  const totalImpr        = cpmVal > 0 ? (totalAdSpend / cpmVal) * 1000 : 0;
  const estimatedClicks  = totalImpr * 0.02;
  const estimatedSales   = estimatedClicks * convRate;
  const costPerSale      = estimatedSales > 0 ? totalAdSpend / estimatedSales : 0;
  const revenuePerUnit   = sale - cost - (freeShipping ? 0 : shipping);
  const netProfit        = estimatedSales * revenuePerUnit - totalAdSpend;
  const roas             = sale > 0 && totalAdSpend > 0 ? (estimatedSales * sale) / totalAdSpend : 0;
  const breakEvenRoas    = cost > 0 ? sale / revenuePerUnit : 0;
  const breakEvenSales   = revenuePerUnit > 0 ? totalAdSpend / revenuePerUnit : 0;
  const isRentable       = roas >= breakEvenRoas && roas > 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: 700 }}>Calculadora de ROI</h2>
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
          Estimá la rentabilidad de una campaña antes de invertir.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={ls}>Producto (opcional)</label>
              <ProductSearch products={products} value={selectedProduct} onChange={setSelectedProduct} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={ls}>Costo del producto ($)</label>
                <input className="form-input" type="number" placeholder="500" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
              </div>
              <div>
                <label style={ls}>Precio de venta ($)</label>
                <input className="form-input" type="number" placeholder="1200" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              </div>
              <div>
                <label style={ls}>Costo de envío ($)</label>
                <input className="form-input" type="number" placeholder="0" value={shippingCost} onChange={e => setShippingCost(e.target.value)} disabled={freeShipping} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: ".82rem" }}>
                  <input type="checkbox" checked={freeShipping} onChange={e => setFreeShipping(e.target.checked)} />
                  Envío gratis
                </label>
              </div>
            </div>

            <div style={{ paddingTop: 4, borderTop: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 10px", fontSize: ".82rem", fontWeight: 600 }}>Presupuesto</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={ls}>Diario (ARS)</label>
                  <input className="form-input" type="number" placeholder="2000" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} />
                </div>
                <div>
                  <label style={ls}>Duración (días)</label>
                  <input className="form-input" type="number" placeholder="30" value={durationDays} onChange={e => setDurationDays(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={ls}>CPM estimado ($/1000 impr)</label>
                  <input className="form-input" type="number" placeholder="1500" value={cpm} onChange={e => setCpm(e.target.value)} />
                  <p style={{ margin: "2px 0 0", fontSize: ".7rem", color: "var(--text-secondary)" }}>AR promedio: $800–$2500</p>
                </div>
                <div>
                  <label style={ls}>Tasa de conversión (%)</label>
                  <input className="form-input" type="number" step="0.1" placeholder="2" value={conversionRate} onChange={e => setConversionRate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          {(!cost || !sale || !budget) ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
              <BarChart2 size={28} strokeWidth={1.5} style={{ opacity: .3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Completá costo, precio de venta y presupuesto</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card" style={{ padding: "14px 18px",
                borderLeft: `3px solid ${isRentable ? "var(--success,#059669)" : "var(--danger,#ef4444)"}`,
                background: isRentable ? "rgba(5,150,105,.03)" : "rgba(239,68,68,.03)" }}>
                <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: ".9rem",
                  color: isRentable ? "var(--success,#059669)" : "var(--danger,#ef4444)" }}>
                  {isRentable ? "Campaña rentable" : "Campaña no rentable"}
                </p>
                <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
                  {isRentable
                    ? `ROAS ${roas.toFixed(2)}x — superás el break-even de ${breakEvenRoas.toFixed(2)}x`
                    : `ROAS estimado ${roas.toFixed(2)}x — necesitás al menos ${breakEvenRoas.toFixed(2)}x`}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                <Metric label="Ganancia neta" positive={netProfit > 0}
                  value={`$${Math.round(netProfit).toLocaleString("es-AR")}`}
                  sub={`en ${days} días · $${Math.round(totalAdSpend).toLocaleString("es-AR")} invertidos`} />
                <Metric label="Ventas estimadas" neutral
                  value={Math.round(estimatedSales).toLocaleString("es-AR")}
                  sub={`break-even: ${Math.ceil(breakEvenSales)} ventas`} />
                <Metric label="ROAS" positive={roas >= breakEvenRoas}
                  value={`${roas.toFixed(2)}x`}
                  sub={`break-even: ${breakEvenRoas.toFixed(2)}x`} />
                <Metric label="Costo por venta" neutral
                  value={`$${Math.round(costPerSale).toLocaleString("es-AR")}`}
                  sub={`margen por venta: $${Math.round(revenuePerUnit).toLocaleString("es-AR")}`} />
              </div>

              <div className="card" style={{ padding: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: ".82rem", fontWeight: 700 }}>Desglose</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: ".84rem" }}>
                  {[
                    ["Inversión total",           `$${Math.round(totalAdSpend).toLocaleString("es-AR")}`],
                    ["Impresiones estimadas",       Math.round(totalImpr).toLocaleString("es-AR")],
                    ["Clics (CTR 2%)",              Math.round(estimatedClicks).toLocaleString("es-AR")],
                    ["Ventas estimadas",             Math.round(estimatedSales).toLocaleString("es-AR")],
                    ["Ingresos brutos",             `$${Math.round(estimatedSales * sale).toLocaleString("es-AR")}`],
                    ["− Costo producto",            `$${Math.round(estimatedSales * cost).toLocaleString("es-AR")}`],
                    !freeShipping && shipping > 0 ? ["− Envío", `$${Math.round(estimatedSales * shipping).toLocaleString("es-AR")}`] : null,
                    ["− Inversión publicitaria",    `$${Math.round(totalAdSpend).toLocaleString("es-AR")}`],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 5, borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>Ganancia neta</span>
                    <span style={{ fontWeight: 800, color: netProfit >= 0 ? "var(--success,#059669)" : "var(--danger,#ef4444)" }}>
                      ${Math.round(netProfit).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function Publicidad() {
  const [tab,            setTab]            = useState("campaigns");
  const [pages,          setPages]          = useState([]);
  const [products,       setProducts]       = useState([]);
  const [campaigns,      setCampaigns]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [metaStatus,      setMetaStatus]      = useState(null);
  const [metaConnecting,  setMetaConnecting]  = useState(false);
  const [metaError,       setMetaError]       = useState("");
  const [adAccounts,      setAdAccounts]      = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [savingAccount,   setSavingAccount]   = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("meta_connected")) window.history.replaceState({}, "", window.location.pathname);
    if (params.get("meta_error")) {
      setMetaError("No se pudo conectar con Meta. Intentá de nuevo.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    Promise.all([
      client.get("/seller/store/pages"),
      client.get("/seller/ads/campaigns"),
      client.get("/seller/meta/status"),
    ]).then(([pagesRes, campaignsRes, metaRes]) => {
      const pagesList = pagesRes.data || [];
      setPages(pagesList);
      setCampaigns(campaignsRes.data || []);
      setMetaStatus(metaRes.data);
      if (pagesList.length > 0) {
        return client.get(`/seller/store/pages/${pagesList[0].id}/products`, { params: { only_mine: "true", limit: 200 } });
      }
    }).then(prodRes => {
      if (prodRes) setProducts(prodRes.data?.products || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function connectMeta() {
    setMetaConnecting(true); setMetaError("");
    try {
      const r = await client.get("/seller/meta/connect");
      window.location.href = r.data.url;
    } catch {
      setMetaError("No se pudo iniciar la conexión. Intentá de nuevo.");
      setMetaConnecting(false);
    }
  }

  async function loadAdAccounts() {
    setLoadingAccounts(true);
    try {
      const r = await client.get("/seller/meta/ad-accounts");
      setAdAccounts(r.data || []);
      if (r.data?.length > 0) setSelectedAccount(r.data[0].id);
    } catch { setMetaError("No se pudieron cargar las cuentas."); }
    finally { setLoadingAccounts(false); }
  }

  async function saveAdAccount() {
    if (!selectedAccount) return;
    setSavingAccount(true);
    const account = adAccounts.find(a => a.id === selectedAccount);
    try {
      await client.post("/seller/meta/select-account", { ad_account_id: selectedAccount, ad_account_name: account?.name || null });
      setMetaStatus(p => ({ ...p, ad_account_id: selectedAccount, ad_account_name: account?.name }));
      setAdAccounts(null);
    } catch { setMetaError("No se pudo guardar. Intentá de nuevo."); }
    finally { setSavingAccount(false); }
  }

  async function disconnectMeta() {
    try {
      await client.delete("/seller/meta/disconnect");
      setMetaStatus({ connected: false });
      setAdAccounts(null);
    } catch { setMetaError("No se pudo desconectar."); }
  }

  const tabs = [
    { id: "campaigns",  label: "Campañas",    icon: Target },
    { id: "assistant",  label: "Asistente",   icon: Bot },
    { id: "copy",       label: "Copy IA",     icon: FileText },
    { id: "images",     label: "Imágenes IA", icon: Image },
    { id: "calculator", label: "Calculadora", icon: BarChart2 },
  ];

  return (
    <main>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 18, padding: "14px 20px",
        background: "linear-gradient(135deg, #052e16 0%, #14532d 65%, #166534 100%)",
        borderRadius: 14, color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.12)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Megaphone size={18} color="#86efac" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.2 }}>
              Publicidad digital
            </h1>
            <p style={{ margin: 0, fontSize: ".74rem", color: "rgba(255,255,255,.55)", marginTop: 2 }}>
              {metaStatus?.connected && metaStatus?.ad_account_id
                ? `Meta · ${metaStatus.ad_account_name || metaStatus.ad_account_id}`
                : "Meta Ads · Facebook & Instagram"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href={`${ACADEMY_URL}?token=${localStorage.getItem("seller_token") || ""}`}
            target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
              background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 9, color: "rgba(255,255,255,.8)", textDecoration: "none", fontSize: ".76rem", fontWeight: 600 }}>
            <GraduationCap size={13} /> Academia
          </a>
          <button onClick={() => setTab("assistant")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
              background: tab === "assistant" ? "rgba(134,239,172,.18)" : "rgba(255,255,255,.1)",
              border: `1px solid ${tab === "assistant" ? "rgba(134,239,172,.35)" : "rgba(255,255,255,.15)"}`,
              borderRadius: 9, cursor: "pointer", color: tab === "assistant" ? "#86efac" : "rgba(255,255,255,.85)",
              fontSize: ".76rem", fontWeight: 600 }}>
            <Bot size={13} /> Asistente IA
          </button>
        </div>
      </div>

      {/* Meta banner */}
      {metaError && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: ".82rem", color: "var(--danger,#ef4444)", fontWeight: 500 }}>{metaError}</span>
          <button onClick={() => setMetaError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {metaStatus && !metaStatus.connected && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: "rgba(24,119,242,.05)", border: "1px solid rgba(24,119,242,.18)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1877f2",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.15rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>f</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem" }}>Conectá tu cuenta de Meta</p>
              <p style={{ margin: "2px 0 0", fontSize: ".76rem", color: "var(--text-secondary)" }}>
                Gestioná campañas de Facebook e Instagram directamente desde Ventaz
              </p>
            </div>
          </div>
          <button className="btn btn--primary btn--sm" onClick={connectMeta} disabled={metaConnecting}
            style={{ flexShrink: 0, background: "#1877f2", borderColor: "#1877f2", padding: "8px 16px" }}>
            {metaConnecting ? <><Loader2 size={13} className="spin" /> Redirigiendo...</> : <><ExternalLink size={13} /> Conectar Meta</>}
          </button>
        </div>
      )}

      {metaStatus?.connected && (
        <div style={{ background: "rgba(5,150,105,.04)", border: "1px solid rgba(5,150,105,.18)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: ".84rem", fontWeight: 600, color: "var(--text)" }}>
                Meta conectado · {metaStatus.meta_user_name}
              </span>
              {metaStatus.ad_account_id ? (
                <span style={{ fontSize: ".76rem", padding: "2px 8px", borderRadius: 99, background: "#d1fae5", color: "#059669", fontWeight: 600 }}>
                  {metaStatus.ad_account_name || metaStatus.ad_account_id}
                </span>
              ) : (
                <span style={{ fontSize: ".74rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#fef3c7", color: "#d97706" }}>
                  Pendiente: elegir cuenta
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {!metaStatus.ad_account_id && !adAccounts && (
                <button className="btn btn--primary btn--sm" onClick={loadAdAccounts} disabled={loadingAccounts}
                  style={{ fontSize: ".74rem" }}>
                  {loadingAccounts ? <Loader2 size={12} className="spin" /> : "Elegir cuenta"}
                </button>
              )}
              {metaStatus.ad_account_id && !adAccounts && (
                <button className="btn btn--ghost btn--sm" onClick={loadAdAccounts} disabled={loadingAccounts}
                  style={{ fontSize: ".74rem" }}>
                  {loadingAccounts ? <Loader2 size={12} className="spin" /> : "Cambiar cuenta"}
                </button>
              )}
              <button className="btn btn--ghost btn--sm" onClick={disconnectMeta} style={{ fontSize: ".74rem" }}>
                <Unlink size={12} /> Desconectar
              </button>
            </div>
          </div>

          {adAccounts && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(5,150,105,.15)",
              display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {adAccounts.length === 0 ? (
                <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
                  No hay cuentas publicitarias en esta cuenta de Meta.
                </p>
              ) : (
                <>
                  <select className="form-input" style={{ flex: "1 1 220px", maxWidth: 380 }}
                    value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                    {adAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                  </select>
                  <button className="btn btn--primary btn--sm" onClick={saveAdAccount} disabled={savingAccount || !selectedAccount}>
                    {savingAccount ? <Loader2 size={12} className="spin" /> : "Confirmar"}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setAdAccounts(null)}>Cancelar</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24,
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 5 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 4, padding: "11px 6px",
                borderRadius: 10, border: "none", cursor: "pointer", transition: "all .18s",
                background: isActive ? "#052e16" : "none",
                color: isActive ? "#86efac" : "var(--text-secondary)" }}>
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
              <span style={{ fontSize: ".73rem", fontWeight: isActive ? 700 : 500, letterSpacing: ".01em" }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: "48px 0", color: "var(--text-secondary)" }}>
          <Loader2 size={18} className="spin" />
        </div>
      ) : (
        <>
          {tab === "campaigns"  && <CampaignsTab metaStatus={metaStatus} pages={pages} products={products} />}
          {tab === "assistant"  && <AssistantTab metaStatus={metaStatus} />}
          {tab === "copy"       && <CopyTab pages={pages} products={products} campaigns={campaigns} />}
          {tab === "images"     && <ImageTab products={products} campaigns={campaigns} />}
          {tab === "calculator" && <CalculatorTab products={products} />}
        </>
      )}
    </main>
  );
}
