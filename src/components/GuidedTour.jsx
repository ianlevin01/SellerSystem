// src/components/GuidedTour.jsx
// Tour paso a paso que resalta elementos de la página con un spotlight
// Se activa con ?guide=true en la URL

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, MapPin } from "lucide-react";

// ─── Definición de tours por ruta ─────────────────────────────────────────────

const TOURS = {
  "/pages": [
    {
      selector: null,
      title: "¡Bienvenido a Mis tiendas!",
      body: "Acá creás y gestionás todas tus tiendas públicas. Cada tienda tiene su propio link, diseño y catálogo de productos. Podés tener varias tiendas activas al mismo tiempo.",
      position: "center",
    },
    {
      selector: "[data-tour='new-page-btn']",
      title: "Crear una tienda",
      body: "Hacé clic acá para crear tu primera tienda. Elegís el nombre, el link (slug) y el color principal. El link es único — así tus clientes van a acceder a tu tienda.",
      position: "bottom",
    },
    {
      selector: "[data-tour='page-card']",
      title: "Tus tiendas",
      body: "Cada tarjeta es una tienda. Podés ver el nombre, el link y las acciones disponibles: Configurar (diseño), Productos (catálogo y precios), Descuentos (promociones) y Ver (abrir la tienda pública).",
      position: "bottom",
    },
    {
      selector: "[data-tour='page-card-actions']",
      title: "Acciones de la tienda",
      body: "«Configurar» te lleva al editor de diseño. «Productos» te permite agregar artículos y precios. «Descuentos» crea promociones. «Ver» abre tu tienda en una nueva pestaña.",
      position: "top",
    },
    {
      selector: "[data-tour='pages-stats']",
      title: "Resumen",
      body: "Acá ves cuántas tiendas creaste y cuántos links activos tenés en este momento.",
      position: "bottom",
    },
  ],

  // Usamos los class names reales de PageProducts
  "/pages/:id/products": [
    {
      selector: null,
      title: "Productos de tu tienda",
      body: "Desde acá elegís qué productos mostrar en tu tienda y a qué precio venderlos. El catálogo es el de Ventaz — vos decidís qué incluir y cuánto cobrar.",
      position: "center",
    },
    {
      selector: ".seller-products-search",
      title: "Buscar productos",
      body: "Buscá por nombre o código entre todos los productos del catálogo.",
      position: "bottom",
    },
    {
      selector: ".seller-products-cats",
      title: "Filtrar por categoría",
      body: "Las categorías te ayudan a ordenar el catálogo. Hacé clic en una para ver solo los productos de esa categoría.",
      position: "bottom",
    },
    {
      selector: ".seller-product-card",
      title: "Tarjeta de producto",
      body: "Cada tarjeta muestra el costo, precio sugerido, tu precio de venta y la ganancia estimada. Hacé clic en «Agregar» para incluirlo en tu tienda.",
      position: "bottom",
    },
    {
      selector: ".seller-product-sale",
      title: "Definir el precio",
      body: "Este es el precio que verá el cliente. Podés poner cualquier valor por encima del mínimo. La ganancia estimada se actualiza en tiempo real.",
      position: "top",
    },
    {
      selector: ".seller-product-btn--add, .seller-product-btn--save",
      title: "Publicar o guardar",
      body: "Hacé clic en «Agregar a mi tienda» para publicar el producto. Si ya está activo y modificaste el precio, el botón cambia a «Guardar precio».",
      position: "top",
    },
  ],

  // Descuentos: no hay clases específicas en los paneles internos,
  // usamos .page-tabs y .btn--primary que sí existen
  "/pages/:id/discounts": [
    {
      selector: null,
      title: "Descuentos",
      body: "Desde acá creás descuentos automáticos para tus clientes: por cantidad de unidades o por monto del carrito. Aparecen en tiempo real en la tienda.",
      position: "center",
    },
    {
      selector: ".page-tabs",
      title: "Navegá por las secciones",
      body: "Podés volver a Configuración, Productos o Integraciones desde las pestañas de arriba en cualquier momento.",
      position: "bottom",
    },
    {
      selector: ".btn--primary",
      title: "Crear un descuento",
      body: "Hacé clic en «Crear mi primer descuento» para configurar las reglas: elegís el tipo (cantidad o monto) y definís los tramos de porcentaje.",
      position: "bottom",
    },
    {
      selector: null,
      title: "Guardar los cambios",
      body: "Cuando configures los tramos, hacé clic en «Guardar cambios» para activar el descuento en tu tienda pública.",
      position: "center",
    },
  ],

  // Config tab: los data-tour attrs existen en PageEditor
  "/pages/:id": [
    {
      selector: null,
      title: "¡Tu tienda está creada! 🎉",
      body: "Bienvenido al editor. Desde acá personalizás todo: nombre, diseño, colores, portada y más. Te mostramos los puntos clave para que arranques rápido.",
      position: "center",
    },
    {
      selector: ".pe-topbar__back",
      title: "Volver a Mis tiendas",
      body: "Este botón te lleva de vuelta a la lista de tus tiendas. Desde ahí podés ver todas tus tiendas, crear nuevas, o ir a Productos y Descuentos.",
      position: "bottom",
    },
    {
      selector: ".page-tabs",
      title: "Secciones del editor",
      body: "Usá estas pestañas para navegar entre Configuración (diseño), Productos (catálogo y precios), Descuentos (promociones) e Integraciones (Pixel, etc.).",
      position: "bottom",
    },
    {
      selector: "[data-tour='page-tabs']",
      title: "Opciones de personalización",
      body: "Dentro de Configuración, estas pestañas te llevan a cada sección: identidad, colores, portada, productos, contacto y SEO. Explorá cada una.",
      position: "bottom",
    },
    {
      selector: ".pe-editor__right",
      title: "Vista previa en vivo",
      body: "Acá ves tu tienda tal como la van a ver tus clientes. Cada cambio que hacés se refleja al instante, sin necesidad de guardar.",
      position: "left",
    },
    {
      selector: "[data-tour='page-save']",
      title: "Guardar los cambios",
      body: "Cuando termines de configurar, hacé clic en «Guardar». Los cambios se publican en tu tienda pública de inmediato.",
      position: "top",
    },
  ],

  "/profile": [
    {
      selector: null,
      title: "Tu perfil",
      body: "Completar tu perfil es necesario para operar en la plataforma. La ciudad y fecha de nacimiento son requeridas para activar todas las funciones.",
      position: "center",
    },
    {
      selector: null,
      title: "Foto de perfil",
      body: "Hacé clic en el círculo con tu inicial para subir tu foto desde tu dispositivo. Aparece en el panel y en las comunicaciones con el equipo Ventaz.",
      position: "center",
    },
    {
      selector: null,
      title: "Datos personales",
      body: "Completá tu nombre completo, ciudad y fecha de nacimiento. Estos datos son requeridos para verificar tu identidad y operar en la plataforma.",
      position: "center",
    },
    {
      selector: null,
      title: "Verificar tu teléfono",
      body: "Ingresá tu número de celular y hacé clic en «Enviar código». Vas a recibir un SMS con un código de 6 dígitos para confirmar tu número.",
      position: "center",
    },
    {
      selector: null,
      title: "CVU para cobros",
      body: "Para recibir tus ganancias, configurá tu CVU o alias bancario en la sección «Cobros» del menú lateral.",
      position: "center",
    },
  ],

  // Integrations: los cards tienen clase .card
  "/pages/:id/integrations": [
    {
      selector: null,
      title: "Integraciones",
      body: "Las integraciones son herramientas que potencian tu tienda: Meta Pixel para medir campañas y StarAI para generar reseñas con inteligencia artificial.",
      position: "center",
    },
    {
      selector: ".page-tabs",
      title: "Navegá por las secciones",
      body: "Usá las pestañas para volver a Configuración, Productos o Descuentos cuando lo necesites.",
      position: "bottom",
    },
    {
      selector: ".card",
      title: "Activar una integración",
      body: "Cada tarjeta es una integración disponible. Hacé clic en «Activar» para habilitarla y luego en «Configurar» para ingresar los datos necesarios (Pixel ID, etc.).",
      position: "bottom",
    },
    {
      selector: null,
      title: "Meta Pixel",
      body: "Con el Pixel activo, Meta registra las visitas y conversiones en tu tienda y optimiza automáticamente a quién le muestra tus anuncios.",
      position: "center",
    },
  ],
};

