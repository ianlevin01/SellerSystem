// src/pages/ml/ChatsTab.jsx — mensajería tipo lista + hilo (conversaciones a un costado, se abren
// al tocarlas) para las preguntas de compradores de Mercado Libre, con respuesta automática de
// IA configurable por vendedor. Cada "conversación" agrupa todas las preguntas de un mismo
// comprador sobre una misma publicación — Mercado Libre no tiene ese concepto nativamente
// (Preguntas y Respuestas es pregunta por pregunta), así que se arma acá agrupando por
// ml_item_id + buyer_ml_user_id.
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, Loader2, MessageCircle, Search, Send, Settings2, User } from "lucide-react";
import client from "../../api/client";
import { Modal } from "./mlShared";

function fmtShort(d) {
  const date = new Date(d);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function groupIntoConversations(questions) {
  const map = new Map();
  for (const q of questions) {
    const key = `${q.ml_item_id}__${q.buyer_ml_user_id}`;
    if (!map.has(key)) {
      map.set(key, { key, productName: q.product_name, imageUrl: q.image_url, buyerMlUserId: q.buyer_ml_user_id, messages: [] });
    }
    map.get(key).messages.push(q);
  }
  const list = [...map.values()];
  for (const conv of list) {
    conv.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const last = conv.messages[conv.messages.length - 1];
    conv.lastAt = last.created_at;
    conv.lastPreview = last.answer_text || last.question_text;
    conv.needsHuman = conv.messages.some(m => m.needs_human);
  }
  list.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  return list;
}

// ── Configuración del bot — modal que se abre/cierra, no un formulario fijo en pantalla ──────
function SettingsModal({ onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    client.get("/seller/ml/ai-reply-settings").then(r => setForm(r.data)).catch(() => setForm({ enabled: false, businessRules: "", productInfoInstructions: "" }));
  }, []);

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      await client.put("/seller/ml/ai-reply-settings", form);
      setSaveMsg("Guardado correctamente");
      onSaved?.(form.enabled);
    } catch {
      setSaveMsg("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Respuesta automática con IA" onClose={onClose} maxWidth={520}
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving || !form}>
            {saving ? <Loader2 size={13} className="seller-products-spin" /> : "Guardar"}
          </button>
          {saveMsg && <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{saveMsg}</span>}
        </div>
      }>
      {!form ? (
        <div className="seller-products-skeleton" style={{ height: 160 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface-2,#f9fafb)", borderRadius: 10 }}>
            <div>
              <strong style={{ fontSize: ".86rem", display: "block" }}>Activar respuesta automática</strong>
              <span style={{ fontSize: ".76rem", color: "var(--text-secondary)" }}>
                {form.enabled ? "La IA contesta sola cuando tiene datos suficientes." : "Las preguntas se guardan, pero no se contestan solas."}
              </span>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))} aria-pressed={form.enabled}
              style={{ width: 42, height: 24, borderRadius: 99, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: form.enabled ? "var(--brand,#4db81a)" : "#d1d5db", transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 3, left: form.enabled ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
            </button>
          </div>

          <div>
            <label style={{ fontSize: ".82rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Reglas del negocio</label>
            <p style={{ margin: "0 0 6px", fontSize: ".76rem", color: "var(--text-secondary)" }}>Qué decisión tomar en determinadas situaciones.</p>
            <textarea value={form.businessRules} onChange={e => setForm(f => ({ ...f, businessRules: e.target.value }))} rows={4}
              placeholder="Ej: Los envíos a CABA tardan 24-48hs. La garantía es de 6 meses..."
              style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", padding: "8px 10px", fontSize: ".84rem", fontFamily: "inherit", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontSize: ".82rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Información de productos</label>
            <p style={{ margin: "0 0 6px", fontSize: ".76rem", color: "var(--text-secondary)" }}>Qué información está bien que la IA comparta.</p>
            <textarea value={form.productInfoInstructions} onChange={e => setForm(f => ({ ...f, productInfoInstructions: e.target.value }))} rows={4}
              placeholder="Ej: Siempre aclarar que el color puede variar levemente según la pantalla..."
              style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", padding: "8px 10px", fontSize: ".84rem", fontFamily: "inherit", resize: "vertical" }} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function ConversationRow({ conv, active, onClick }) {
  return (
    <button type="button" className={`ml-chats-conv${active ? " is-active" : ""}`} onClick={onClick}>
      {conv.imageUrl ? (
        <img src={conv.imageUrl} alt="" className="ml-chats-conv__avatar" />
      ) : (
        <div className="ml-chats-conv__avatar"><MessageCircle size={18} /></div>
      )}
      <div className="ml-chats-conv__body">
        <div className="ml-chats-conv__top">
          <span className="ml-chats-conv__name">{conv.productName}</span>
          <span className="ml-chats-conv__time">{fmtShort(conv.lastAt)}</span>
        </div>
        <div className="ml-chats-conv__preview">
          {conv.needsHuman && <span className="ml-chats-conv__dot" title="Esperando respuesta humana" />}
          <span>{conv.lastPreview}</span>
        </div>
      </div>
    </button>
  );
}

function MessageExchange({ q }) {
  return (
    <div className="ml-chats-exchange">
      <div className="ml-chats-bubble ml-chats-bubble--in">{q.question_text}</div>
      {q.answer_text && !q.needs_human && (
        <div className="ml-chats-bubble ml-chats-bubble--out">
          {q.answer_text}
          <span className="ml-chats-bubble__meta">{q.answered_by === "ai" ? "Respondido por IA" : "Vos"}</span>
        </div>
      )}
      {q.needs_human && (
        <div className="ml-chats-bubble ml-chats-bubble--waiting">
          {q.answer_text || "La IA no tiene información suficiente para responder esto sola — todavía no se le contestó nada al comprador en Mercado Libre."}
          <span className="ml-chats-bubble__meta">Esperando tu respuesta</span>
        </div>
      )}
    </div>
  );
}

function Thread({ conv, onBack, onSent }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pending = [...conv.messages].reverse().find(m => !m.answer_text || m.needs_human);

  async function send() {
    if (!draft.trim() || !pending) return;
    setSending(true); setError("");
    try {
      await client.post(`/seller/ml/questions/${pending.id}/answer`, { text: draft.trim() });
      setDraft("");
      onSent();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ml-chats-thread">
      <div className="ml-chats-thread__header">
        <button type="button" className="ml-chats-thread__back" onClick={onBack}><ArrowLeft size={18} /></button>
        {conv.imageUrl ? (
          <img src={conv.imageUrl} alt="" className="ml-chats-conv__avatar" style={{ width: 34, height: 34 }} />
        ) : (
          <div className="ml-chats-conv__avatar" style={{ width: 34, height: 34 }}><User size={15} /></div>
        )}
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: ".86rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.productName}</strong>
          <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>Comprador #{conv.buyerMlUserId}</span>
        </div>
      </div>

      <div className="ml-chats-messages">
        {conv.messages.map(q => <MessageExchange key={q.id} q={q} />)}
      </div>

      {pending && (
        <div className="ml-chats-composer">
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Escribí una respuesta..."
            onKeyDown={e => e.key === "Enter" && send()} />
          <button type="button" onClick={send} disabled={sending || !draft.trim()}>
            {sending ? <Loader2 size={15} className="seller-products-spin" /> : <Send size={15} />}
          </button>
        </div>
      )}
      {error && <p style={{ margin: "0 12px 10px", fontSize: ".78rem", color: "var(--danger,#ef4444)" }}>{error}</p>}
    </div>
  );
}

export default function ChatsTab() {
  const [questions, setQuestions] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabled, setEnabled] = useState(null);

  function load() {
    client.get("/seller/ml/questions").then(r => setQuestions(r.data?.questions || [])).catch(() => setQuestions([]));
  }
  useEffect(load, []);
  useEffect(() => {
    client.get("/seller/ml/ai-reply-settings").then(r => setEnabled(!!r.data?.enabled)).catch(() => setEnabled(false));
  }, []);

  // Optimista — la barra tiene que responder al toque, no esperar la red. Si falla, se revierte.
  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    client.put("/seller/ml/ai-reply-settings", { enabled: next }).catch(() => setEnabled(!next));
  }

  const conversations = useMemo(() => (questions ? groupIntoConversations(questions) : []), [questions]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => c.productName.toLowerCase().includes(q) || c.buyerMlUserId.includes(q));
  }, [conversations, search]);
  const selected = conversations.find(c => c.key === selectedKey) || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Chats</h2>
          <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
            Preguntas de compradores sobre tus publicaciones.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: ".8rem", fontWeight: 600, color: enabled ? "var(--brand,#4db81a)" : "var(--text-secondary)" }}>
              Bot {enabled === null ? "" : enabled ? "activo" : "apagado"}
            </span>
            <button type="button" onClick={toggleEnabled} disabled={enabled === null} aria-pressed={!!enabled}
              style={{ width: 42, height: 24, borderRadius: 99, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: enabled ? "var(--brand,#4db81a)" : "#d1d5db", transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 3, left: enabled ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
            </button>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSettingsOpen(true)}>
            <Bot size={14} /> Configurar bot
          </button>
        </div>
      </div>

      {questions === null ? (
        <div className="seller-products-skeleton" style={{ height: 420 }} />
      ) : conversations.length === 0 ? (
        <div className="seller-products-empty">
          <MessageCircle size={34} />
          <h3>Todavía no hay preguntas</h3>
          <p>Cuando un comprador pregunte algo en una de tus publicaciones, va a aparecer acá.</p>
        </div>
      ) : (
        <div className={`ml-chats-layout${selected ? " ml-chats-layout--thread-open" : ""}`}>
          <div className="ml-chats-sidebar">
            <div className="ml-chats-sidebar__search">
              <div className="seller-products-search">
                <Search size={14} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por producto o comprador..." />
              </div>
            </div>
            <div className="ml-chats-sidebar__list">
              {filtered.length === 0 ? (
                <p className="ml-chats-sidebar__empty">Sin resultados</p>
              ) : filtered.map(c => (
                <ConversationRow key={c.key} conv={c} active={c.key === selectedKey} onClick={() => setSelectedKey(c.key)} />
              ))}
            </div>
          </div>

          {selected ? (
            <Thread conv={selected} onBack={() => setSelectedKey(null)} onSent={load} />
          ) : (
            <div className="ml-chats-thread">
              <div className="ml-chats-thread__empty">
                <MessageCircle size={30} />
                <span>Elegí una conversación para ver los mensajes</span>
              </div>
            </div>
          )}
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onSaved={setEnabled} />}
    </div>
  );
}
