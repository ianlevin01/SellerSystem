// src/pages/Chat.jsx
// Chat premium de Ventaz
// cambio hecho por Yolo

import { useEffect, useState, useRef, useCallback } from "react";
import client from "../api/client";
import "../styles/Chat.css";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Image,
  Loader2,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";

function formatTime(d) {
  return new Date(d).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name = "") {
  const colors = [
    "#57d625",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#f97316",
  ];

  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  }

  return colors[Math.abs(h) % colors.length];
}

function shortPreview(text = "") {
  if (!text) return "Sin mensajes todavía";
  return text.length > 62 ? `${text.slice(0, 62)}…` : text;
}

function QuoteMessage({ msg, conversationId, onAccepted }) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleAccept() {
    setAccepting(true);

    try {
      const res = await client.post(
        `/seller/chat/conversations/${conversationId}/quote/${msg.id}/accept`
      );

      setAccepted(true);
      onAccepted(res.data);
    } catch {
      // El backend puede devolver error; no rompemos el chat.
    } finally {
      setAccepting(false);
    }
  }

  const items = msg.quote_data?.items || [];

  return (
    <div className="vtz-chat-message-row vtz-chat-message-row--customer">
      <article className="vtz-chat-quote">
        <header className="vtz-chat-quote__head">
          <span>
            <ShoppingCart size={15} />
            Solicitud de cotización
          </span>
          <small>{formatTime(msg.created_at)}</small>
        </header>

        <div className="vtz-chat-quote__items">
          {items.length === 0 ? (
            <div className="vtz-chat-quote__empty">Sin productos cargados</div>
          ) : (
            items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="vtz-chat-quote__item">
                <span>
                  {item.name} <b>× {item.quantity}</b>
                </span>
                <strong>${fmt(item.unit_price * item.quantity)}</strong>
              </div>
            ))
          )}
        </div>

        <div className="vtz-chat-quote__total">
          <span>Total estimado</span>
          <strong>${fmt(msg.quote_data?.total)}</strong>
        </div>

        {accepted ? (
          <div className="vtz-chat-quote__accepted">
            <CheckCircle2 size={16} />
            Cotización aceptada
          </div>
        ) : (
          <button
            type="button"
            className="vtz-chat-quote__button"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Loader2 size={15} className="vtz-chat-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check size={15} />
                Aceptar y crear pedido
              </>
            )}
          </button>
        )}
      </article>
    </div>
  );
}

function QuoteAcceptedBubble({ msg }) {
  return (
    <div className="vtz-chat-message-row vtz-chat-message-row--seller">
      <div className="vtz-chat-system-bubble">
        <span>
          <CheckCircle2 size={15} />
          Cotización aceptada
        </span>
        <p>{msg.body}</p>
        <small>{formatTime(msg.created_at)}</small>
      </div>
    </div>
  );
}

function MessageBubble({ msg, conversationId, onQuoteAccepted }) {
  if (msg.msg_type === "quote_request") {
    return (
      <QuoteMessage
        msg={msg}
        conversationId={conversationId}
        onAccepted={onQuoteAccepted}
      />
    );
  }

  if (msg.msg_type === "quote_accepted") {
    return <QuoteAcceptedBubble msg={msg} />;
  }

  const isSeller = msg.sender === "seller";

  return (
    <div
      className={`vtz-chat-message-row ${
        isSeller ? "vtz-chat-message-row--seller" : "vtz-chat-message-row--customer"
      }`}
    >
      <div
        className={`vtz-chat-bubble ${
          isSeller ? "vtz-chat-bubble--seller" : "vtz-chat-bubble--customer"
        }`}
      >
        <p style={{ color: isSeller ? "#fff" : "#0f172a" }}>{msg.body}</p>
        <small>{formatTime(msg.created_at)}</small>
      </div>
    </div>
  );
}

// ── Admin chat panel ───────────────────────────────────────────