function resolveSteps(pathname) {
  if (TOURS[pathname]) return TOURS[pathname];
  if (/^\/pages\/[^/]+\/products/.test(pathname)) return TOURS["/pages/:id/products"];
  if (/^\/pages\/[^/]+\/discounts/.test(pathname)) return TOURS["/pages/:id/discounts"];
  if (/^\/pages\/[^/]+\/integrations/.test(pathname)) return TOURS["/pages/:id/integrations"];
  if (/^\/pages\/[^/]+/.test(pathname)) return TOURS["/pages/:id"];
  return null;
}

// ─── Posicionar el tooltip cerca del elemento ─────────────────────────────────

function getTooltipStyle(rect, position, tooltipSize = { w: 340, h: 180 }) {
  const MARGIN = 16;
  const { w, h } = tooltipSize;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect || position === "center") {
    return {
      position: "fixed",
      bottom: 80,
      left: "50%",
      transform: "translateX(-50%)",
    };
  }

  let top, left;

  if (position === "bottom") {
    top = rect.bottom + MARGIN;
    left = rect.left + rect.width / 2 - w / 2;
  } else if (position === "top") {
    top = rect.top - h - MARGIN;
    left = rect.left + rect.width / 2 - w / 2;
  } else if (position === "right") {
    top = rect.top + rect.height / 2 - h / 2;
    left = rect.right + MARGIN;
  } else {
    top = rect.top + rect.height / 2 - h / 2;
    left = rect.left - w - MARGIN;
  }

  // Clamp dentro del viewport
  left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
  top  = Math.max(MARGIN, Math.min(top,  vh - h - MARGIN));

  return { position: "fixed", top, left };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function GuidedTour() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [active, setActive]       = useState(false);
  const [steps,  setSteps]        = useState([]);
  const [stepIdx, setStepIdx]     = useState(0);
  const [spotlight, setSpotlight] = useState(null); // { top, left, width, height }

  // Detectar ?guide=true y activar el tour
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("guide") !== "true") return;

    const tourSteps = resolveSteps(location.pathname);
    if (!tourSteps) return;

    // Limpiar el param de la URL
    params.delete("guide");
    const newSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: newSearch ? `?${newSearch}` : "" },
      { replace: true }
    );

    setSteps(tourSteps);
    setStepIdx(0);
    setActive(true);
  }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizar spotlight cuando cambia el paso
  useEffect(() => {
    if (!active || !steps.length) return;
    const step = steps[stepIdx];
    if (!step?.selector) {
      setSpotlight(null);
      return;
    }

    // Pequeño delay para que el DOM se actualice si hubo un scroll/render
    const t = setTimeout(() => {
      const el = document.querySelector(step.selector);
      if (!el) { setSpotlight(null); return; }

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Esperar a que termine el scroll antes de leer el rect
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setSpotlight({
          top:    rect.top    - 6,
          left:   rect.left   - 6,
          width:  rect.width  + 12,
          height: rect.height + 12,
        });
      }, 400);
    }, 120);

    return () => clearTimeout(t);
  }, [active, stepIdx, steps]);

  const close = useCallback(() => {
    setActive(false);
    setSpotlight(null);
    setStepIdx(0);
  }, []);

  const next = useCallback(() => {
    if (stepIdx < steps.length - 1) {
      setStepIdx(i => i + 1);
    } else {
      close();
    }
  }, [stepIdx, steps.length, close]);

  const prev = useCallback(() => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  }, [stepIdx]);

  // Teclas: Escape cierra, flecha derecha avanza, flecha izquierda retrocede
  useEffect(() => {
    if (!active) return;
    function onKey(e) {
      if (e.key === "Escape")      close();
      if (e.key === "ArrowRight")  next();
      if (e.key === "ArrowLeft")   prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next, prev]);

  if (!active || !steps.length) return null;

  const step = steps[stepIdx];
  const spotlightRect = spotlight ? {
    top:    spotlight.top,
    left:   spotlight.left,
    right:  spotlight.left + spotlight.width,
    bottom: spotlight.top  + spotlight.height,
    width:  spotlight.width,
    height: spotlight.height,
  } : null;
  const tooltipStyle = getTooltipStyle(spotlightRect, step.position);
  const isLast  = stepIdx === steps.length - 1;
  const isFirst = stepIdx === 0;

  return createPortal(
    // gt-root captura clics para cerrar — pointer-events: all
    <div className="gt-root" onClick={close}>

      {/* Sin spotlight (paso intro): fondo oscuro plano */}
      {!spotlight && <div className="gt-blanket" />}

      {/* Spotlight: div transparente posicionado sobre el elemento.
          Su box-shadow crea la oscuridad alrededor — el div mismo
          es transparente, así el elemento se ve a través de él. */}
      {spotlight && (
        <div
          className="gt-spotlight"
          style={{
            top:    spotlight.top,
            left:   spotlight.left,
            width:  spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Tooltip card — stopPropagation para que no cierre al hacer clic */}
      <div className="gt-tooltip" style={tooltipStyle} onClick={e => e.stopPropagation()}>
        <div className="gt-tooltip__header">
          <div className="gt-tooltip__step-info">
            <MapPin size={13} className="gt-tooltip__pin" />
            <span className="gt-tooltip__counter">
              {stepIdx + 1} / {steps.length}
            </span>
          </div>
          <button
            type="button"
            className="gt-tooltip__close"
            onClick={close}
            aria-label="Cerrar tour"
          >
            <X size={14} />
          </button>
        </div>

        <div className="gt-tooltip__dots">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`gt-dot${i === stepIdx ? " gt-dot--active" : ""}`}
              onClick={() => setStepIdx(i)}
              aria-label={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        <div className="gt-tooltip__body">
          <h3 className="gt-tooltip__title">{step.title}</h3>
          <p  className="gt-tooltip__text">{step.body}</p>
        </div>

        <div className="gt-tooltip__footer">
          <button
            type="button"
            className="gt-btn gt-btn--ghost"
            onClick={prev}
            disabled={isFirst}
          >
            <ChevronLeft size={15} /> Anterior
          </button>
          <button
            type="button"
            className={`gt-btn ${isLast ? "gt-btn--finish" : "gt-btn--primary"}`}
            onClick={next}
          >
            {isLast ? "Finalizar" : "Siguiente"} {!isLast && <ChevronRight size={15} />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

export function GuidedTourStyles() {
  return (
    <style>{`
      /*
       * gt-root: cubre toda la pantalla, captura clics para cerrar el tour.
       * pointer-events: all — todos los clics en el fondo cierran el tour.
       */
      .gt-root {
        position: fixed; inset: 0;
        z-index: 9990;
        pointer-events: all;
        cursor: default;
      }

      /*
       * gt-blanket: fondo oscuro para pasos sin elemento objetivo (intro/centro).
       * pointer-events: none porque gt-root ya captura los clics.
       */
      .gt-blanket {
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.65);
        pointer-events: none;
        z-index: 9990;
      }

      /*
       * gt-spotlight: div transparente posicionado EXACTAMENTE sobre el elemento.
       * background: transparent → el elemento se ve a través de él.
       * box-shadow con spread masivo → crea la oscuridad en TODO lo que está
       * FUERA del div. El div mismo queda "iluminado" porque es transparente.
       * pointer-events: none → los clics pasan al gt-root (que cierra el tour).
       */
      .gt-spotlight {
        position: fixed;
        z-index: 9991;
        border-radius: 10px;
        background: transparent;
        pointer-events: none;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
        outline: 2.5px solid rgba(255, 255, 255, 0.65);
        outline-offset: 2px;
        transition: top .28s cubic-bezier(.4,0,.2,1),
                    left .28s cubic-bezier(.4,0,.2,1),
                    width .28s cubic-bezier(.4,0,.2,1),
                    height .28s cubic-bezier(.4,0,.2,1);
      }

      /* Card flotante con el contenido del paso */
      .gt-tooltip {
        position: fixed;
        z-index: 9992;
        width: 340px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,.25), 0 4px 16px rgba(0,0,0,.12);
        pointer-events: all;
        animation: gt-in .22s ease;
        overflow: hidden;
      }
      @keyframes gt-in {
        from { opacity: 0; transform: translateY(10px) scale(.97); }
        to   { opacity: 1; transform: translateY(0)  scale(1); }
      }

      /* Header del tooltip */
      .gt-tooltip__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px 0;
      }
      .gt-tooltip__step-info {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .gt-tooltip__pin { color: var(--brand, #5b52f0); flex-shrink: 0; }
      .gt-tooltip__counter {
        font-size: .74rem;
        font-weight: 600;
        color: var(--brand, #5b52f0);
        letter-spacing: .02em;
      }
      .gt-tooltip__close {
        display: flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; border-radius: 6px; border: none;
        background: none; cursor: pointer;
        color: #888; transition: background .12s, color .12s;
      }
      .gt-tooltip__close:hover { background: #f3f4f6; color: #333; }

      /* Puntos de progreso */
      .gt-tooltip__dots {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 14px 0;
      }
      .gt-dot {
        width: 6px; height: 6px;
        border-radius: 99px;
        border: none;
        background: #e5e7eb;
        cursor: pointer;
        padding: 0;
        transition: background .15s, width .15s;
      }
      .gt-dot--active {
        width: 18px;
        background: var(--brand, #5b52f0);
      }

      /* Cuerpo del tooltip */
      .gt-tooltip__body { padding: 14px 16px 12px; }
      .gt-tooltip__title {
        margin: 0 0 6px;
        font-size: 1rem;
        font-weight: 700;
        color: #111;
        line-height: 1.3;
      }
      .gt-tooltip__text {
        margin: 0;
        font-size: .84rem;
        color: #4b5563;
        line-height: 1.6;
      }

      /* Footer del tooltip */
      .gt-tooltip__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px 14px;
        border-top: 1px solid #f3f4f6;
        gap: 8px;
      }
      .gt-btn {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 8px 14px;
        border-radius: 8px; border: none; cursor: pointer;
        font-size: .83rem; font-weight: 600;
        transition: background .14s, color .14s, opacity .14s;
      }
      .gt-btn:disabled { opacity: .35; cursor: not-allowed; }
      .gt-btn--ghost {
        background: none;
        color: #6b7280;
      }
      .gt-btn--ghost:not(:disabled):hover { background: #f3f4f6; color: #333; }
      .gt-btn--primary {
        background: var(--brand, #5b52f0);
        color: #fff;
        margin-left: auto;
      }
      .gt-btn--primary:hover { filter: brightness(1.07); }
      .gt-btn--finish {
        background: #16a34a;
        color: #fff;
        margin-left: auto;
      }
      .gt-btn--finish:hover { filter: brightness(1.07); }

      /* Móvil */
      @media (max-width: 600px) {
        .gt-tooltip {
          width: calc(100vw - 32px);
          left: 16px !important;
          right: 16px !important;
          transform: none !important;
          bottom: 24px !important;
          top: auto !important;
        }
      }
    `}</style>
  );
}
