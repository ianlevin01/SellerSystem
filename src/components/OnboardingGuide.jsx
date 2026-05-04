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
import "./OnboardingGuide.css";

const TOUR_DONE_KEY = "ventaz_seller_onboarding_done_v3";

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

function currentPageExtraSteps(pathname) {
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

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [copyKey, setCopyKey] = useState(0);
  const [firstStoreId, setFirstStoreId] = useState(null);

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

  const steps = useMemo(() => {
    return currentPageExtraSteps(location.pathname) || buildFullProgramSteps(firstStoreId);
  }, [location.pathname, firstStoreId]);

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
    const nextSteps = currentPageExtraSteps(location.pathname) || buildFullProgramSteps(firstStoreId);
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
          <div className="og-dim" />

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
