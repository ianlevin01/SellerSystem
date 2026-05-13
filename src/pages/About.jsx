// src/pages/About.jsx
// Página institucional interna de Ventaz

import { ArrowRight, BadgeCheck, Boxes, ShieldCheck, Store, Truck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const values = [
  {
    icon: Store,
    title: "Una tienda propia, sin empezar de cero",
    text: "Creás una tienda con tu marca, elegís productos y compartís tu link sin armar toda la estructura desde el primer día.",
  },
  {
    icon: Boxes,
    title: "Catálogo y stock organizados",
    text: "Ventaz centraliza productos, disponibilidad, precios y pedidos para que vender sea más claro y menos manual.",
  },
  {
    icon: Truck,
    title: "Operación detrás de cada venta",
    text: "Mientras vos te enfocás en conseguir clientes, Ventaz acompaña la gestión de pedidos, logística y soporte.",
  },
];

const pillars = [
  "Sin compra inicial de stock",
  "Precios definidos por el vendedor",
  "Tienda compartible por link",
  "Soporte ante problemas",
  "Operación centralizada",
  "Catálogo en mejora constante",
];

export default function About() {
  return (
    <main className="info-page about-page">
      <section className="info-hero info-hero--dark">
        <div className="info-hero__copy">
          <span className="info-kicker"><Users size={16} /> Quiénes somos</span>
          <h1>Construimos Ventaz para que vender online sea más simple.</h1>
          <p>
            Ventaz es una plataforma pensada para personas que quieren generar ingresos online sin encargarse de la parte más pesada de un negocio: stock, pedidos, logística y soporte.
          </p>

          <a
            className="about-social-link"
            href="https://www.instagram.com/ventaz.oficial"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram oficial de Ventaz"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span>@ventaz.oficial</span>
          </a>

          <div className="info-hero__actions">
            <Link to="/pages" className="info-btn info-btn--primary">Ver mis tiendas <ArrowRight size={16} /></Link>
            <Link to="/contact" className="info-btn info-btn--ghost">Contactar soporte</Link>
          </div>
        </div>

        <div className="about-system-card">
          <div><span>Vendedor</span><strong>vende y comparte su tienda</strong></div>
          <div className="about-system-card__line" />
          <div><span>Ventaz</span><strong>acompaña la operación</strong></div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-section__head">
          <span className="info-kicker">Nuestra idea</span>
          <h2>Que más personas puedan empezar a vender.</h2>
          <p>Muchas personas no arrancan porque sienten que necesitan inversión, depósito, tiempo, experiencia o contactos. Ventaz busca reducir esa barrera con una estructura ya preparada.</p>
        </div>

        <div className="info-grid info-grid--3">
          {values.map(({ icon: Icon, title, text }) => (
            <article className="info-card" key={title}>
              <div className="info-card__icon"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-story">
        <div className="about-story__copy">
          <span className="info-kicker">Cómo trabajamos</span>
          <h2>Vos vendés. Ventaz te acompaña con el resto.</h2>
          <p>El vendedor elige productos del catálogo, define sus precios y comparte su tienda. Cuando entra una venta, la plataforma ayuda a ordenar el proceso para que cada operación quede registrada.</p>
        </div>

        <div className="about-steps">
          <div><span>01</span><strong>Creás tu tienda</strong><p>Configurás nombre, identidad y link público.</p></div>
          <div><span>02</span><strong>Elegís productos</strong><p>Agregás productos y definís tu precio de venta.</p></div>
          <div><span>03</span><strong>Compartís y vendés</strong><p>Tu cliente compra desde tu tienda online.</p></div>
          <div><span>04</span><strong>Seguís la operación</strong><p>Revisás pedidos, cobros y mensajes desde el panel.</p></div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-section__head info-section__head--compact">
          <span className="info-kicker">Lo que defendemos</span>
          <h2>Claridad, confianza y operación simple.</h2>
        </div>

        <div className="about-pillars">
          {pillars.map((item) => (
            <div key={item}><BadgeCheck size={17} /><span>{item}</span></div>
          ))}
        </div>
      </section>

      <section className="info-cta">
        <div>
          <ShieldCheck size={22} />
          <h2>Queremos que el vendedor tenga una estructura real para empezar.</h2>
          <p>Por eso el foco está en que la plataforma sea clara, usable y confiable desde el primer día.</p>
        </div>
        <Link to="/pages" className="info-btn info-btn--primary">Ir a mis tiendas <ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}
