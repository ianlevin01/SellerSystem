// src/pages/LandingMl.jsx
// Landing de campaña — Mercado Libre (ruta /ml)
// Mismo esqueleto/estética que LandingEcom.jsx (misma paleta, misma estructura de secciones),
// pero con el copy adaptado: acá no hay "tienda propia" — el vendedor conecta su propia cuenta
// de Mercado Libre y publica el catálogo de Ventaz. Nosotros ponemos productos + logística +
// integración con ML, el vendedor solo publica.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Landing.css";
import useSeo from "../hooks/useSeo";
import useJsonLd from "../hooks/useJsonLd";
import { buildFaqSchema } from "../utils/seo";
import { SEO, FAQS } from "../content/landingMl";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Headphones,
  Layers,
  LayoutDashboard,
  Link2,
  Menu,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "que-es", label: "Qué es" },
  { id: "quienes-somos", label: "Quiénes somos" },
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "beneficios", label: "Beneficios" },
  { id: "confianza", label: "Confianza" },
  { id: "dudas", label: "Dudas" },
];

const HERO_POINTS = [
  "Sin comprar stock",
  "Sin guardar mercadería",
  "Sin resolver envíos solo",
  "Sin comisión de Ventaz sobre tus ventas",
];

const FLOW_STEPS = [
  {
    id: "catalogo",
    number: "01",
    title: "Elegís productos",
    subtitle: "Catálogo disponible",
    text: "Ves los productos disponibles, elegís cuáles querés vender y empezás a armar tu propuesta sin comprar mercadería.",
    icon: Boxes,
  },
  {
    id: "cuenta",
    number: "02",
    title: "Conectás tu cuenta",
    subtitle: "Tu cuenta de Mercado Libre, tu precio",
    text: "Conectás tu propia cuenta de Mercado Libre y publicás el catálogo de Ventaz con el precio que vos elijas, en minutos.",
    icon: Link2,
  },
  {
    id: "ventas",
    number: "03",
    title: "Vendés en Mercado Libre",
    subtitle: "Vos te enfocás en vender",
    text: "Tus productos aparecen en las búsquedas de Mercado Libre. Vos respondés consultas y cerrás ventas — la parte pesada queda organizada por la plataforma.",
    icon: Users,
  },
  {
    id: "operacion",
    number: "04",
    title: "Ventaz opera",
    subtitle: "Stock, pedidos, logística y soporte",
    text: "Cada venta que generás se registra, el stock se actualiza y Ventaz acompaña la operación hasta que el pedido queda resuelto.",
    icon: LayoutDashboard,
  },
];

const BENEFITS = [
  {
    id: "stock",
    title: "No necesitás comprar stock",
    text: "Podés empezar a vender sin invertir de entrada en mercadería ni llenar tu casa de productos.",
    icon: Package,
    detail: "Ventaz reduce una de las barreras más grandes para arrancar: comprar productos antes de saber si vas a venderlos.",
  },
  {
    id: "tiempo",
    title: "Ahorrás tiempo operativo",
    text: "No tenés que coordinar cada parte del proceso como si estuvieras armando un negocio desde cero.",
    icon: Clock3,
    detail: "El vendedor usa su tiempo en conseguir clientes y vender, no en perseguir stock, preparar pedidos o improvisar logística.",
  },
  {
    id: "estructura",
    title: "Tenés una estructura seria",
    text: "Catálogo, publicaciones, pedidos y control viven en un mismo sistema.",
    icon: Layers,
    detail: "Cada operación queda ordenada. Eso permite vender con más claridad y evita que todo dependa de mensajes sueltos.",
  },
  {
    id: "soporte",
    title: "No quedás solo",
    text: "Si aparece un problema, la plataforma puede intervenir y acompañar la resolución.",
    icon: Headphones,
    detail: "La confianza se construye con reglas claras: soporte centralizado, seguimiento y cambios solo por falla de fábrica o error.",
  },
  {
    id: "control",
    title: "Menos errores, más control",
    text: "Las ventas quedan registradas y el stock se descuenta de forma automática.",
    icon: BarChart3,
    detail: "El sistema ayuda a ordenar cada movimiento y a que el modelo pueda crecer sin convertirse en un caos.",
  },
  {
    id: "alcance",
    title: "Vendés con la confianza que ya tiene Mercado Libre",
    text: "No tenés que construir reputación desde cero — tus productos aparecen dentro de la plataforma que los compradores ya conocen.",
    icon: BadgeCheck,
    detail: "Ventaz te da el catálogo y la operación; Mercado Libre te da el tráfico y la confianza que ya construyó con millones de compradores.",
  },
];

