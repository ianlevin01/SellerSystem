// src/components/OnboardingGuide.jsx
// Guía interactiva profesional de Ventaz
// cambio hecho por Yolo

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  X,
} from "lucide-react";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "./OnboardingGuide.css";

const TOUR_DONE_KEY = "ventaz_seller_onboarding_done_v3";

// Tour completo para el track de Mercado Libre — a diferencia del de ecommerce, las 3
// secciones de /mercado-libre (Tus publicaciones/Publicar producto/Cobro) son pestañas de
// estado interno, no rutas distintas, así que no podemos forzar el cambio de pestaña como
// sí hacemos con /pages/:id/products vs /pages/:id/discounts — el spotlight se queda en
// elementos siempre visibles (banner de conexión, barra de pestañas) en vez de asumir
// una pestaña puntual activa.
function buildMlProgramSteps(connected) {
  return [
    {
      path: "/dashboard",
      selector: null,
      title: "Bienvenido a Ventaz",
      body: "En menos de un minuto vas a entender cómo publicar tu catálogo en Mercado Libre y ver tus ventas desde el panel.",
    },
    {
      path: "/dashboard",
      selector: ".stat-grid",
      title: "Resumen del negocio",
      body: "Acá ves rápidamente cuánto vendiste, qué pedidos tenés pendientes y cómo viene la actividad.",
    },
    {
      path: "/mercado-libre",
      selector: null,
      title: "Tu sección de Mercado Libre",
      body: "Desde acá conectás tu propia cuenta de Mercado Libre y publicás el catálogo de Ventaz directo ahí.",
    },
    {
      path: "/mercado-libre",
      selector: ".ml-connection-banner",
      title: "Conectá tu cuenta",
      body: connected
        ? "Ya conectaste tu cuenta de Mercado Libre — perfecto, podés desconectarla o cambiarla desde acá cuando quieras."
        : "Tocá 'Conectar Mercado Libre' y autorizá a Ventaz — es un solo paso, con tu cuenta real de Mercado Libre. El resto de esta guía tiene más sentido una vez conectado.",
    },
    {
      path: "/mercado-libre",
      selector: connected ? ".ml-tabs" : ".ml-connection-banner",
      title: "Las 3 secciones",
      body: connected
        ? "'Tus publicaciones' muestra lo que ya publicaste. En 'Cobro' guardás una tarjeta (se usa para cobrarte una vez al día el costo de tus ventas). En 'Publicar producto' elegís qué vender."
        : "Una vez que conectes tu cuenta, van a aparecer 3 pestañas acá: 'Tus publicaciones', 'Cobro' (para guardar una tarjeta) y 'Publicar producto'. Conectá tu cuenta y volvé a abrir esta guía (botón 'Guía' abajo a la derecha) para verlas.",
    },
    {
      path: "/orders",
      selector: ".vtz-orders-list-wrap, .vtz-orders-hero, .orders-list, .card",
      title: "Pedidos",
      body: "Cuando alguien te compre por Mercado Libre, el pedido aparece acá con un distintivo de Mercado Libre.",
    },
    {
      path: "/chat",
      selector: ".vtz-chat-layout, .vtz-chat-main, .vtz-chat-sidebar, .card",
      title: "Mensajes",
      body: "Si un cliente te escribe por la tienda web, respondés desde acá sin salir del panel.",
    },
    {
      path: "/calculator",
      selector: ".vtz-calc-form, .vtz-calc-top, .vtz-calc-result-card, .card",
      title: "Calculadora",
      body: "Usala para revisar costos y márgenes antes de definir el precio de un producto en Mercado Libre.",
    },
    {
      path: null,
      selector: null,
      title: "Listo",
      body: connected
        ? "Eso es lo esencial. Si necesitás repasar el recorrido, el botón Guía queda siempre abajo a la derecha."
        : "Conectá tu cuenta cuando quieras y volvé a esta guía para ver el resto — el botón Guía queda siempre abajo a la derecha.",
    },
  ];
}

