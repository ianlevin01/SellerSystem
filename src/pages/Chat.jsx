import { useEffect, useState, useRef, useCallback } from "react";
import client from "../api/client";
import { Send, MessageSquare, ShoppingCart, Check, Loader2, Search } from "lucide-react";

function formatTime(d) {
  return new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(d) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name = "") {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#3b82f6","#10b981","#f97316"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

// ── Message components ───────────────────────────────────────

function QuoteMessage({ msg, conversationId, onAccepted }) {
  const [accepting, setAccepting] = useState(false);
  const [accepted,  setAccepted]  = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await client.post(
        `/seller/chat/conversations/${conversationId}/quote/${msg.id}/accept`
      );
      setAccepted(true);
      onAccepted(res.data);
    } catch {/* */} finally { setAccepting(false); }
  }

  return (
    <div className="bubble-row bubble-row--customer">
      <div className="quote-card">
        <div className="quote-card__header">
          <ShoppingCart size={13} /> Solicitud de cotización
        </div>
        <div className="quote-card__items">
          {(msg.quote_data?.items || []).map((item, i) => (
            <div key={i} className="quote-card__item">
              <span>{item.name} × {item.quantity}</span>
              <span>${fmt(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="quote-card__total">
          <span>Total estimado</span>
          <span>${fmt(msg.quote_data?.total)}</span>
        </div>
        <div className="quote-card__actions">
          {accepted ? (
            <div className="quote-card__accepted">
              <Check size={14} /> Cotización aceptada
            </div>
          ) : (
            <button className="btn-accept-quote" onClick={handleAccept} disabled={accepting}>
              {accepting
                ? <><Loader2 size={13} className="spin" /> Procesando…</>
                : <><Check size={13} /> Aceptar y crear pedido</>
              }
            </button>
          )}
        </div>
        <div className="quote-card__time">{formatDate(msg.created_at)} · {formatTime(msg.created_at)}</div>
      </div>
    </div>
  );
}

function QuoteAcceptedBubble({ msg }) {
  return (
    <div className="bubble-row bubble-row--seller">
      <div className="quote-accepted-bubble">
        <div className="quote-accepted-bubble__header">
          <Check size={13} /> Cotización aceptada
        </div>
        <div className="quote-accepted-bubble__body">{msg.body}</div>
        <div className="quote-accepted-bubble__time">{formatTime(msg.created_at)}</div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, conversationId, onQuoteAccepted }) {
  if (msg.msg_type === "quote_request")
    return <QuoteMessage msg={msg} conversationId={conversationId} onAccepted={onQuoteAccepted} />;
  if (msg.msg_type === "quote_accepted")
    return <QuoteAcceptedBubble msg={msg} />;

  const isSeller = msg.sender === "seller";
  return (
    <div className={`bubble-row ${isSeller ? "bubble-row--seller" : "bubble-row--customer"}`}>
      <div className={`bubble ${isSeller ? "bubble--seller" : "bubble--customer"}`}>
        <div className="bubble__body">{msg.body}</div>
        <div className="bubble__time">{formatTime(msg.created_at)}</div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function Chat() {
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
    } finally { setLoadingConvs(false); }
  }, []);

  const fetchMessages = useCallback(async (convId) => {
    try {
      const res = await client.get(`/seller/chat/conversations/${convId}/messages`);
      setMessages(res.data.messages);
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
    } catch {/* */}
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!selected) return;
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
    setSending(true);
    try {
      const res = await client.post(`/seller/chat/conversations/${selected.id}/messages`, { body: reply.trim() });
      setMessages(prev => [...prev, res.data]);
      setReply("");
      setConversations(prev => prev.map(c =>
        c.id === selected.id ? { ...c, last_message: reply.trim(), updated_at: new Date().toISOString() } : c
      ));
    } finally { setSending(false); }
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) handleSend(e);
  }

  const filtered = conversations.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Mensajes {totalUnread > 0 && <span className="chat-unread-title">{totalUnread}</span>}</h1>
        <p>Respondé consultas y gestioná cotizaciones de tus clientes.</p>
      </div>

      <div className="chat-layout">
        {/* ── Left: conversation list ── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar__header">
            <div className="chat-sidebar__title">
              Conversaciones
              {conversations.length > 0 && (
                <span className="chat-sidebar__count">{conversations.length}</span>
              )}
            </div>
            <div className="chat-search">
              <Search size={14} className="chat-search__icon" />
              <input
                className="chat-search__input"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="chat-conv-list">
            {loadingConvs ? (
              <div className="chat-conv-list__loading">
                {[1,2,3,4].map(i => (
                  <div key={i} className="chat-conv-skeleton">
                    <div className="skeleton" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div className="skeleton" style={{ height: 13, borderRadius: 6, width: "60%" }} />
                      <div className="skeleton" style={{ height: 11, borderRadius: 6, width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="chat-conv-list__empty">
                <MessageSquare size={28} style={{ opacity: .3 }} />
                <p>{search ? "Sin resultados" : "No hay consultas todavía"}</p>
              </div>
            ) : (
              filtered.map(conv => {
                const color = avatarColor(conv.customer_name);
                const isActive = selected?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    className={`chat-conv-item ${isActive ? "chat-conv-item--active" : ""}`}
                    onClick={() => { setSelected(conv); setMessages([]); }}
                  >
                    <div className="chat-conv-item__avatar" style={{ background: color }}>
                      {initials(conv.customer_name)}
                    </div>
                    <div className="chat-conv-item__info">
                      <div className="chat-conv-item__name">{conv.customer_name}</div>
                      {conv.last_message && (
                        <div className="chat-conv-item__preview">{conv.last_message}</div>
                      )}
                    </div>
                    <div className="chat-conv-item__meta">
                      <div className="chat-conv-item__time">{formatDate(conv.updated_at)}</div>
                      {conv.unread_count > 0 && (
                        <div className="chat-unread">{conv.unread_count}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: message thread ── */}
        <div className="chat-main">
          {!selected ? (
            <div className="chat-empty">
              <div className="chat-empty__icon">
                <MessageSquare size={24} />
              </div>
              <p>Seleccioná una conversación para responder</p>
              <span className="chat-empty__hint">
                Los clientes pueden escribirte desde tu tienda
              </span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="chat-main__header">
                <div
                  className="chat-main__avatar"
                  style={{ background: avatarColor(selected.customer_name) }}
                >
                  {initials(selected.customer_name)}
                </div>
                <div className="chat-main__info">
                  <div className="chat-main__name">{selected.customer_name}</div>
                  <div className="chat-main__contact">
                    {[selected.customer_email, selected.customer_phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </div>
                </div>
              </div>

              {/* Thread */}
              <div className="chat-thread">
                {loadingMsgs ? (
                  <div className="chat-thread__loading">
                    {[1,2,3].map(i => (
                      <div key={i} className={`skeleton`} style={{ height: 44, borderRadius: 12, maxWidth: "55%", alignSelf: i % 2 === 0 ? "flex-end" : "flex-start" }} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-thread__empty">
                    Iniciá la conversación respondiendo abajo.
                  </div>
                ) : (
                  messages.map(msg => (
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

              {/* Composer */}
              <form className="chat-composer" onSubmit={handleSend}>
                <input
                  className="form-input"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Escribí tu respuesta… (Enter para enviar)"
                  disabled={sending}
                  autoFocus
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={sending || !reply.trim()}
                  style={{ padding: "0 18px", height: 40, flexShrink: 0 }}
                >
                  {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
