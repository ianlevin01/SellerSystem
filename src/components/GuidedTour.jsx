// src/components/GuidedTour.jsx
// Tour paso a paso que resalta elementos de la página con un spotlight
// Se activa con ?guide=true en la URL

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, MapPin } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";

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
      body: "Dentro de Configuración, estas pestañas te llevan a cada sección: identidad, tema, colores de tu marca, tipo de letra, encabezado, página de inicio, producto y SEO. Explorá cada una.",
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

  "/mercado-libre": [
    {
      selector: null,
      title: "¡Bienvenido a Mercado Libre!",
      body: "Desde acá conectás tu propia cuenta de Mercado Libre y publicás el catálogo de Ventaz directo ahí, sin salir de Ventaz.",
      position: "center",
    },
    {
      selector: ".ml-connection-banner",
      title: "Conectá tu cuenta",
      body: "Tocá «Conectar Mercado Libre» en el recuadro resaltado y autorizá a Ventaz con tu cuenta real — es un solo paso. El tutorial espera a que termines de conectarla para seguir.",
      position: "bottom",
      waitFor: "ml-connected",
      onlyIf: "ml-disconnected",
    },
    {
      selector: ".ml-nav",
      title: "Las secciones",
      body: "«Tus publicaciones» muestra lo que ya publicaste. «Publicar» te deja elegir del catálogo qué vender, y «Cobro» es donde guardás una tarjeta para pagar el costo de tus ventas. «Rentabilidad» y «Chats» completan las pestañas.",
      position: "bottom",
    },
    {
      selector: ".ml-listings-tab",
      title: "Tus publicaciones",
      body: "Cada publicación muestra visitas, calidad y cuánto recibís después de la comisión de Mercado Libre.",
      position: "top",
    },
  ],

  // ─── Track mercadolibre ─────────────────────────────────────────────────────────
  // Cada pestaña de Mercado Libre es una sección del menú. El recorrido completo (?guide=full)
  // empieza conectando la cuenta y, recién con la cuenta conectada (así cada pantalla ya tiene
  // datos para mostrar), lleva de una sección a la siguiente — ver ML_TOUR_CHAIN. Los pasos con
  // onlyIf solo van si todavía no hay una cuenta conectada.
  "/mercado-libre/publicaciones": [
    {
      selector: null,
      title: "¡Bienvenido a Mercado Libre!",
      body: "Vamos a recorrer juntos cada sección. Primero conectá tu cuenta de Mercado Libre; con la cuenta conectada te llevo por cada pantalla para que veas para qué sirve.",
      position: "center",
      onlyIf: "ml-disconnected",
    },
    {
      selector: ".ml-connection-banner",
      title: "Conectá tu cuenta",
      body: "Tocá «Conectar Mercado Libre» en el recuadro resaltado y autorizá a Ventaz con tu cuenta real — es un solo paso. El tutorial espera a que termines de conectarla para seguir.",
      position: "bottom",
      waitFor: "ml-connected",
      onlyIf: "ml-disconnected",
    },
    {
      selector: ".sidebar__nav",
      title: "Tus secciones",
      body: "Todo lo de Mercado Libre está en el menú de la izquierda: tus publicaciones, publicar, cobro, rentabilidad y chats, además de tus pedidos y estadísticas. Las vamos a ver una por una.",
      position: "right",
    },
    {
      selector: ".ml-listings-tab",
      title: "Tus publicaciones",
      body: "Acá ves todo lo que publicaste en Mercado Libre. Cada publicación muestra su estado, las visitas, la calidad y cuánto recibís después de la comisión.",
      position: "top",
    },
    {
      selector: ".ml-filter-chip",
      title: "Filtrá y ordená",
      body: "Filtrá por estado (activas, pausadas o con error de cobro), buscá por nombre o código y ordená por las más vendidas o las de mayor stock.",
      position: "bottom",
    },
    {
      selector: "[data-tour='ml-link-listing']",
      title: "¿Publicaste algo directo en Mercado Libre?",
      body: "Con «Vincular publicación» asociás esa publicación a un producto de Ventaz para tenerla controlada acá también: stock, estado y ventas.",
      position: "bottom",
    },
  ],

  "/mercado-libre/publicar": [
    {
      selector: ".ml-publish-tab",
      title: "Publicar",
      body: "Acá elegís qué producto del catálogo de Ventaz vender en tu cuenta de Mercado Libre.",
      position: "top",
    },
    {
      selector: ".seller-products-search",
      title: "Buscá un producto",
      body: "Escribí el nombre o el código del producto para encontrarlo rápido en el catálogo.",
      position: "bottom",
    },
    {
      selector: ".ml-publish-tab .seller-products-tabs",
      title: "Filtros del catálogo",
      body: "Mirá todo el catálogo, solo tus favoritos o los productos con más ventas de toda la plataforma (Top ventas).",
      position: "bottom",
    },
    {
      selector: ".ml-stock-filter",
      title: "Stock mínimo",
      body: "Mostrá solo productos que tengan más unidades disponibles que el número que pongas. Un producto con poco stock se pausa solo.",
      position: "bottom",
    },
    {
      selector: ".ml-catalog-card",
      title: "Cada producto",
      body: "Cada tarjeta muestra el producto con su costo y las variantes de color o tamaño, si tiene.",
      position: "right",
    },
    {
      selector: ".ml-catalog-card__btn--primary",
      title: "Publicar",
      body: "Con este botón elegís la categoría de Mercado Libre, el precio y las imágenes. Ahí mismo ves cuánto recibís después de la comisión de Mercado Libre.",
      position: "right",
    },
  ],

  "/mercado-libre/cobro": [
    {
      selector: ".ml-wallet-tab",
      title: "Cobro",
      body: "Acá ves cuánto le debés a Ventaz por tus ventas de Mercado Libre (el costo del producto de cada venta) y cómo se paga.",
      position: "top",
    },
    {
      selector: "[data-tour='ml-wallet-how']",
      title: "Cuándo se cobra",
      body: "Todos los días a las 14:00 se junta lo que se debe por tus ventas y se cobra en un solo cargo. En los planes Pro y Max tenés un plazo de gracia antes de que la deuda se vuelva obligatoria.",
      position: "bottom",
    },
    {
      selector: ".ml-wallet-metrics",
      title: "Tus números",
      body: "Tu saldo disponible, la deuda pendiente y, cuando hay ventas por cobrar, la fecha del próximo cobro.",
      position: "bottom",
    },
    {
      selector: ".ml-payment-method",
      title: "Método de pago",
      body: "Guardá una tarjeta para que el cobro sea automático. Si tu tarjeta no se puede guardar para el débito automático, probá con otra.",
      position: "bottom",
    },
    {
      selector: "[data-tour='ml-add-balance']",
      title: "Agregar saldo",
      body: "Podés cargar saldo por adelantado con tu tarjeta guardada: las ventas se descuentan primero del saldo y, si no alcanza, de la tarjeta.",
      position: "top",
    },
    {
      selector: "[data-tour='ml-wallet-history']",
      title: "Historial de movimientos",
      body: "Acá queda registrado cada cobro, carga de saldo y descuento por una venta.",
      position: "top",
    },
  ],

  "/mercado-libre/rentabilidad": [
    {
      selector: ".seller-products-tabs",
      title: "Rentabilidad",
      body: "La ganancia real de tu operación en Mercado Libre. Mirala por mes (últimos 6 o 12 meses) o elegí «Por rango» para cualquier desde/hasta.",
      position: "bottom",
    },
    {
      selector: "[data-tour='rent-kpis']",
      title: "De la facturación a la ganancia",
      body: "Facturación, costo de los productos, comisión de Mercado Libre y envío: con esos datos reales de tus ventas se calcula la ganancia bruta.",
      position: "bottom",
    },
    {
      selector: null,
      title: "Ganancia neta",
      body: "Más abajo cargás la publicidad, los Ingresos Brutos y tus gastos fijos del mes, que Mercado Libre no informa, para ver la ganancia neta. Los gráficos comparan tu facturación con la ganancia y con la publicidad.",
      position: "center",
    },
  ],

  "/mercado-libre/chats": [
    {
      selector: null,
      title: "Chats",
      body: "Acá ves las preguntas que te hacen los compradores en tus publicaciones, con la respuesta que se les dio.",
      position: "center",
    },
    {
      selector: "[data-tour='chats-bot']",
      title: "Respuesta automática con IA",
      body: "Con el interruptor activás que la IA conteste sola cuando tiene datos suficientes. En «Configurar bot» cargás las reglas de tu negocio y qué información de cada producto puede mostrar.",
      position: "bottom",
    },
    {
      selector: null,
      title: "Cuando la IA no sabe",
      body: "Si no puede responder, le avisa al comprador que le van a contestar a la brevedad y la pregunta queda «Esperando tu respuesta» para que la contestes vos.",
      position: "center",
    },
  ],

  // Cierran el recorrido de Mercado Libre (ver ML_TOUR_CHAIN).
  "/orders": [
    {
      selector: null,
      title: "Mis pedidos",
      body: "Acá están todas tus ventas con su estado y tu ganancia. Las de Mercado Libre llevan su etiqueta y, al abrirlas, ves la comisión de Mercado Libre y los datos del envío.",
      position: "center",
    },
  ],

  "/estadisticas": [
    {
      selector: null,
      title: "Estadísticas",
      body: "Tus ventas de Mercado Libre en números: facturación, unidades, los productos que más facturan, de qué provincias te compran y en qué horarios, comparado con el período anterior.",
      position: "center",
    },
    {
      selector: null,
      title: "¡Listo!",
      body: "Ya conocés todas las secciones. Cuando quieras repasar una, el botón «¿Cómo usar?» te explica cada pantalla.",
      position: "center",
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

// ─── Pasos que esperan una acción real (no un simple "Siguiente") ─────────────
// Conectar Mercado Libre navega de verdad a la web de ML (window.location.href, no un router
// interno) y vuelve recién con el redirect de OAuth — eso reinicia por completo el estado de
// React, así que el paso que espera esto no puede vivir solo en memoria: se guarda en
// localStorage (mismo motivo que StartChoice.jsx usa localStorage para sobrevivir el salto de
// la verificación de mail) y cada condición sabe reconocer, en la URL con la que se vuelve, si
// ya se cumplió.
const TOUR_RESUME_KEY = "ventaz_tour_resume";
const WAIT_CONDITIONS = {
  "ml-connected": {
    isSatisfiedFromUrl: (params) => params.get("ml_connected") === "true",
  },
};

// ─── Recorrido completo del track mercadolibre (?guide=full) ──────────────────
// Cada sección es una pantalla del menú, con su propio tour en TOURS. Se recorren en este orden y
// siempre con la cuenta ya conectada, así cada pantalla tiene datos reales para señalar.
const ML_TOUR_CHAIN = [
  "/mercado-libre/publicaciones",
  "/mercado-libre/publicar",
  "/mercado-libre/cobro",
  "/mercado-libre/rentabilidad",
  "/mercado-libre/chats",
  "/orders",
  "/estadisticas",
];
const ML_FIRST_PATH = ML_TOUR_CHAIN[0]; // donde está el botón de conectar la cuenta

function fetchMlConnected() {
  return client.get("/seller/ml/status").then(r => !!r.data?.connected).catch(() => false);
}

// Los pasos con onlyIf: "ml-disconnected" (bienvenida y conectar) solo van si todavía no hay
// una cuenta de Mercado Libre conectada.
function stepsForState(fullSteps, mlConnected) {
  return fullSteps.filter(s => !s.onlyIf || (s.onlyIf === "ml-disconnected" && !mlConnected));
}

function resolveSteps(pathname, onboardingTrack) {
  let steps = null;
  if (TOURS[pathname]) steps = TOURS[pathname];
  else if (/^\/pages\/[^/]+\/products/.test(pathname)) steps = TOURS["/pages/:id/products"];
  else if (/^\/pages\/[^/]+\/discounts/.test(pathname)) steps = TOURS["/pages/:id/discounts"];
  else if (/^\/pages\/[^/]+\/integrations/.test(pathname)) steps = TOURS["/pages/:id/integrations"];
  else if (/^\/pages\/[^/]+/.test(pathname)) steps = TOURS["/pages/:id"];
  if (!steps) return null;

  // Los vendedores 100% Mercado Libre cobran directo por MP de ML, no configuran CVU en
  // Ventaz (esa sección ni siquiera se les muestra en /profile) — mostrarles este paso
  // apuntaría a algo que no existe en su pantalla.
  if (pathname === "/profile" && onboardingTrack === "mercadolibre") {
    steps = steps.filter(s => s.title !== "CVU para cobros");
  }
  return steps;
}

// ─── Posicionar el tooltip cerca del elemento ─────────────────────────────────

function getTooltipStyle(rect, position, tooltipSize = { w: 340, h: 250 }) {
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
  const { seller } = useAuth();
  const [active, setActive]       = useState(false);
  const [steps,  setSteps]        = useState([]);
  const [stepIdx, setStepIdx]     = useState(0);
  const [spotlight, setSpotlight] = useState(null); // { top, left, width, height }
  const [chain, setChain]         = useState(false); // recorrido completo de Mercado Libre (?guide=full)

  // ?guide=true muestra el tutorial de esta pantalla; ?guide=full arranca además el recorrido
  // completo de Mercado Libre, que al terminar cada sección sigue con la siguiente (ver
  // ML_TOUR_CHAIN). También reanuda uno que había quedado esperando una acción real (ver
  // WAIT_CONDITIONS) si la URL con la que se volvió confirma que ya se cumplió.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pathname = location.pathname;

    async function begin({ startAtStep = null, chainOn = false } = {}) {
      const full = resolveSteps(pathname, seller?.onboarding_track);
      if (!full) return;

      const isMlSection = pathname.startsWith("/mercado-libre/");
      let connected = true;
      if (isMlSection || full.some(s => s.onlyIf)) {
        connected = await fetchMlConnected();
        // Si mientras tanto se cambió de pantalla, este tutorial ya no corresponde.
        if (window.location.pathname !== pathname) return;
        // Sin cuenta conectada no hay nada para mostrar en las demás secciones: se empieza por conectarla.
        if (isMlSection && !connected && pathname !== ML_FIRST_PATH) {
          navigate({ pathname: ML_FIRST_PATH, search: `?guide=${chainOn ? "full" : "true"}` }, { replace: true });
          return;
        }
      }

      const list = stepsForState(full, connected);
      setSteps(list);
      setStepIdx(startAtStep ? Math.max(0, list.indexOf(startAtStep)) : 0);
      setChain(chainOn);
      setActive(true);
    }

    try {
      const raw = localStorage.getItem(TOUR_RESUME_KEY);
      if (raw) {
        const resume = JSON.parse(raw);
        localStorage.removeItem(TOUR_RESUME_KEY); // se reanuda una sola vez; si no se cumplió, no reanuda sola
        if (resume.pathname === pathname && WAIT_CONDITIONS[resume.waitFor]?.isSatisfiedFromUrl(params)) {
          const full = resolveSteps(pathname, seller?.onboarding_track);
          if (full) begin({ startAtStep: full[Math.min(resume.stepIdx + 1, full.length - 1)], chainOn: !!resume.chain });
          return; // no evaluar además ?guide en esta misma carga
        }
      }
    } catch { /* localStorage no disponible — el tour simplemente no se reanuda solo */ }

    const guide = params.get("guide");
    if (guide !== "true" && guide !== "full") return;
    // /mercado-libre en el track mercadolibre solo redirige a la sección que corresponde (ver
    // MercadoLibreEntry en App.jsx) y conserva ?guide — el tutorial arranca ahí, no en la redirección.
    if (pathname === "/mercado-libre" && seller?.onboarding_track === "mercadolibre") return;
    if (!resolveSteps(pathname, seller?.onboarding_track)) return;

    // Limpiar el param de la URL
    params.delete("guide");
    const newSearch = params.toString();
    navigate(
      { pathname, search: newSearch ? `?${newSearch}` : "" },
      { replace: true }
    );

    begin({ chainOn: guide === "full" });
  }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras el paso activo sea de los que esperan una acción real, se deja guardada la marca
  // de reanudación — si el usuario navega afuera (ej. a autorizar Mercado Libre) y la app de
  // React se remonta de cero al volver, el efecto de arriba puede reconocer dónde había quedado.
  // stepIdx es el índice en la lista completa del tour: los pasos que esperan una acción solo
  // existen mientras la cuenta no está conectada, y en ese caso la lista no se filtra.
  useEffect(() => {
    if (!active || !steps.length) return;
    const step = steps[stepIdx];
    if (!step?.waitFor) return;
    try {
      localStorage.setItem(TOUR_RESUME_KEY, JSON.stringify({ pathname: location.pathname, stepIdx, waitFor: step.waitFor, chain }));
    } catch { /* ignore */ }
  }, [active, stepIdx, steps, chain, location.pathname]);

  // Actualizar spotlight cuando cambia el paso. La pantalla puede estar todavía cargando sus
  // datos (listas, saldo, catálogo) cuando arranca el paso, así que si el elemento no está se
  // reintenta unos segundos antes de mostrar el cartel sin resaltar nada.
  useEffect(() => {
    if (!active || !steps.length) return;
    const step = steps[stepIdx];
    if (!step?.selector) {
      setSpotlight(null);
      return;
    }

    let cancelled = false;
    let tries = 0;
    let timer;
    let scrollTimer;

    function attempt() {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (!el) {
        setSpotlight(null);
        if (++tries < 20) timer = setTimeout(attempt, 250);
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Esperar a que termine el scroll antes de leer el rect
      scrollTimer = setTimeout(() => {
        if (cancelled) return;
        const rect = el.getBoundingClientRect();
        setSpotlight({
          top:    rect.top    - 6,
          left:   rect.left   - 6,
          width:  rect.width  + 12,
          height: rect.height + 12,
        });
      }, 400);
    }

    // Pequeño delay para que el DOM se actualice si hubo un scroll/render
    timer = setTimeout(attempt, 120);

    return () => { cancelled = true; clearTimeout(timer); clearTimeout(scrollTimer); };
  }, [active, stepIdx, steps]);

  const close = useCallback(() => {
    setActive(false);
    setSpotlight(null);
    setStepIdx(0);
    setChain(false);
    try { localStorage.removeItem(TOUR_RESUME_KEY); } catch { /* ignore */ }
  }, []);

  // Posición de esta pantalla dentro del recorrido completo de Mercado Libre (-1 si no es parte).
  const chainPos = chain ? ML_TOUR_CHAIN.indexOf(location.pathname) : -1;
  const hasNextSection = chainPos >= 0 && chainPos < ML_TOUR_CHAIN.length - 1;

  const next = useCallback(() => {
    if (steps[stepIdx]?.waitFor) return; // bloqueado hasta que se cumpla la condición real
    if (stepIdx < steps.length - 1) {
      setStepIdx(i => i + 1);
    } else if (hasNextSection) {
      // Terminó esta sección: se pasa a la siguiente, que arranca sola con su propio tutorial.
      setActive(false);
      setSpotlight(null);
      navigate({ pathname: ML_TOUR_CHAIN[chainPos + 1], search: "?guide=full" });
    } else {
      close();
    }
  }, [stepIdx, steps, close, hasNextSection, chainPos, navigate]);

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

  // Paso "waitFor": el spotlight deja de ser solo decorativo — el elemento real de abajo tiene
  // que poder tocarse (ej. el botón de conectar Mercado Libre). En vez de un solo overlay de
  // pantalla completa, se cubre únicamente el área ALREDEDOR del spotlight con 4 franjas que sí
  // capturan clics — el rectángulo del spotlight en sí queda como un agujero real, sin ningún
  // div encima, así el clic llega directo al elemento de la página.
  const interactive = !!(step.waitFor && spotlightRect);
  const vw = typeof window !== "undefined" ? window.innerWidth  : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const bands = interactive ? [
    { top: 0,                     left: 0, width: vw, height: Math.max(0, spotlightRect.top) },
    { top: spotlightRect.bottom,  left: 0, width: vw, height: Math.max(0, vh - spotlightRect.bottom) },
    { top: spotlightRect.top,     left: 0, width: Math.max(0, spotlightRect.left), height: spotlightRect.height },
    { top: spotlightRect.top,     left: spotlightRect.right, width: Math.max(0, vw - spotlightRect.right), height: spotlightRect.height },
  ] : [];

  return createPortal(
    // gt-root captura clics para cerrar — pointer-events: all (salvo en modo interactive, donde
    // en vez de esto son las 4 franjas de abajo las que capturan, dejando el spotlight libre).
    <div className={`gt-root${interactive ? " gt-root--passthrough" : ""}`} onClick={interactive ? undefined : close}>

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

      {/* Modo interactive: las franjas alrededor del spotlight cierran el tour al tocarlas: el
          spotlight mismo no tiene ninguna encima, así que el clic ahí llega al elemento real. */}
      {interactive && bands.map((b, i) => (
        <div
          key={i}
          className="gt-block"
          style={{ position: "fixed", top: b.top, left: b.left, width: b.width, height: b.height }}
          onClick={close}
        />
      ))}

      {/* Tooltip card — stopPropagation para que no cierre al hacer clic */}
      <div className="gt-tooltip" style={tooltipStyle} onClick={e => e.stopPropagation()}>
        <div className="gt-tooltip__header">
          <div className="gt-tooltip__step-info">
            <MapPin size={13} className="gt-tooltip__pin" />
            <span className="gt-tooltip__counter">
              {stepIdx + 1} / {steps.length}
              {chainPos >= 0 && ` · Sección ${chainPos + 1} de ${ML_TOUR_CHAIN.length}`}
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
          {steps.map((_, i) => {
            // No se puede saltear a un paso posterior mientras el actual esté esperando una
            // acción real sin cumplir todavía — sí se puede volver para atrás.
            const locked = !!step.waitFor && i > stepIdx;
            return (
              <button
                key={i}
                type="button"
                className={`gt-dot${i === stepIdx ? " gt-dot--active" : ""}`}
                onClick={() => !locked && setStepIdx(i)}
                disabled={locked}
                aria-label={`Ir al paso ${i + 1}`}
              />
            );
          })}
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
          {step.waitFor ? (
            <span className="gt-btn gt-btn--waiting">Conectá tu cuenta para seguir…</span>
          ) : (
            <button
              type="button"
              className={`gt-btn ${isLast && !hasNextSection ? "gt-btn--finish" : "gt-btn--primary"}`}
              onClick={next}
            >
              {isLast ? (hasNextSection ? "Siguiente sección" : "Finalizar") : "Siguiente"} {(!isLast || hasNextSection) && <ChevronRight size={15} />}
            </button>
          )}
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
       * gt-root--passthrough: paso "waitFor" — el fondo deja de capturar clics él mismo
       * (eso ahora lo hacen las franjas .gt-block, que dejan libre el hueco del spotlight
       * para que el clic llegue al elemento real de la página).
       */
      .gt-root--passthrough { pointer-events: none; }

      /* Franja de bloqueo alrededor del spotlight en modo interactivo — mismo comportamiento
         que gt-root (cierra el tour al tocarla), pero deja el spotlight en sí sin cubrir. */
      .gt-block {
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
      .gt-btn--waiting {
        background: #f3f4f6;
        color: #9ca3af;
        cursor: default;
        margin-left: auto;
      }

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