function buildFullProgramSteps(firstStoreId) {
  const hasStore = Boolean(firstStoreId);
  const editorPath = hasStore ? `/pages/${firstStoreId}` : "/pages";
  const productsPath = hasStore ? `/pages/${firstStoreId}/products` : "/pages";
  const discountsPath = hasStore ? `/pages/${firstStoreId}/discounts` : "/pages";

  return [
    {
      path: "/dashboard",
      selector: null,
      title: "Bienvenido a Ventaz",
      body: "En menos de un minuto vas a entender cómo manejar tu tienda, ventas y cobros desde el panel.",
    },
    {
      path: "/dashboard",
      selector: ".stat-grid",
      title: "Resumen del negocio",
      body: "Acá ves rápidamente cuánto vendiste, qué pedidos tenés pendientes y cómo viene la actividad.",
    },
    {
      path: "/pages",
      selector: ".vtz-pages-hero, .vtz-pages-grid, .vtz-pages-empty",
      title: "Tus tiendas",
      body: "Desde acá creás y configurás la tienda que van a ver tus clientes.",
    },
    {
      path: editorPath,
      selector: ".page-tabs, .pe-content, .vtz-pages-empty",
      title: hasStore ? "Configuración de tienda" : "Crear la primera tienda",
      body: hasStore
        ? "En esta parte ajustás la información principal, el diseño y los datos visibles de tu tienda."
        : "Primero tenés que crear una tienda. Después vas a poder configurar productos y descuentos.",
    },
    {
      path: productsPath,
      selector: ".seller-products-intro, .seller-product-card, .vtz-pages-empty",
      title: "Agregar productos",
      body: hasStore
        ? "Acá elegís qué productos publicar, definís tu precio de venta y ves la ganancia estimada."
        : "Cuando tengas una tienda creada, desde Productos vas a elegir qué vender y a qué precio.",
    },
    {
      path: discountsPath,
      selector: ".page-tabs, .card, .pe-content, .vtz-pages-empty",
      title: "Descuentos",
      body: hasStore
        ? "Desde esta sección podés preparar promociones cuidando que el precio final siga teniendo margen."
        : "Después de crear tu tienda, vas a poder sumar descuentos y promociones desde esta pestaña.",
    },
    {
      path: "/orders",
      selector: ".vtz-orders-list-wrap, .vtz-orders-hero, .orders-list, .card",
      title: "Pedidos",
      body: "Cuando un cliente compra, el pedido aparece acá con su estado, total y ganancia correspondiente.",
    },
    {
      path: "/cobros",
      selector: ".vtz-payouts-hero, .vtz-payouts-grid, .vtz-payouts-transfer-btn, .card",
      title: "Cobros",
      body: "Acá consultás lo disponible y solicitás la transferencia de lo que ganaste.",
    },
    {
      path: "/chat",
      selector: ".vtz-chat-layout, .vtz-chat-main, .vtz-chat-sidebar, .card",
      title: "Mensajes",
      body: "Si un cliente te escribe, respondés desde acá sin salir del panel.",
    },
    {
      path: "/calculator",
      selector: ".vtz-calc-form, .vtz-calc-top, .vtz-calc-result-card, .card",
      title: "Calculadora",
      body: "Usala para probar precios antes de publicar y validar si la ganancia tiene sentido.",
    },
    {
      path: null,
      selector: null,
      title: "Listo",
      body: "Eso es lo esencial. Si necesitás repasar el recorrido, el botón Guía queda siempre abajo a la derecha.",
    },
  ];
}