function AdminChatPanel() {
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [pendingKey,    setPendingKey]    = useState(null);
  const [pendingPreview,setPendingPreview] = useState(null);
  const endRef  = useRef(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await client.get("/seller/chat/admin/messages");
      setMessages(res.data.messages || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await client.post("/seller/chat/admin/upload-image", fd);
      setPendingKey(res.data.key);
    } catch {
      setPendingPreview(null);
      alert("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  function clearPendingImage() {
    setPendingKey(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
  }

  async function send(e) {
    e.preventDefault();
    if ((!input.trim() && !pendingKey) || sending || uploading) return;
    setSending(true);
    try {
      await client.post("/seller/chat/admin/messages", {
        body:      input.trim() || null,
        image_url: pendingKey   || null,
      });
      setInput("");
      clearPendingImage();
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="vtz-chat-main">
      <header className="vtz-chat-main__head">
        <div className="vtz-chat-main__avatar" style={{ background: "#6366f1" }}>
          <Zap size={18} />
        </div>
        <div className="vtz-chat-main__info">
          <strong>Equipo Ventaz</strong>
          <span>Mensajes del equipo de soporte</span>
        </div>
        <div className="vtz-chat-main__badge" style={{ background: "rgba(99,102,241,.12)", color: "#6366f1" }}>
          <BadgeCheck size={16} />
          Ventaz
        </div>
      </header>

      <div className="vtz-chat-thread">
        {loading ? (
          <div className="vtz-chat-thread-loading">
            {[1, 2, 3].map((i) => <span key={i} className={i % 2 === 0 ? "is-right" : ""} />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="vtz-chat-thread-empty">
            No hay mensajes todavía. Cuando el equipo Ventaz te escriba, vas a verlo acá.
          </div>
        ) : (
          messages.map((m) => {
            const isSeller = m.sender === "seller";
            return (
              <div
                key={m.id}
                className={`vtz-chat-message-row ${isSeller ? "vtz-chat-message-row--seller" : "vtz-chat-message-row--customer"}`}
              >
                <div className={`vtz-chat-bubble ${isSeller ? "vtz-chat-bubble--seller" : "vtz-chat-bubble--customer"}`}
                  style={!isSeller ? { borderLeft: "3px solid #6366f1" } : {}}>
                  {!isSeller && (
                    <small style={{ color: "#6366f1", fontWeight: 700, fontSize: ".7rem", marginBottom: 2, display: "block" }}>
                      Equipo Ventaz
                    </small>
                  )}
                  {m.body && <p style={{ color: isSeller ? "#fff" : "#0f172a", margin: m.image_url ? "0 0 8px" : 0 }}>{m.body}</p>}
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                      <img src={m.image_url} alt="imagen" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, display: "block", cursor: "zoom-in" }} />
                    </a>
                  )}
                  <small style={{ marginTop: m.image_url || m.body ? 4 : 0, display: "block" }}>{formatTime(m.created_at)}</small>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {pendingPreview && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={pendingPreview} alt="preview" style={{ height: 64, width: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={18} color="#fff" className="vtz-chat-spin" />
              </div>
            )}
          </div>
          {!uploading && (
            <button type="button" onClick={clearPendingImage} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2 }}>
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <form className="vtz-chat-composer" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sending || uploading}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "0 4px", display: "flex", alignItems: "center", flexShrink: 0 }}
          title="Adjuntar imagen"
        >
          <Image size={19} />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
          placeholder="Escribí tu mensaje para el equipo Ventaz..."
          disabled={sending}
          rows={1}
          autoFocus
        />
        <button type="submit" disabled={sending || uploading || (!input.trim() && !pendingKey)}>
          {sending ? <Loader2 size={18} className="vtz-chat-spin" /> : <Send size={18} />}
        </button>
      </form>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function Chat() {
  const [chatTab,       setChatTab]       = useState("clients"); // "clients" | "admin"
  const [adminUnread,   setAdminUnread]   = useState(0);
  const [conversations, setConversations] = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [reply,         setReply]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [search,        setSearch]        = useState("");

  const endRef  = useRef(null);
  const pollRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await client.get("/seller/chat/conversations");
      setConversations(res.data);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId) => {
    try {
      const res = await client.get(`/seller/chat/conversations/${convId}/messages`);
      setMessages(res.data.messages);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch {
      // No rompemos la pantalla si falla una actualización.
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    // Poll admin unread count
    const pollAdmin = async () => {
      try {
        const res = await client.get("/seller/chat/admin/unread");
        setAdminUnread(Number(res.data) || 0);
      } catch { /* ignore */ }
    };
    pollAdmin();
    const timer = setInterval(pollAdmin, 15000);
    return () => clearInterval(timer);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selected) return undefined;

    setLoadingMsgs(true);
    fetchMessages(selected.id).finally(() => setLoadingMsgs(false));

    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(selected.id), 10000);

    return () => clearInterval(pollRef.current);
  }, [selected, fetchMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();

    if (!reply.trim() || !selected) return;

    const body = reply.trim();
    setSending(true);

    try {
      const res = await client.post(`/seller/chat/conversations/${selected.id}/messages`, {
        body,
      });

      setMessages((prev) => [...prev, res.data]);
      setReply("");

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, last_message: body, updated_at: new Date().toISOString() }
            : c
        )
      );
    } finally {
      setSending(false);
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const filtered = conversations.filter((c) => {
    const query = search.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(query) ||
      (c.customer_email || "").toLowerCase().includes(query)
    );
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <main className="vtz-chat">
      <section className="vtz-chat-hero">
        <div>
          <span className="vtz-chat-kicker">
            <Sparkles size={16} />
            Centro de mensajes
          </span>
          <h1>Mensajes</h1>
          <p>Respondé consultas y aceptá cotizaciones desde un solo lugar.</p>
        </div>

        <div className="vtz-chat-hero__status">
          <MessageCircle size={22} />
          <div>
            <strong>{totalUnread > 0 ? `${totalUnread} sin leer` : "Todo al día"}</strong>
            <span>{conversations.length} conversaciones</span>
          </div>
        </div>
      </section>

      {/* Tab switcher */}
      <div className="vtz-chat-tabs">
        <button
          type="button"
          className={`vtz-chat-tab ${chatTab === "clients" ? "is-active" : ""}`}
          onClick={() => setChatTab("clients")}
        >
          <MessageSquare size={15} />
          Clientes
          {totalUnread > 0 && <b>{totalUnread}</b>}
        </button>
        <button
          type="button"
          className={`vtz-chat-tab ${chatTab === "admin" ? "is-active" : ""}`}
          onClick={() => { setChatTab("admin"); setAdminUnread(0); }}
        >
          <Zap size={15} />
          Equipo Ventaz
          {adminUnread > 0 && <b>{adminUnread}</b>}
        </button>
      </div>

      {chatTab === "admin" ? (
        <section className="vtz-chat-layout" style={{ gridTemplateColumns: "1fr" }}>
          <AdminChatPanel />
        </section>
      ) : (
        <section className="vtz-chat-layout">
          <aside className="vtz-chat-sidebar">
            <header className="vtz-chat-sidebar__head">
              <div>
                <span>Clientes</span>
                <strong>Conversaciones</strong>
              </div>

              {totalUnread > 0 && <b>{totalUnread}</b>}
            </header>

            <div className="vtz-chat-search">
              <Search size={16} />
              <input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="vtz-chat-list">
              {loadingConvs ? (
                <div className="vtz-chat-loading-list">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="vtz-chat-conv-skeleton">
                      <span />
                      <div>
                        <i />
                        <i />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="vtz-chat-empty-list">
                  <MessageSquare size={28} />
                  <p>{search ? "No encontramos ese cliente" : "Todavía no hay consultas"}</p>
                </div>
              ) : (
                filtered.map((conv) => {
                  const isActive = selected?.id === conv.id;
                  const color = avatarColor(conv.customer_name);

                  return (
                    <button
                      type="button"
                      key={conv.id}
                      className={`vtz-chat-conv ${isActive ? "is-active" : ""}`}
                      onClick={() => {
                        setSelected(conv);
                        setMessages([]);
                      }}
                    >
                      <span className="vtz-chat-conv__avatar" style={{ background: color }}>
                        {initials(conv.customer_name) || <UserRound size={17} />}
                      </span>

                      <span className="vtz-chat-conv__body">
                        <strong>{conv.customer_name}</strong>
                        <small>{shortPreview(conv.last_message)}</small>
                      </span>

                      <span className="vtz-chat-conv__meta">
                        <small>{formatDate(conv.updated_at)}</small>
                        {conv.unread_count > 0 && <b>{conv.unread_count}</b>}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="vtz-chat-main">
            {!selected ? (
              <div className="vtz-chat-empty">
                <div className="vtz-chat-empty__icon">
                  <MessageSquare size={28} />
                </div>
                <h2>Elegí una conversación</h2>
                <p>Cuando un cliente escriba desde tu tienda, lo vas a poder responder desde acá.</p>
              </div>
            ) : (
              <>
                <header className="vtz-chat-main__head">
                  <div
                    className="vtz-chat-main__avatar"
                    style={{ background: avatarColor(selected.customer_name) }}
                  >
                    {initials(selected.customer_name) || <UserRound size={18} />}
                  </div>

                  <div className="vtz-chat-main__info">
                    <strong>{selected.customer_name}</strong>
                    <span>
                      {[selected.customer_email, selected.customer_phone].filter(Boolean).join(" · ") ||
                        "Sin datos de contacto"}
                    </span>
                  </div>

                  <div className="vtz-chat-main__badge">
                    <BadgeCheck size={16} />
                    Cliente
                  </div>
                </header>

                <div className="vtz-chat-thread">
                  {loadingMsgs ? (
                    <div className="vtz-chat-thread-loading">
                      {[1, 2, 3].map((item) => (
                        <span key={item} className={item % 2 === 0 ? "is-right" : ""} />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="vtz-chat-thread-empty">
                      No hay mensajes todavía. Escribí una respuesta abajo.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        conversationId={selected.id}
                        onQuoteAccepted={() => fetchMessages(selected.id)}
                      />
                    ))
                  )}
                  <div ref={endRef} />
                </div>

                <form className="vtz-chat-composer" onSubmit={handleSend}>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Escribí tu respuesta..."
                    disabled={sending}
                    rows={1}
                    autoFocus
                  />

                  <button type="submit" disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 size={18} className="vtz-chat-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
