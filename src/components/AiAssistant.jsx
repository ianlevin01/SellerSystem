import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import client from "../api/client";
import "../styles/AiAssistant.css";
import { Bot, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";

const STORAGE_KEY = "ventaz_ai_history";
const MAX_STORED  = 40;

const WELCOME = {
  role:    "assistant",
  content: "¡Hola! Soy Taz, tu asistente de Ventaz. Podés preguntarme cualquier cosa: cómo usar el panel, sobre tus productos, precios, stock, ganancias, lo que necesites.",
};

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function saveHistory(msgs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
  } catch {}
}

export default function AiAssistant() {
  const location   = useLocation();
  const pageIdMatch = location.pathname.match(/\/pages\/([^/]+)/);
  const pageId     = pageIdMatch ? pageIdMatch[1] : null;

  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const next    = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data } = await client.post("/seller/ai-assistant/chat", {
        messages: next.map(m => ({ role: m.role, content: m.content })),
        pageId:   pageId || undefined,
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.message || "No pude procesar tu consulta. Intentá de nuevo.";
      setMessages(prev => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages]);

  function clearHistory() {
    const reset = [WELCOME];
    setMessages(reset);
    saveHistory(reset);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="vtz-ai-fab-wrap">
        {!open && (
          <div className="vtz-ai-fab-tooltip">
            Disponible para ayudarte con la configuración de tu tienda
          </div>
        )}
        <button
          type="button"
          className={`vtz-ai-fab ${open ? "vtz-ai-fab--active" : ""}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Asistente Ventaz"
        >
          {open ? <X size={20} /> : <Sparkles size={20} />}
          {!open && <span>Taz</span>}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="vtz-ai-panel">
          {/* Header */}
          <div className="vtz-ai-panel__head">
            <div className="vtz-ai-panel__head-info">
              <div className="vtz-ai-panel__avatar">
                <Bot size={16} />
              </div>
              <div>
                <strong>Taz</strong>
                <span>Asistente de Ventaz</span>
              </div>
            </div>
            <div className="vtz-ai-panel__head-actions">
              <button
                type="button"
                className="vtz-ai-icon-btn"
                onClick={clearHistory}
                title="Limpiar historial"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                className="vtz-ai-icon-btn"
                onClick={() => setOpen(false)}
                title="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="vtz-ai-panel__messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`vtz-ai-msg vtz-ai-msg--${msg.role}`}
              >
                {msg.role === "assistant" && (
                  <div className="vtz-ai-msg__avatar">
                    <Bot size={13} />
                  </div>
                )}
                <div className="vtz-ai-msg__bubble">
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="vtz-ai-msg vtz-ai-msg--assistant">
                <div className="vtz-ai-msg__avatar">
                  <Bot size={13} />
                </div>
                <div className="vtz-ai-msg__bubble vtz-ai-msg__bubble--typing">
                  <Loader2 size={14} className="vtz-ai-spin" />
                  <span>Pensando...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="vtz-ai-panel__input">
            <textarea
              ref={inputRef}
              className="vtz-ai-textarea"
              placeholder="Preguntame lo que necesites..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              type="button"
              className="vtz-ai-send"
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