function currentPageExtraSteps(pathname, mlConnected) {
  // /pages — create first page
  if (pathname === "/pages") {
    return [
      {
        path: pathname,
        selector: null,
        title: "Tus tiendas",
        body: "Desde acá creás y administrás las tiendas que van a ver tus clientes.",
      },
      {
        path: pathname,
        selector: ".vtz-pages-hero",
        title: "Creá tu primera tienda",
        body: "Hacé click en el botón 'Crear mi primera tienda' para configurar tu tienda online con nombre y diseño.",
      },
    ];
  }

  // /profile — complete profile
  if (pathname === "/profile") {
    return [
      {
        path: pathname,
        selector: null,
        title: "Tu perfil",
        body: "Completá tus datos para poder operar en la plataforma y recibir cobros correctamente.",
      },
      {
        path: pathname,
        selector: ".vtz-profile-card--avatar",
        title: "Foto de perfil",
        body: "Subí una foto tuya o de tu negocio. Ayuda a generar confianza con tus clientes.",
      },
      {
        path: pathname,
        selector: ".vtz-profile-section, .vtz-profile-card",
        title: "Teléfono y datos",
        body: "Ingresá tu nombre completo, teléfono y ciudad. El teléfono se verifica por código SMS.",
      },
      {
        path: "/cobros",
        selector: null,
        title: "CVU para cobros",
        body: "Para recibir tus ganancias, configurá tu CVU o alias bancario en la sección Cobros.",
      },
    ];
  }

  // /mercado-libre — conectar cuenta y publicar el primer producto
  if (pathname === "/mercado-libre") {
    return [
      {
        path: pathname,
        selector: null,
        title: "Mercado Libre",
        body: "Acá conectás tu cuenta y publicás el catálogo de Ventaz directo en tu propia cuenta de Mercado Libre.",
      },
      {
        path: pathname,
        selector: ".ml-connection-banner",
        title: "Conectá tu cuenta",
        body: mlConnected
          ? "Ya conectaste tu cuenta de Mercado Libre — perfecto."
          : "Tocá 'Conectar Mercado Libre' y autorizá a Ventaz — es un solo paso.",
      },
      {
        path: pathname,
        selector: mlConnected ? ".ml-tabs" : ".ml-connection-banner",
        title: "Las 3 secciones",
        body: mlConnected
          ? "Empezá por 'Cobro' para guardar una tarjeta, y después publicá tu primer producto desde 'Publicar producto'."
          : "Una vez conectada tu cuenta, van a aparecer acá 'Tus publicaciones', 'Cobro' y 'Publicar producto'.",
      },
    ];
  }

  // /cobros — configure CVU
  if (pathname === "/cobros") {
    return [
      {
        path: pathname,
        selector: null,
        title: "Tus cobros",
        body: "Desde acá ves tu balance de ganancias y configurás tu CVU para recibir transferencias.",
      },
      {
        path: pathname,
        selector: ".vtz-payouts-grid, .vtz-payouts-hero, .card",
        title: "Configurar CVU",
        body: "Ingresá tu CVU de 22 dígitos o tu alias bancario. Una vez verificado, vas a poder solicitar transferencias.",
      },
    ];
  }

  // /pages/:id/integrations — connect integration
  if (/^\/pages\/[^/]+\/integrations/.test(pathname)) {
    return [
      {
        path: pathname,
        selector: null,
        title: "Integraciones",
        body: "Conectá tu tienda con herramientas externas para medir y potenciar tus ventas.",
      },
      {
        path: pathname,
        selector: ".page-tabs",
        title: "Secciones de la tienda",
        body: "Usá estas pestañas para navegar entre Configuración, Productos, Descuentos e Integraciones.",
      },
      {
        path: pathname,
        selector: ".card, .pe-content",
        title: "Activar Meta Pixel",
        body: "Activá el Meta Pixel ingresando tu Pixel ID. Esto te permite medir visitas y conversiones desde tus anuncios de Facebook e Instagram.",
      },
    ];
  }

  if (/^\/pages\/[^/]+\/products/.test(pathname)) {
    return [
      {
        path: pathname,
        selector: null,
        title: "Productos de la tienda",
        body: "Te muestro cómo elegir productos, cargar precios y revisar la ganancia estimada.",
      },
      {
        path: pathname,
        selector: ".seller-products-search",
        title: "Buscar productos",
        body: "Usá el buscador para encontrar rápido un producto por nombre o código.",
      },
      {
        path: pathname,
        selector: ".seller-products-cats",
        title: "Filtrar por categoría",
        body: "Las categorías te ayudan a ordenar el catálogo. En celular se deslizan horizontalmente.",
      },
      {
        path: pathname,
        selector: ".seller-product-card",
        title: "Leer la tarjeta",
        body: "Cada producto muestra costo revendedor, precio sugerido, precio de venta y ganancia.",
      },
      {
        path: pathname,
        selector: ".seller-product-sale",
        title: "Definir precio",
        body: "Este es el precio que verá el cliente. Al modificarlo, cambia la ganancia estimada.",
      },
      {
        path: pathname,
        selector: ".seller-product-btn--add, .seller-product-btn--save",
        title: "Publicar o guardar",
        body: "Tocá Agregar a mi tienda. Si el producto ya está publicado, guardá el nuevo precio.",
      },
    ];
  }

  if (/^\/pages\/[^/]+\/discounts/.test(pathname)) {
    return [
      {
        path: pathname,
        selector: null,
        title: "Descuentos de la tienda",
        body: "Desde acá podés crear promociones sin perder de vista el margen.",
      },
      {
        path: pathname,
        selector: ".page-tabs",
        title: "Ubicar la sección",
        body: "Usá estas pestañas para volver a Configuración o Productos cuando lo necesites.",
      },
      {
        path: pathname,
        selector: ".card, .pe-content",
        title: "Editar promoción",
        body: "Cargá la regla de descuento y revisá que el precio final siga siendo conveniente.",
      },
      {
        path: pathname,
        selector: ".btn--primary, .pe-save-bar__btn",
        title: "Guardar cambios",
        body: "Cuando termines, guardá para que el descuento quede aplicado.",
      },
    ];
  }

  if (/^\/pages\/[^/]+$/.test(pathname)) {
    return [
      {
        path: pathname,
        selector: null,
        title: "Editor de tienda",
        body: "Acá dejás preparada la tienda que van a ver tus clientes.",
      },
      {
        path: pathname,
        selector: ".page-tabs",
        title: "Secciones principales",
        body: "Configuración, Productos y Descuentos están separados para trabajar con más orden.",
      },
      {
        path: pathname,
        selector: ".pe-sidebar",
        title: "Partes editables",
        body: "Entrá por partes: diseño, portada, datos públicos, redes y categorías.",
      },
      {
        path: pathname,
        selector: ".pe-content",
        title: "Editar contenido",
        body: "Modificá una cosa por vez y revisá que la tienda quede clara para el cliente.",
      },
      {
        path: pathname,
        selector: ".pe-save-bar, .pe-save-bar__btn",
        title: "Guardar",
        body: "Guardá los cambios para que se vean en la tienda pública.",
      },
    ];
  }

  return null;
}

