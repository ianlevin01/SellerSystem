// src/content/landingEcom.js
// SEO/FAQS de la landing de ecommerce (/ecom), separados del componente porque react-refresh
// no permite mezclar exports de datos con el export de un componente en el mismo archivo.
// Los usa tanto LandingEcom.jsx (useSeo/useJsonLd en el cliente) como entry-server.jsx
// (scripts/prerender.mjs) — una sola fuente de verdad para el <head> de esta ruta.
export const SEO = {
  title: "Vendé con tu propia tienda online sin comprar stock | Ventaz",
  description: "Creá tu tienda online con tu marca, elegí tus productos y tu precio. Ventaz te da el catálogo, la logística y la operación — vos te encargás de conseguir clientes.",
  path: "/ecom",
};

export const FAQS = [
  {
    q: "¿Ventaz es una tienda o una plataforma para vendedores?",
    a: "Ventaz es una plataforma. Le da al vendedor catálogo, tienda, sistema y operación para que pueda vender sin crear todo desde cero.",
  },
  {
    q: "¿Qué tiene que hacer el vendedor?",
    a: "El vendedor se enfoca en conseguir clientes, comunicar los productos, cerrar ventas y construir su marca.",
  },
  {
    q: "¿Qué hace Ventaz por detrás?",
    a: "Ventaz mantiene el stock organizado, registra pedidos, centraliza la operación, acompaña la logística y brinda soporte si aparece un problema.",
  },
  {
    q: "¿Tengo que comprar mercadería antes de vender?",
    a: "No. La idea es que puedas comenzar con una estructura ya armada, sin comprar stock desde el primer día.",
  },
  {
    q: "¿Qué pasa si hay un reclamo?",
    a: "Ventaz interviene con reglas claras. Los cambios se aceptan por falla de fábrica o error en la operación.",
  },
];
