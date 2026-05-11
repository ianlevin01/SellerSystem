import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Send, ShieldCheck, Zap } from "lucide-react";
import client from "../api/client";

function fmtTime(iso) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function Contact() {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState("");
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  const loadMessages = useCallback(async (silent = false) => {
    try {
      const r = await client.get("/seller/chat/admin/messages");
      setMessages(r.data.messages || []);
    } catch {
      if (!silent) setError("No se pudieron cargar los mensajes.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages(false);
    const id = setInterval(() => loadMessages(true), 8000);
    return () => clearInterval(id);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      await client.post("/seller/chat/admin/messages", { body });
      setInput("");
      await loadMessages(true);
    } catch {
      setError("No se pudo enviar el mensaje. Intentá de nuevo.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="contact-chat-page">

      {/* ── Header ── */}
      <div className="contact-chat-header">
        <div className="contact-chat-header__avatar">
          <img src="/ventaz.png" alt="Ventaz" style={{ height: 26, objectFit: "contain" }} />
        </div>
        <div>
          <div className="contact-chat-header__name">Equipo Ventaz</div>
          <div className="contact-chat-header__status">
            <span className="contact-chat-header__dot" />
            Soporte directo
          </div>
        </div>
        <div className="contact-chat-header__badges">
          <span className="contact-chat-badge"><ShieldCheck size={12} /> Privado</span>
          <span className="contact-chat-badge"><Zap size={12} /> Respuesta rápida</span>
        </div>
      </div>

      {/* ── Thread ── */}
      <div className="contact-chat-thread">
        {loading ? (
          <div className="contact-chat-thread__loading">
            <Loader2 size={20} className="spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="contact-chat-thread__empty">
            <div className="contact-chat-empty-icon">
              <img src="/ventaz.png" alt="" style={{ height: 32, opacity: .5 }} />
            </div>
            <strong>Mandanos tu consulta</strong>
            <span>Tienda, cobros, pedidos, configuración — cualquier duda que tengas.</span>
          </div>
        ) : (
          messages.map((m) => {
            const isAdmin = m.sender === "admin";
            return (
              <div
                key={m.id}
                className={`contact-chat-bubble-row ${isAdmin ? "contact-chat-bubble-row--admin" : "contact-chat-bubble-row--seller"}`}
              >
                {isAdmin && (
                  <div className="contact-chat-bubble-avatar">V</div>
                )}
                <div className={`contact-chat-bubble ${isAdmin ? "contact-chat-bubble--admin" : "contact-chat-bubble--seller"}`}>
                  {isAdmin && (
                    <div className="contact-chat-bubble__sender">Equipo Ventaz</div>
                  )}
                  <div className="contact-chat-bubble__body">{m.body}</div>
                  <div className="contact-chat-bubble__time">{fmtTime(m.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <form className="contact-chat-composer" onSubmit={handleSend}>
        {error && <div className="contact-chat-error">{error}</div>}
        <div className="contact-chat-composer__row">
          <input
            ref={inputRef}
            className="form-input contact-chat-composer__input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribí tu consulta..."
            disabled={sending}
            maxLength={2000}
          />
          <button
            type="submit"
            className="btn btn--primary contact-chat-composer__btn"
            disabled={!input.trim() || sending}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
