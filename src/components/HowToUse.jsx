// src/components/HowToUse.jsx
// Panel de ayuda contextual por página (botón flotante "¿Cómo usar?")
// El tour guiado con spotlight está en GuidedTour.jsx

import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react";

// ─── Contenido por ruta ────────────────────────────────────────────────────────

const PAGE_HELP = {
  "/dashboard": {
    title: "Dashboard",
    sections: [
      {
        heading: "¿Qué ves acá?",
        body: "El Dashboard es tu pantalla de inicio. Te muestra un resumen de tu negocio en tiempo real: productos activos, total de pedidos, pedidos pendientes y tu ganancia acumulada.",
      },
      {
        heading: "Alerta de perfil incompleto",
        body: "Si ves una advertencia amarilla en la parte superior, significa que falta información en tu perfil (ciudad, fecha de nacimiento o teléfono verificado). Completarla es necesario para operar correctamente.",
      },
      {
        heading: "Últimos pedidos",
        body: "La tabla de la derecha muestra los 5 pedidos más recientes con su estado (Pagado, Pendiente, Rechazado o Cancelado), el nombre del cliente y tu ganancia por cada uno. Hacé clic en «Ver todos →» para ir a la página completa de pedidos.",
      },
      {
        heading: "Checklist de inicio",
        body: "Si es tu primera vez, vas a ver una lista de tareas recomendadas para configurar tu cuenta. Podés cerrarla cuando ya no la necesitás.",
      },
    ],
  },

  "/pages": {
    title: "Mis tiendas",
    sections: [
      {
        heading: "¿Para qué sirve esta sección?",
        body: "Acá creás y administrás tus tiendas públicas. Cada tienda tiene su propio link, color, productos y descuentos. Podés tener varias tiendas activas al mismo tiempo.",
      },
      {
        heading: "Crear una tienda",
        body: "Hacé clic en «Nueva tienda». Se abre un modal donde elegís el nombre, el link (slug) y el color principal. El link es único y así tus clientes van a acceder a tu tienda pública.",
      },
      {
        heading: "Tarjetas de tienda",
        body: "Cada tienda aparece como una tarjeta con tres acciones: «Configurar» (editar diseño y datos), «Descuentos» (gestionar promociones) y «Ver» (abrir la tienda pública en una nueva pestaña).",
      },
      {
        heading: "Copiar el link",
        body: "Hacé clic en el ícono de copiar o en el link abreviado de la tarjeta para copiar la URL completa de tu tienda al portapapeles.",
      },
      {
        heading: "Eliminar una tienda",
        body: "Solo aparece el botón de eliminar si tenés más de una tienda. No se puede deshacer, así que confirmá antes de hacerlo.",
      },
    ],
  },

  "/orders": {
    title: "Mis pedidos",
    sections: [
      {
        heading: "¿Qué ves acá?",
        body: "Todos los pedidos que llegaron desde tus tiendas, ordenados del más reciente al más antiguo. Arriba de la lista hay estadísticas: ganancia acumulada, total vendido y cantidad de pedidos.",
      },
      {
        heading: "Estados de un pedido",
        body: "Cada pedido tiene un estado: Pendiente (esperando seguimiento), A confirmar (coordinación con el comprador pendiente), Confirmado (listo), En proceso (siendo gestionado), Con problema (necesita atención), o Pagado (MercadoPago confirmado).",
      },
      {
        heading: "Buscar y filtrar",
        body: "Usá la barra de búsqueda para encontrar un pedido por número o nombre del cliente. Los botones de filtro de la izquierda te permiten ver solo pedidos de un estado específico.",
      },
      {
        heading: "Ver el detalle de un pedido",
        body: "Hacé clic en cualquier pedido para expandirlo y ver los artículos incluidos, el costo de envío, el total vendido y tu ganancia. Si vendiste mucho, también podés ver el ahorro que aplicaste.",
      },
      {
        heading: "Costos por volumen",
        body: "A la izquierda vas a ver una tabla de niveles: cuanto más vendés, más bajo es el costo de los productos y mayor tu ganancia por pedido.",
      },
    ],
  },

  "/cobros": {
    title: "Cobros",
    sections: [
      {
        heading: "¿Qué ves acá?",
        body: "Tu saldo dividido en dos: lo que todavía no está disponible (ganancias recientes en revisión) y lo que ya podés transferirte.",
      },
      {
        heading: "Configurar tu CVU/CBU",
        body: "Para recibir transferencias, primero tenés que cargar tu CVU o CBU. Hacé clic en «Configurar», ingresá los 22 dígitos, el nombre del titular y opcionalmente el alias. Ventaz lo verifica en las próximas horas.",
      },
      {
        heading: "Solicitar una transferencia",
        body: "Una vez que tu CVU esté verificado y tengas saldo disponible, aparece el botón «Transferir». Al hacer clic te pide confirmación y luego procesa la transferencia en pocas horas.",
      },
      {
        heading: "Historial de cobros",
        body: "Al final de la página está el historial completo de transferencias: fecha, monto, CVU usado y estado (Transferido o En proceso).",
      },
    ],
  },

  "/integrations": {
    title: "Integraciones",
    sections: [
      {
        heading: "¿Qué son las integraciones?",
        body: "Son herramientas opcionales que podés agregar a tus tiendas para potenciarlas. Por ejemplo, reseñas generadas con IA para tus productos.",
      },
      {
        heading: "Reseñas con StarAI",
        body: "Seleccioná un producto y hacé clic en «Generar reseñas». La IA crea 5 reseñas realistas. Después podés elegir cuáles publicar y cuáles ocultar o eliminar.",
      },
    ],
  },

  "/chat": {
    title: "Chat",
    sections: [
      {
        heading: "¿Qué es este chat?",
        body: "Es tu centro de mensajes con los clientes que te escriben desde tu tienda pública. Cada conversación aparece en la columna izquierda con el último mensaje y la hora.",
      },
      {
        heading: "Leer y responder",
        body: "Hacé clic en una conversación para abrirla. Escribí tu respuesta abajo y enviá con Enter o con el botón de enviar. Los mensajes no leídos aparecen resaltados.",
      },
      {
        heading: "Cotizaciones",
        body: "Si un mensaje incluye una cotización de producto, podés aceptarla directamente desde el chat y convertirla en un pedido.",
      },
    ],
  },

  "/calculator": {
    title: "Calculadora de precios",
    sections: [
      {
        heading: "¿Para qué sirve?",
        body: "Te ayuda a calcular cuánto cobrar por un producto para obtener la ganancia que querés, sin vender por debajo del costo.",
      },
      {
        heading: "Cómo usarla",
        body: "Ingresá el costo del producto (lo que vos pagás), tu precio de venta y la cantidad de unidades. La calculadora te muestra al instante la ganancia total, la ganancia por unidad y el margen en porcentaje.",
      },
      {
        heading: "Precios rápidos",
        body: "Los botones de acceso rápido (+25%, +50%, +100%) calculan automáticamente el precio de venta para ese margen sobre el costo.",
      },
      {
        heading: "Tu nivel de ventas",
        body: "Si tenés un nivel activo, la calculadora lo tiene en cuenta. A mayor nivel, menor costo y mayor ganancia.",
      },
    ],
  },

  "/profile": {
    title: "Mi perfil",
    sections: [
      {
        heading: "¿Qué podés editar?",
        body: "Tu nombre, ciudad, fecha de nacimiento y foto de perfil. Esta información es necesaria para operar en la plataforma y puede requerirte completarla si aparece la alerta en el Dashboard.",
      },
      {
        heading: "Verificar el teléfono",
        body: "Para verificar tu número, ingresalo y hacé clic en «Enviar código». Vas a recibir un SMS con un código que tenés que ingresar para confirmar.",
      },
      {
        heading: "Foto de perfil",
        body: "Hacé clic en el ícono de cámara sobre tu avatar para subir una foto desde tu dispositivo. Se actualiza de inmediato.",
      },
    ],
  },

  // PageEditor — rutas con /pages/:id
  "/pages/:pageId": {
    title: "Configuración de tienda",
    sections: [
      {
        heading: "Pestañas de configuración",
        body: "La tienda tiene 4 pestañas: Config (datos generales y diseño), Productos (qué vender y a qué precio), Descuentos (promociones) e Integraciones (herramientas extra).",
      },
      {
        heading: "Config — datos principales",
        body: "Acá editás el nombre, el logo, el banner, el color y la tipografía. También podés configurar el envío, activar o desactivar la tienda y escribir una descripción.",
      },
      {
        heading: "Productos",
        body: "Elegís qué productos mostrar en la tienda, definís tu precio de venta y ves la ganancia estimada en tiempo real. Podés crear combos (paquetes de varios productos).",
      },
      {
        heading: "Descuentos",
        body: "Creás cupones o descuentos automáticos. La plataforma te avisa si el descuento haría que vendas por debajo del costo.",
      },
      {
        heading: "Ver tu tienda",
        body: "El botón «Ver tienda» (ícono de enlace externo) abre la tienda pública en una nueva pestaña para que puedas ver exactamente lo que ven tus clientes.",
      },
    ],
  },

  // Fallback genérico
  default: {
    title: "¿Cómo usar esta sección?",
    sections: [
      {
        heading: "Navegación",
        body: "Usá el menú de la izquierda para moverte entre las secciones del panel. Cada sección tiene su propia ayuda contextual.",
      },
      {
        heading: "Asistente Taz",
        body: "Hacé clic en el botón «Taz» que aparece flotando abajo a la derecha para hacerle cualquier pregunta al asistente de IA de Ventaz.",
      },
    ],
  },
};

