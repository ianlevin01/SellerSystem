// src/pages/Chat.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import client from "../api/client";
import { Send, MessageSquare, ShoppingCart, Check, Loader2 } from "lucide-react";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// ── Message renderers ────────────────────────────────────────
function QuoteMessage({ msg, conversationId, onAccepted }) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted]   = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await client.post(
        `/seller/chat/conversations/${conversationId}/quote/${msg.id}/accept`
      );
      setAccepted(true);
      onAccepted(res.data);
    } catch {
      /* show nothing; could add error state */
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
      <div style={{
        maxWidth: "76%",
        background: "var(--color-background-primary)",
        border: "1.5px solid #e0e7ff",
        borderRadius: "16px 16px 16px 4px",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "#eef2ff", padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: ".8rem", fontWeight: 600, color: "#4f46e5",
        }}>
          <ShoppingCart size={13} /> Solicitud de cotización
        </div>

        {/* Items */}
        <div style={{ padding: "10px 14px" }}>
          {(msg.quote_data?.items || []).map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              fontSize: ".83rem", marginBottom: 4, color: "var(--color-text-primary)",
            }}>
              <span>{item.name} × {item.quantity}</span>
              <span style={{ fontWeight: 500 }}>${fmt(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontWeight: 700, fontSize: ".9rem",
            paddingTop: 8, borderTop: "1px solid var(--color-border-tertiary)", marginTop: 4,
          }}>
            <span>Total</span>
            <span>${fmt(msg.quote_data?.total)}</span>
          </div>
        </div>

        {/* Accept button */}
        <div style={{ padding: "0 14px 14px" }}>
          {accepted ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: ".83rem", fontWeight: 600 }}>
              <Check size={14} /> Cotización aceptada
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                background: "#4f46e5", color: "#fff", border: "none",
                borderRadius: 8, padding: "8px 16px", fontSize: ".83rem",
                fontWeight: 600, cursor: "pointer", display: "flex",
                alignItems: "center", gap: 6,
                opacity: accepting ? 0.7 : 1,
              }}
            >
              {accepting
                ? <><Loader2 size={13} className="spin" /> Procesando…</>
                : <><Check size={13} /> Aceptar cotización</>
              }
            </button>
          )}
        </div>

        <div style={{ padding: "0 14px 10px", fontSize: ".72rem", color: "var(--color-text-tertiary)" }}>
          {formatDate(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

function QuoteAcceptedMessage({ msg }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <div style={{
        maxWidth: "70%", padding: "10px 14px",
        borderRadius: "16px 16px 4px 16px",
        background: "#dcfce7", border: "1px solid #bbf7d0",
        fontSize: ".87rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#15803d", marginBottom: 4 }}>
          <Check size={13} /> Cotización aceptada
        </div>
        <div style={{ color: "var(--color-text-primary)" }}>{msg.body}</div>
        <div style={{ fontSize: ".72rem", color: "var(--color-text-tertiary)", marginTop: 4, textAlign: "right" }}>
          {formatDate(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, conversationId, onQuoteAccepted }) {
  if (msg.msg_type === "quote_request") {
    return <QuoteMessage msg={msg} conversationId={conversationId} onAccepted={onQuoteAccepted} />;
  }
  if (msg.msg_type === "quote_accepted") {
    return <QuoteAcceptedMessage msg={msg} />;
  }

  const isSeller = msg.sender === "seller";
  return (
    <div style={{
      display: "flex",
      justifyContent: isSeller ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: "70%", padding: "10px 14px",
        borderRadius: isSeller ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isSeller ? "#6366f1" : "var(--color-background-primary)",
        color: isSeller ? "#fff" : "inherit",
        border: !isSeller ? "1px solid var(--color-border-tertiary)" : "none",
        fontSize: ".9rem",
      }}>
        <div>{msg.body}</div>
        <div style={{ fontSize: ".72rem", opacity: 0.7, marginTop: 4, textAlign: "right" }}>
          {formatDate(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

// ── Main Chat page ────────────────────────────────────────────
export default function Chat() {
  const [conversations, setConversations]       = useState([]);
  const [selected, setSelected]                 = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [reply, setReply]                       = useState("");
  const [sending, setSending]                   = useState(false);
  const [loadingConvs, setLoadingConvs]         = useState(true);
  const [loadingMsgs, setLoadingMsgs]           = useState(false);
  const messagesEndRef                          = useRef(null);
  const pollRef                                 = useRef(null);

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
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, unread_count: 0 } : c
      ));
    } catch { /* ignore polling errors */ }
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    } finally {
      setSending(false);
    }
  }

  function handleSelectConversation(conv) {
    setSelected(conv);
    setMessages([]);
  }

  function handleQuoteAccepted(data) {
    // Re-fetch messages to show the "quote_accepted" message from server
    if (selected) fetchMessages(selected.id);
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", gap: 0, border: "1px solid var(--color-border-tertiary)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>

      {/* Lista de conversaciones */}
      <div style={{ width: 300, minWidth: 300, borderRight: "1px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Conversaciones</h2>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: "var(--radius-md)" }} />)}
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: ".9rem" }}>
              No hay consultas todavía.
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                style={{
                  width: "100%", textAlign: "left", padding: "14px 16px",
                  background: selected?.id === conv.id ? "var(--color-background-secondary)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--color-border-tertiary)",
                  cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 500, fontSize: ".9rem" }}>{conv.customer_name}</span>
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: "#6366f1", color: "#fff", borderRadius: 999,
                      fontSize: ".7rem", padding: "2px 7px", fontWeight: 600,
                    }}>{conv.unread_count}</span>
                  )}
                </div>
                {conv.last_message && (
                  <span style={{ fontSize: ".8rem", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                    {conv.last_message}
                  </span>
                )}
                <span style={{ fontSize: ".75rem", color: "var(--color-text-tertiary, #9ca3af)" }}>
                  {formatDate(conv.updated_at)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panel de mensajes */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-background-secondary)" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", gap: 12 }}>
            <MessageSquare size={36} />
            <p style={{ fontSize: ".95rem" }}>Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
              <div style={{ fontWeight: 500 }}>{selected.customer_name}</div>
              {selected.customer_email && (
                <div style={{ fontSize: ".8rem", color: "var(--color-text-secondary)" }}>{selected.customer_email}</div>
              )}
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
              {loadingMsgs ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 12 }} />)}
                </div>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: ".9rem" }}>Sin mensajes aún.</p>
              ) : (
                messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    conversationId={selected.id}
                    onQuoteAccepted={handleQuoteAccepted}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de respuesta */}
            <form onSubmit={handleSend} style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", display: "flex", gap: 10 }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Escribí tu respuesta..."
                disabled={sending}
              />
              <button className="btn btn--primary" type="submit" disabled={sending || !reply.trim()} style={{ padding: "0 16px" }}>
                <Send size={15} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