const BEHIND_THE_SCENES = [
  {
    title: "Stock actualizado",
    text: "La disponibilidad se mantiene organizada para reducir ventas imposibles o errores de coordinación.",
    icon: Package,
  },
  {
    title: "Pedidos centralizados",
    text: "Cada pedido entra al sistema y queda registrado para poder seguirlo de forma clara.",
    icon: LayoutDashboard,
  },
  {
    title: "Logística acompañada",
    text: "La entrega no queda improvisada: Ventaz ayuda a organizar el proceso por detrás.",
    icon: Truck,
  },
  {
    title: "Soporte con reglas",
    text: "Los problemas se canalizan con criterios claros: falla de fábrica o error operativo.",
    icon: ShieldCheck,
  },
];

const AUDIENCE = [
  "Estudiantes que quieren ingresos extra",
  "Personas que trabajan y tienen poco tiempo",
  "Vendedores que ya venden por Mercado Libre y quieren dejar de manejar stock",
  "Emprendedores que quieren arrancar en Mercado Libre sin comprar mercadería",
];

const FOUNDERS = [
  {
    initials: "Tz",
    name: "Taz — Tu asistente de Ventaz",
    role: "Soporte y consultas 24/7",
    text: "Taz es el asistente integrado en tu panel. Podés preguntarle sobre tus productos, precios, ganancias, cómo usar cada función y cualquier duda que tengas. Está disponible en todo momento para ayudarte a operar mejor.",
  },
];

function useSmoothNavigation() {
  const [activeSection, setActiveSection] = useState("que-es");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.12, 0.25, 0.5, 0.75],
      }
    );

    sections.forEach((section) => observer.observe(section));

    function onScroll() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const current = window.scrollY;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function goTo(id) {
    const target = document.getElementById(id);
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return { activeSection, progress, goTo };
}

