import { useEffect, useRef, useState, useCallback } from "react";
import { Image, Loader2, Send, ShieldCheck, X, Zap } from "lucide-react";
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
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [pendingKey,    setPendingKey]    = useState(null);
  const [pendingPreview,setPendingPreview] = useState(null);
  const [error,         setError]         = useState("");
  const [sentMsg,       setSentMsg]       = useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

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

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await client.post("/seller/chat/admin/upload-image", fd);
      setPendingKey(res.data.key);
    } catch {
      setPendingPreview(null);
      setError("No se pudo subir la imagen. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function clearPendingImage() {
    setPendingKey(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
  }

  async function handleSend(e) {
    e.preventDefault();
    const body = input.trim() || null;
    if (!body && !pendingKey || sending || uploading) return;
    setSending(true);
    setError("");
    setSentMsg("");
    try {
      await client.post("/seller/chat/admin/messages", { body, image_url: pendingKey || null });
      setInput("");
      clearPendingImage();
      setSentMsg("Mensaje enviado al equipo Ventaz.");
      setTimeout(() => setSentMsg(""), 3500);
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
                  {m.body && <div className="contact-chat-bubble__body">{m.body}</div>}
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: m.body ? 6 : 0 }}>
                      <img src={m.image_url} alt="imagen" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, display: "block", cursor: "zoom-in" }} />
                    </a>
                  )}
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
        {sentMsg && <div className="contact-chat-success">{sentMsg}</div>}
        {pendingPreview && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0 8px" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={pendingPreview} alt="preview" style={{ height: 56, width: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
              {uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={16} color="#fff" className="spin" />
                </div>
              )}
            </div>
            {!uploading && (
              <button type="button" onClick={clearPendingImage} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>
        )}
        <div className="contact-chat-composer__row">
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending || uploading}
            title="Adjuntar imagen"
            style={{ background: "none", border: "1.5px solid var(--border-dk)", borderRadius: 8, cursor: "pointer", color: "var(--text-3)", padding: "0 8px", height: 38, display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <Image size={16} />
          </button>
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
            disabled={(!input.trim() && !pendingKey) || sending || uploading}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