// ─── Resolver la ruta actual a un key de PAGE_HELP ────────────────────────────

function resolveHelpKey(pathname) {
  // Rutas exactas primero
  if (PAGE_HELP[pathname]) return pathname;

  // PageEditor: /pages/:id, /pages/:id/products, /pages/:id/discounts, /pages/:id/integrations
  if (/^\/pages\/[^/]+/.test(pathname)) return "/pages/:pageId";

  return "default";
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HowToUse() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const panelRef = useRef(null);

  const helpKey = resolveHelpKey(location.pathname);
  const help = PAGE_HELP[helpKey] || PAGE_HELP.default;

  // Cerrar al cambiar de página
  useEffect(() => {
    setOpen(false);       // eslint-disable-line react-hooks/set-state-in-effect
    setExpandedIdx(null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [location.pathname]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function toggleSection(idx) {
    setExpandedIdx(prev => (prev === idx ? null : idx));
  }

  return (
    <>
      {/* ── Botón flotante ── */}
      <button
        type="button"
        className="htu-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="¿Cómo usar esta sección?"
        title="¿Cómo usar?"
      >
        <HelpCircle size={18} />
        <span>¿Cómo usar?</span>
      </button>

      {/* ── Panel de ayuda ── */}
      {open && (
        <div className="htu-panel" ref={panelRef} role="dialog" aria-label="Ayuda de la sección">
          <div className="htu-panel__head">
            <div className="htu-panel__head-info">
              <HelpCircle size={15} className="htu-panel__head-icon" />
              <div>
                <strong>{help.title}</strong>
                <span>Guía de uso</span>
              </div>
            </div>
            <button
              type="button"
              className="htu-icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Cerrar ayuda"
            >
              <X size={14} />
            </button>
          </div>

          <div className="htu-panel__body">
            {help.sections.map((section, idx) => {
              const isOpen = expandedIdx === idx;
              return (
                <div key={idx} className={`htu-section ${isOpen ? "htu-section--open" : ""}`}>
                  <button
                    type="button"
                    className="htu-section__toggle"
                    onClick={() => toggleSection(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{section.heading}</span>
                    {isOpen
                      ? <ChevronUp size={14} />
                      : <ChevronDown size={14} />
                    }
                  </button>
                  {isOpen && (
                    <div className="htu-section__content">
                      {section.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="htu-panel__footer">
            <span>Usá el botón <strong>Taz</strong> para más ayuda con IA</span>
          </div>
        </div>
      )}

      {/* ── Estilos ── */}
      <style>{`
        /* ── Botón flotante ── */
        .htu-fab {
          position: fixed;
          bottom: 88px;           /* encima del botón Taz que suele estar a ~24px */
          right: 24px;
          z-index: 900;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px 9px 12px;
          background: var(--surface, #fff);
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 999px;
          box-shadow: 0 4px 16px rgba(0,0,0,.10);
          color: var(--text-secondary, #555);
          font-size: .82rem;
          font-weight: 500;
          cursor: pointer;
          transition: box-shadow .18s, transform .18s, border-color .18s, color .18s;
          white-space: nowrap;
        }
        .htu-fab:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,.14);
          transform: translateY(-1px);
          border-color: var(--brand, #5b52f0);
          color: var(--brand, #5b52f0);
        }

        /* ── Panel ── */
        .htu-panel {
          position: fixed;
          bottom: 148px;          /* arriba del fab */
          right: 24px;
          z-index: 901;
          width: 320px;
          max-height: 480px;
          display: flex;
          flex-direction: column;
          background: var(--surface, #fff);
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,.14);
          overflow: hidden;
          animation: htu-slide-in .2s ease;
        }
        @keyframes htu-slide-in {
          from { opacity: 0; transform: translateY(12px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }

        /* Head */
        .htu-panel__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border, #e2e8f0);
          background: var(--surface-alt, #f8f9fa);
          flex-shrink: 0;
        }
        .htu-panel__head-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .htu-panel__head-icon {
          color: var(--brand, #5b52f0);
          flex-shrink: 0;
        }
        .htu-panel__head-info strong {
          display: block;
          font-size: .9rem;
          font-weight: 600;
          color: var(--text-primary, #111);
          line-height: 1.2;
        }
        .htu-panel__head-info span {
          font-size: .72rem;
          color: var(--text-secondary, #666);
        }

        /* Body */
        .htu-panel__body {
          overflow-y: auto;
          flex: 1;
          padding: 8px 12px;
        }
        .htu-panel__body::-webkit-scrollbar { width: 4px; }
        .htu-panel__body::-webkit-scrollbar-thumb { background: var(--border, #ddd); border-radius: 4px; }

        /* Sections */
        .htu-section {
          border-radius: 10px;
          margin-bottom: 4px;
          overflow: hidden;
          border: 1px solid transparent;
          transition: border-color .15s;
        }
        .htu-section--open {
          border-color: var(--border, #e2e8f0);
          background: var(--surface-alt, #f8f9fa);
        }
        .htu-section__toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: .84rem;
          font-weight: 500;
          color: var(--text-primary, #111);
          border-radius: 10px;
          transition: background .12s, color .12s;
          gap: 8px;
        }
        .htu-section__toggle:hover {
          background: var(--surface-hover, rgba(0,0,0,.04));
        }
        .htu-section--open .htu-section__toggle {
          color: var(--brand, #5b52f0);
        }
        .htu-section__toggle svg {
          flex-shrink: 0;
          opacity: .6;
        }
        .htu-section__content {
          padding: 0 12px 12px;
          font-size: .81rem;
          color: var(--text-secondary, #555);
          line-height: 1.55;
          animation: htu-fade-in .15s ease;
        }
        @keyframes htu-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Footer */
        .htu-panel__footer {
          padding: 10px 16px;
          border-top: 1px solid var(--border, #e2e8f0);
          font-size: .74rem;
          color: var(--text-tertiary, #999);
          background: var(--surface-alt, #f8f9fa);
          flex-shrink: 0;
          text-align: center;
        }
        .htu-panel__footer strong {
          color: var(--brand, #5b52f0);
          font-weight: 600;
        }

        /* Icon button */
        .htu-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: none;
          cursor: pointer;
          color: var(--text-secondary, #666);
          transition: background .12s, color .12s;
        }
        .htu-icon-btn:hover {
          background: var(--surface-hover, rgba(0,0,0,.06));
          color: var(--text-primary, #111);
        }

        /* Mobile */
        @media (max-width: 600px) {
          .htu-fab {
            bottom: 80px;
            right: 16px;
          }
          .htu-panel {
            right: 12px;
            left: 12px;
            width: auto;
            bottom: 140px;
          }
        }
      `}</style>
    </>
  );
}