function isVisible(el) {
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  const styles = window.getComputedStyle(el);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    styles.opacity !== "0"
  );
}

function findTarget(selector) {
  if (!selector) return null;

  const selectors = selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const item of selectors) {
    const el = document.querySelector(item);
    if (isVisible(el)) return el;
  }

  return null;
}

function rectFromElement(el) {
  if (!el) return null;

  const rect = el.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function overlapArea(a, b) {
  if (!a || !b) return 0;

  const x = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  );

  const y = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  );

  return x * y;
}

function computeCardPosition({ spotlight, winW, winH }) {
  const mobile = winW <= 760;
  const width = Math.min(380, winW - 28);
  const height = mobile ? 238 : 220;
  const margin = mobile ? 12 : 16;
  const gap = mobile ? 12 : 18;

  if (mobile) {
    return {
      width,
      left: margin,
      top: winH - height - margin,
      placement: "mobile",
    };
  }

  if (!spotlight) {
    return {
      width,
      left: clamp(winW / 2 - width / 2, margin, winW - width - margin),
      top: clamp(winH / 2 - height / 2, margin, winH - height - margin),
      placement: "center",
    };
  }

  const target = {
    left: spotlight.left,
    top: spotlight.top,
    width: spotlight.width,
    height: spotlight.height,
  };

  const raw = [
    {
      placement: "right",
      left: spotlight.left + spotlight.width + gap,
      top: spotlight.top + Math.min(20, spotlight.height * 0.25),
    },
    {
      placement: "left",
      left: spotlight.left - width - gap,
      top: spotlight.top + Math.min(20, spotlight.height * 0.25),
    },
    {
      placement: "below",
      left: spotlight.left + spotlight.width / 2 - width / 2,
      top: spotlight.top + spotlight.height + gap,
    },
    {
      placement: "above",
      left: spotlight.left + spotlight.width / 2 - width / 2,
      top: spotlight.top - height - gap,
    },
    {
      placement: "top-right",
      left: winW - width - margin,
      top: margin,
    },
    {
      placement: "bottom-right",
      left: winW - width - margin,
      top: winH - height - margin,
    },
    {
      placement: "bottom-left",
      left: margin,
      top: winH - height - margin,
    },
  ];

  const candidates = raw.map((candidate) => {
    const left = clamp(candidate.left, margin, winW - width - margin);
    const top = clamp(candidate.top, margin, winH - height - margin);
    const card = { left, top, width, height };

    return {
      ...candidate,
      left,
      top,
      width,
      height,
      overlap: overlapArea(card, target),
    };
  });

  candidates.sort((a, b) => {
    if (a.overlap !== b.overlap) return a.overlap - b.overlap;

    const priority = {
      right: 0,
      left: 1,
      below: 2,
      above: 3,
      "top-right": 4,
      "bottom-right": 5,
      "bottom-left": 6,
    };

    return priority[a.placement] - priority[b.placement];
  });

  return candidates[0];
}