export default function LandingMl() {
  const { activeSection, progress, goTo } = useSmoothNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(FLOW_STEPS[0].id);
  const [activeBenefit, setActiveBenefit] = useState(BENEFITS[0].id);
  const [mode, setMode] = useState("ventaz");
  const [openFaq, setOpenFaq] = useState(0);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const year = useMemo(() => new Date().getFullYear(), []);
  const selectedStep = FLOW_STEPS.find((step) => step.id === activeStep) || FLOW_STEPS[0];
  const selectedBenefit = BENEFITS.find((item) => item.id === activeBenefit) || BENEFITS[0];
  const SelectedStepIcon = selectedStep.icon;
  const SelectedBenefitIcon = selectedBenefit.icon;

  useSeo(SEO);
  useJsonLd("ld-faq", useMemo(() => buildFaqSchema(FAQS), []));

  useEffect(() => {
    function handleMouseMove(event) {
      setMouse({
        x: Math.round((event.clientX / window.innerWidth) * 100),
        y: Math.round((event.clientY / window.innerHeight) * 100),
      });
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Si se registra desde acá, StartChoice (/start) lee esto y salta directo al track
  // "mercadolibre" sin mostrarle la elección — ver consumeLandingTrackHint en StartChoice.jsx.
  useEffect(() => {
    try {
      localStorage.setItem("ventaz_landing_track", JSON.stringify({ track: "mercadolibre", ts: Date.now() }));
    } catch {
      // ignore
    }
  }, []);

  function handleNavClick(id) {
    setMenuOpen(false);
    goTo(id);
  }

  return (
    <main
      className="vtz-home"
      style={{
        "--scroll-progress": `${progress}%`,
        "--mouse-x": `${mouse.x}%`,
        "--mouse-y": `${mouse.y}%`,
      }}
    >
      <div className="vtz-progress" />

      <header className="vtz-nav">
        <button type="button" className="vtz-brand" onClick={() => goTo("inicio")}>
          <img src="/ventaz.png" alt="Ventaz" style={{ height: 30, objectFit: "contain" }} />
        </button>

        <nav className={`vtz-nav__links ${menuOpen ? "is-open" : ""}`}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={activeSection === item.id ? "is-active" : ""}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="vtz-nav__actions">
          <Link to="/login" className="vtz-link-login">
            Ingresar
          </Link>
          <Link to="/register" className="vtz-nav-cta">
            Empezar a vender
          </Link>

          <button
            type="button"
            className="vtz-menu-btn"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <section className="vtz-hero" id="inicio">
        <div className="vtz-hero__grid">
          <div className="vtz-hero__copy">
            <div className="vtz-eyebrow">
              <Sparkles size={16} />
              Plataforma para vender por Mercado Libre con estructura real
            </div>

            <h1>
              Tu cuenta.
              <br />
              Tu precio.
              <br />
              <span>Tu negocio.</span>
            </h1>

            <p>
              Ventaz te da el catálogo de productos, la logística de cada envío y la integración
              con tu cuenta de Mercado Libre. Vos solo publicás — nada más.
            </p>

            <div className="vtz-hero__buttons">
              <Link to="/register" className="vtz-btn vtz-btn--primary vtz-btn--hero">
                Empezar en Mercado Libre <ArrowRight size={20} />
              </Link>
              <button type="button" className="vtz-btn vtz-btn--secondary" onClick={() => goTo("como-funciona")}>
                Ver cómo funciona
              </button>
            </div>

            <div className="vtz-hero__checks">
              {HERO_POINTS.map((point) => (
                <span key={point}>
                  <CheckCircle2 size={16} />
                  {point}
                </span>
              ))}
            </div>

            <div className="vtz-principle">
              <ShieldCheck size={18} />
              <span>
                No prometemos plata fácil. Creamos una estructura seria para que vender por Mercado Libre sea más simple, ordenado y posible.
              </span>
            </div>
          </div>

          <div className="vtz-hero-card">
            <div className="vtz-hero-card__bg" />
            <div className="vtz-hero-card__top">
              <span>Modelo Ventaz</span>
              <strong>Nosotros operamos. Vos vendés.</strong>
            </div>

            <div className="vtz-flow-mini">
              <div>
                <Boxes size={20} />
                <span>Catálogo</span>
              </div>
              <i />
              <div>
                <Link2 size={20} />
                <span>Tu cuenta ML</span>
              </div>
              <i />
              <div>
                <Truck size={20} />
                <span>Operación</span>
              </div>
              <i />
              <div>
                <Headphones size={20} />
                <span>Soporte</span>
              </div>
            </div>

            <div className="vtz-hero-card__bottom">
              <div>
                <small>El vendedor se enfoca en</small>
                <strong>publicar y vender</strong>
              </div>
              <div>
                <small>Ventaz se encarga de</small>
                <strong>stock, pedidos y soporte</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="vtz-hero__stats">
          <div>
            <strong>$0</strong>
            <span>compra inicial de stock</span>
          </div>
          <div>
            <strong>0%</strong>
            <span>comisión de Ventaz sobre tus ventas</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>tu cuenta de Mercado Libre activa</span>
          </div>
        </div>
      </section>

      <div className="vtz-hero-to-content" />

      <section className="vtz-section vtz-intro" id="que-es">
        <div className="vtz-section__head">
          <span className="vtz-kicker">Qué es Ventaz</span>
          <h2>Un modelo de dropshipping para vender por Mercado Libre sin cargar con la parte complicada.</h2>
          <p>
            Muchas personas quieren vender por Mercado Libre, pero se frenan porque creen que necesitan
            comprar productos, guardar stock, hacer envíos, atender reclamos y armar todo desde cero.
          </p>
        </div>

        <div className="vtz-intro__grid">
          <article className="vtz-contrast-card vtz-contrast-card--before">
            <span className="vtz-card-label">Sin estructura</span>
            <h3>Vender solo suele volverse pesado.</h3>
            <ul>
              <li>Comprar productos antes de vender</li>
              <li>Guardar mercadería y controlar stock a mano</li>
              <li>Publicar, actualizar precio y stock a mano en Mercado Libre</li>
              <li>Resolver reclamos sin respaldo</li>
            </ul>
          </article>

          <article className="vtz-contrast-card vtz-contrast-card--after">
            <span className="vtz-card-label">Con Ventaz</span>
            <h3>El vendedor arranca con un dropshipping para Mercado Libre ya armado.</h3>
            <p>
              Ventaz pone el catálogo de productos, los compra, los guarda, los empaqueta y los envía
              a cada cliente que te compre por Mercado Libre. Vos conectás tu cuenta, publicás y
              conseguís clientes — el resto lo resolvemos nosotros.
            </p>
            <div className="vtz-highlight-line">
              <BadgeCheck size={20} />
              <span>Nosotros compramos, guardamos y enviamos. Vos publicás y vendés.</span>
            </div>
          </article>
        </div>
      </section>


      <section className="vtz-section vtz-about" id="quienes-somos">
        <div className="vtz-section__head">
          <span className="vtz-kicker">Quiénes somos</span>
          <h2>Nacimos para transformar una operación real en una oportunidad para más vendedores.</h2>
          <p>
            Ventaz surge desde experiencia concreta en venta, stock, pedidos y atención al cliente.
            La idea no es vender humo: es convertir una estructura que ya funciona en una plataforma
            que cualquier vendedor pueda usar para construir su propio negocio en Mercado Libre.
          </p>
        </div>

        <div className="vtz-about__grid">
          <article className="vtz-about-card">
            <span className="vtz-card-label">Nuestra mirada</span>
            <h3>Vender por Mercado Libre debería ser más accesible, no más caótico.</h3>
            <p>
              Muchas personas tienen ganas de vender, pero se frenan por todo lo que hay alrededor:
              stock, entregas, reclamos, herramientas, organización y tiempo. Ventaz ordena esa parte
              para que el vendedor pueda enfocarse en lo importante.
            </p>

            <div className="vtz-about-card__quote">
              <Sparkles size={18} />
              <strong>Tu cuenta. Tu precio. Tu negocio.</strong>
            </div>
          </article>

          <div className="vtz-founders">
            {FOUNDERS.map((founder) => (
              <article className="vtz-founder-card" key={founder.name}>
                <div className="vtz-founder-card__avatar">{founder.initials}</div>
                <div>
                  <h3>{founder.name}</h3>
                  <span>{founder.role}</span>
                  <p>{founder.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vtz-section vtz-how" id="como-funciona">
        <div className="vtz-section__head">
          <span className="vtz-kicker">Cómo funciona</span>
          <h2>Un recorrido simple, pero con operación real detrás.</h2>
        </div>

        <div className="vtz-how__grid">
          <div className="vtz-step-list">
            {FLOW_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`vtz-step-btn ${activeStep === step.id ? "is-active" : ""}`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <span>{step.number}</span>
                  <Icon size={20} />
                  <strong>{step.title}</strong>
                </button>
              );
            })}
          </div>

          <article className="vtz-step-detail">
            <div className="vtz-step-detail__icon">
              <SelectedStepIcon size={32} />
            </div>
            <span>{selectedStep.subtitle}</span>
            <h3>{selectedStep.title}</h3>
            <p>{selectedStep.text}</p>
          </article>
        </div>
      </section>

      <section className="vtz-section vtz-behind">
        <div className="vtz-section__head">
          <span className="vtz-kicker">Qué hace Ventaz por detrás</span>
          <h2>La estructura invisible que hace que vender sea más ordenado.</h2>
          <p>
            Mientras el vendedor genera ventas, Ventaz sostiene la operación para que cada pedido
            quede registrado, controlado y acompañado.
          </p>
        </div>

        <div className="vtz-behind__grid">
          {BEHIND_THE_SCENES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="vtz-behind-card">
                <Icon size={25} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="vtz-section vtz-benefits" id="beneficios">
        <div className="vtz-section__head">
          <span className="vtz-kicker">Beneficios</span>
          <h2>No es solo una publicación. Es una forma más fácil de empezar.</h2>
        </div>

        <div className="vtz-benefits__grid">
          <div className="vtz-benefit-buttons">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <button
                  key={benefit.id}
                  type="button"
                  className={`vtz-benefit-btn ${activeBenefit === benefit.id ? "is-active" : ""}`}
                  onClick={() => setActiveBenefit(benefit.id)}
                >
                  <Icon size={20} />
                  <span>{benefit.title}</span>
                </button>
              );
            })}
          </div>

          <article className="vtz-benefit-detail">
            <div className="vtz-benefit-detail__icon">
              <SelectedBenefitIcon size={34} />
            </div>
            <h3>{selectedBenefit.title}</h3>
            <p>{selectedBenefit.detail}</p>
            <div className="vtz-benefit-detail__note">
              <CheckCircle2 size={18} />
              <span>{selectedBenefit.text}</span>
            </div>
          </article>
        </div>
      </section>

      <section className="vtz-section vtz-compare">
        <div className="vtz-compare__head">
          <span className="vtz-kicker">Comparación</span>
          <h2>La diferencia está en no tener que improvisar todo.</h2>

          <div className="vtz-switch">
            <button
              type="button"
              className={mode === "solo" ? "is-active" : ""}
              onClick={() => setMode("solo")}
            >
              Vender solo
            </button>
            <button
              type="button"
              className={mode === "ventaz" ? "is-active" : ""}
              onClick={() => setMode("ventaz")}
            >
              Con Ventaz
            </button>
          </div>
        </div>

        <div className={`vtz-compare-card ${mode === "ventaz" ? "is-ventaz" : "is-solo"}`}>
          {mode === "solo" ? (
            <>
              <h3>Todo depende de vos.</h3>
              <p>
                Tenés que comprar, guardar, publicar, coordinar envíos, responder dudas,
                resolver reclamos y controlar cada pedido manualmente.
              </p>
              <ul>
                <li>Más riesgo inicial</li>
                <li>Más tareas operativas</li>
                <li>Más chances de error</li>
              </ul>
            </>
          ) : (
            <>
              <h3>Vos te enfocás en vender.</h3>
              <p>
                Ventaz te da catálogo, publicaciones, operación, seguimiento y soporte para que puedas
                arrancar con una base mucho más clara.
              </p>
              <ul>
                <li>Estructura lista para usar</li>
                <li>Operación centralizada</li>
                <li>Soporte ante problemas</li>
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="vtz-section vtz-audience" id="confianza">
        <div className="vtz-audience__card">
          <span className="vtz-kicker">Para quién es</span>
          <h2>Para personas que quieren vender, pero no tienen tiempo de armar todo desde cero.</h2>
          <p>
            Ventaz está pensado para quienes estudian, trabajan o quieren generar ingresos extra
            sin crear una operación completa desde el primer día.
          </p>

          <div className="vtz-audience__list">
            {AUDIENCE.map((item) => (
              <span key={item}>
                <CheckCircle2 size={17} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="vtz-section vtz-trust">
        <div>
          <span className="vtz-kicker">Soporte y confianza</span>
          <h2>El vendedor no queda solo cuando aparece un problema.</h2>
        </div>

        <div className="vtz-trust__content">
          <p>
            Si hay un inconveniente, Ventaz puede intervenir, ordenar la comunicación
            y aplicar reglas claras. Los cambios se aceptan si el producto tiene falla
            de fábrica o si hubo un error en la operación.
          </p>

          <div className="vtz-trust__badges">
            <span><ShieldCheck size={18} /> Soporte centralizado</span>
            <span><BadgeCheck size={18} /> Reglas claras</span>
            <span><Headphones size={18} /> Acompañamiento real</span>
          </div>
        </div>
      </section>

      <section className="vtz-section vtz-faq" id="dudas">
        <div className="vtz-section__head">
          <span className="vtz-kicker">Dudas frecuentes</span>
          <h2>Lo que un vendedor necesita entender antes de empezar.</h2>
        </div>

        <div className="vtz-faq__list">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <article key={faq.q} className={`vtz-faq__item ${isOpen ? "is-open" : ""}`}>
                <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={20} />
                </button>
                <div className="vtz-faq__answer">
                  <p>{faq.a}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="vtz-final">
        <div className="vtz-final__inner">
          <div className="vtz-final__icon">
            <Rocket size={30} />
          </div>
          <h2>Conectá tu cuenta y empezá a vender por Mercado Libre con una estructura lista.</h2>
          <p>
            Tu cuenta. Tu precio. Tu negocio. Ventaz te da el catálogo, la logística y la integración
            con Mercado Libre para que vos solo tengas que publicar.
          </p>

          <div className="vtz-hero__buttons vtz-hero__buttons--center">
            <Link to="/register" className="vtz-btn vtz-btn--primary">
              Empezar en Mercado Libre <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="vtz-btn vtz-btn--secondary">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <footer className="vtz-footer">
        <button type="button" className="vtz-brand" onClick={() => goTo("inicio")}>
          <img src="/ventaz.png" alt="Ventaz" style={{ height: 28, objectFit: "contain" }} />
        </button>

        <p>© {year} Ventaz. Plataforma para vender por Mercado Libre.</p>

        <button type="button" className="vtz-footer__top" onClick={() => goTo("inicio")}>
          Volver arriba
        </button>
      </footer>
    </main>
  );
}
