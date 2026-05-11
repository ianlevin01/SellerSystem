// src/pages/Contact.jsx
// Página de contacto interna de Ventaz

import { Clock3, HelpCircle, Mail, MessageCircle, Send, ShieldCheck, Store, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

const SUPPORT_EMAIL = "soporte@ventaz.com.ar";
const WHATSAPP_NUMBER = "";

const reasons = [
  { icon: Store, title: "Mi tienda", text: "Configuración, link público, productos, descuentos o diseño." },
  { icon: WalletCards, title: "Cobros", text: "Consultas sobre saldo, transferencias o datos de pago." },
  { icon: MessageCircle, title: "Pedidos o clientes", text: "Dudas sobre una venta, reclamo o seguimiento de operación." },
  { icon: HelpCircle, title: "Soporte general", text: "Cualquier otra consulta sobre el uso de Ventaz." },
];

export default function Contact() {
  const [form, setForm] = useState({ reason: "Mi tienda", name: "", email: "", message: "" });

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(`Consulta Ventaz - ${form.reason || "Soporte"}`);
    const body = encodeURIComponent(`Nombre: ${form.name || "-"}\nEmail: ${form.email || "-"}\nMotivo: ${form.reason || "-"}\n\nMensaje:\n${form.message || ""}`);
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, [form]);

  const whatsappUrl = useMemo(() => {
    if (!WHATSAPP_NUMBER) return "";
    const text = encodeURIComponent(`Hola, necesito ayuda con Ventaz. Motivo: ${form.reason}. ${form.message}`);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }, [form]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="info-page contact-page">
      <section className="info-hero">
        <div className="info-hero__copy">
          <span className="info-kicker"><Mail size={16} /> Contacto</span>
          <h1>Estamos para ayudarte a operar mejor.</h1>
          <p>Si tenés una duda sobre tu tienda, productos, pedidos, cobros o configuración, mandanos el detalle y lo revisamos.</p>
        </div>

        <div className="contact-response-card">
          <Clock3 size={22} />
          <strong>Soporte claro y ordenado</strong>
          <span>Cuanto más detalle mandes, más rápido podemos ayudarte.</span>
        </div>
      </section>

      <section className="contact-layout">
        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          <div className="contact-form__head">
            <span className="info-kicker">Enviar consulta</span>
            <h2>Contanos qué necesitás.</h2>
            <p>Este formulario abre un email ya armado para que puedas enviarlo desde tu correo.</p>
          </div>

          <label>
            <span>Motivo</span>
            <select value={form.reason} onChange={(e) => update("reason", e.target.value)}>
              {reasons.map((reason) => <option key={reason.title} value={reason.title}>{reason.title}</option>)}
            </select>
          </label>

          <div className="contact-form__split">
            <label><span>Nombre</span><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Tu nombre" /></label>
            <label><span>Email</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="tu@email.com" /></label>
          </div>

          <label>
            <span>Mensaje</span>
            <textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Explicá qué pasó, en qué pantalla estás y qué necesitás resolver." rows={6} />
          </label>

          <div className="contact-actions">
            <a className="info-btn info-btn--primary" href={mailto}><Send size={16} /> Enviar por email</a>
            {whatsappUrl ? (
              <a className="info-btn info-btn--ghost" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
            ) : (
              <span className="contact-muted">WhatsApp pendiente de configurar</span>
            )}
          </div>
        </form>

        <aside className="contact-side">
          <div className="contact-side__card">
            <ShieldCheck size={22} />
            <h3>Antes de escribirnos</h3>
            <p>Incluí el nombre de tu tienda, el producto o pedido relacionado y una captura si el problema es visual.</p>
          </div>

          <div className="contact-reasons">
            {reasons.map(({ icon: Icon, title, text }) => (
              <article key={title}><Icon size={18} /><div><h3>{title}</h3><p>{text}</p></div></article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