function pickFirstStoreId(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.pages)
      ? payload.pages
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

  return list[0]?.id || list[0]?._id || list[0]?.page_id || null;
}

export default function OnboardingGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const { seller } = useAuth();
  const isMlTrack = seller?.onboarding_track === "mercadolibre";

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [copyKey, setCopyKey] = useState(0);
  const [firstStoreId, setFirstStoreId] = useState(null);
  const [mlConnected, setMlConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    client
      .get("/seller/store/pages")
      .then((res) => {
        if (!alive) return;
        setFirstStoreId(pickFirstStoreId(res.data));
      })
      .catch(() => {
        if (!alive) return;
        setFirstStoreId(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Solo relevante para el track de Mercado Libre — determina si los pasos que hablan de
  // pestañas ya visibles (Tus publicaciones/Cobro/Publicar producto) tienen sentido o si
  // todavía hay que guiar a conectar la cuenta primero.
  useEffect(() => {
    if (!isMlTrack) return;
    let alive = true;
    client.get("/seller/ml/status")
      .then(res => { if (alive) setMlConnected(!!res.data?.connected); })
      .catch(() => { if (alive) setMlConnected(false); });
    return () => { alive = false; };
  }, [isMlTrack]);

  const steps = useMemo(() => {
    return currentPageExtraSteps(location.pathname, mlConnected)
      || (isMlTrack ? buildMlProgramSteps(mlConnected) : buildFullProgramSteps(firstStoreId));
  }, [location.pathname, firstStoreId, isMlTrack, mlConnected]);

  const step = steps[stepIndex] || steps[0];

  const updateTarget = useCallback(
    (options = {}) => {
      if (!open || !step) return;

      if (!step.selector) {
        setTargetRect(null);
        return;
      }

      const el = findTarget(step.selector);

      if (!el) {
        // Importante: no limpiamos targetRect acá.
        // Así el recuadro no salta al centro mientras la ruta nueva termina de cargar.
        return;
      }

      if (options.scroll !== false) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }

      window.setTimeout(() => {
        const refreshed = findTarget(step.selector);
        if (refreshed) setTargetRect(rectFromElement(refreshed));
      }, options.instant ? 0 : 220);
    },
    [open, step]
  );

  function startTour() {
    const nextSteps = currentPageExtraSteps(location.pathname, mlConnected)
      || (isMlTrack ? buildMlProgramSteps(mlConnected) : buildFullProgramSteps(firstStoreId));
    const first = nextSteps[0];

    setOpen(true);
    setStepIndex(0);
    setCopyKey((value) => value + 1);

    if (first?.selector) {
      const el = findTarget(first.selector);
      if (el) setTargetRect(rectFromElement(el));
    } else {
      setTargetRect(null);
    }

    if (first?.path && first.path !== location.pathname) {
      navigate(first.path);
    }
  }

  function closeTour(markDone = true) {
    setOpen(false);
    setStepIndex(0);
    setTargetRect(null);

    if (markDone) {
      localStorage.setItem(TOUR_DONE_KEY, "1");
    }
  }

  function goToStep(nextIndex) {
    const safeIndex = clamp(nextIndex, 0, steps.length - 1);
    const next = steps[safeIndex];

    setCopyKey((value) => value + 1);

    // Si el elemento ya existe en la pantalla actual, actualizamos antes de cambiar texto.
    // Así no hay salto al centro.
    if (next?.selector && (!next.path || next.path === location.pathname)) {
      const el = findTarget(next.selector);
      if (el) setTargetRect(rectFromElement(el));
    }

    if (!next?.selector) {
      setTargetRect(null);
    }

    setStepIndex(safeIndex);

    if (next?.path && next.path !== location.pathname) {
      navigate(next.path);
    }
  }

  function nextStep() {
    if (stepIndex >= steps.length - 1) {
      closeTour(true);
      return;
    }

    goToStep(stepIndex + 1);
  }

  function prevStep() {
    goToStep(stepIndex - 1);
  }

  // Auto-start when navigated from the onboarding checklist with ?guide=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("guide") !== "true") return;

    // Remove the param from the URL without triggering a navigation
    navigate(location.pathname, { replace: true });

    const timer = window.setTimeout(() => {
      setOpen(true);
      setStepIndex(0);
      setTargetRect(null);
      setCopyKey((value) => value + 1);
    }, 350);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (localStorage.getItem(TOUR_DONE_KEY)) return;
    if (location.pathname !== "/" && location.pathname !== "/dashboard") return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      setStepIndex(0);
      setTargetRect(null);
      setCopyKey((value) => value + 1);

      if (location.pathname !== "/dashboard") {
        navigate("/dashboard");
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!open || !step) return undefined;

    if (step.path && step.path !== location.pathname) {
      navigate(step.path);
      return undefined;
    }

    let cancelled = false;
    let tries = 0;

    function place() {
      if (cancelled) return;

      updateTarget({ instant: tries > 0 });
      tries += 1;

      if (tries < 8 && step.selector && !findTarget(step.selector)) {
        window.setTimeout(place, 160);
      }
    }

    place();

    return () => {
      cancelled = true;
    };
  }, [open, stepIndex, step, location.pathname, navigate, updateTarget]);

  useEffect(() => {
    if (!open) return undefined;

    function onMove() {
      updateTarget({ scroll: false, instant: true });
    }

    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);

    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, updateTarget]);

  const winW = typeof window === "undefined" ? 1200 : window.innerWidth;
  const winH = typeof window === "undefined" ? 800 : window.innerHeight;

  const spotlight = targetRect
    ? {
        top: Math.max(8, targetRect.top - 8),
        left: Math.max(8, targetRect.left - 8),
        width: Math.min(winW - 16, targetRect.width + 16),
        height: Math.min(winH - 16, targetRect.height + 16),
      }
    : null;

  const position = computeCardPosition({ spotlight, winW, winH });
  const isLast = stepIndex >= steps.length - 1;

  return (
    <>
      <button type="button" className="og-launcher" onClick={startTour} aria-label="Abrir guía">
        <HelpCircle size={18} />
        <span>Guía</span>
      </button>

      {open && step && (
        <div className="og-layer" role="dialog" aria-modal="true">
          {!spotlight && <div className="og-dim" />}

          {spotlight && (
            <div
              className="og-spotlight"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
              }}
            />
          )}

          <article
            className={`og-card og-card--${position.placement}`}
            style={{
              width: position.width,
              top: position.top,
              left: position.left,
            }}
          >
            <button type="button" className="og-close" onClick={() => closeTour(false)} aria-label="Cerrar guía">
              <X size={17} />
            </button>

            <div className="og-kicker">
              <Sparkles size={15} />
              Guía rápida
            </div>

            <div key={copyKey} className="og-copy">
              <h3 className="og-title">{step.title}</h3>
              <p className="og-body">{step.body}</p>
            </div>

            <div className="og-progress">
              {steps.map((item, index) => (
                <span
                  key={`${item.title}-${index}`}
                  className={`og-pip ${index <= stepIndex ? "is-active" : ""}`}
                />
              ))}
            </div>

            <div className="og-footer">
              <span className="og-counter">
                {stepIndex + 1} de {steps.length}
              </span>

              <div className="og-actions">
                <button type="button" className="og-ghost" onClick={() => closeTour(true)}>
                  Saltar
                </button>

                <button type="button" className="og-icon-btn" onClick={prevStep} disabled={stepIndex === 0}>
                  <ChevronLeft size={17} />
                </button>

                <button type="button" className="og-next" onClick={nextStep}>
                  {isLast ? (
                    "Terminar"
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
