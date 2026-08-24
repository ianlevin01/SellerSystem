// src/content/landingMl.js
// SEO/FAQS de la landing de Mercado Libre (/ml), separados del componente porque react-refresh
// no permite mezclar exports de datos con el export de un componente en el mismo archivo.
// Los usa tanto LandingMl.jsx (useSeo/useJsonLd en el cliente) como entry-server.jsx
// (scripts/prerender.mjs) — una sola fuente de verdad para el <head> de esta ruta.
export const SEO = {
  title: "Vendé por Mercado Libre sin stock ni comisión de Ventaz | Ventaz",
  description: "Conectá tu cuenta de Mercado Libre y publicá el catálogo de Ventaz. Nosotros ponemos los productos y la logística, vos solo publicás — sin comisión de Ventaz sobre tus ventas.",
  path: "/ml",
};

export const FAQS = [
  {
    q: "¿Ventaz es una tienda o una plataforma para vendedores?",
    a: "Ventaz es una plataforma. Le da al vendedor catálogo, sistema y operación para que pueda vender por Mercado Libre sin manejar stock ni logística.",
  },
  {
    q: "¿Tengo que usar mi propia cuenta de Mercado Libre?",
    a: "Sí. Conectás tu cuenta real de Mercado Libre — las publicaciones y las ventas quedan a tu nombre, Ventaz solo te da el catálogo y la operación de fondo.",
  },
  {
    q: "¿Ventaz cobra comisión sobre mis ventas de Mercado Libre?",
    a: "No. Ventaz no cobra comisión sobre tus ventas de Mercado Libre — solo pagás el costo del producto vendido. Las comisiones propias de Mercado Libre son independientes y siguen aplicando.",
  },
  {
    q: "¿Qué tiene que hacer el vendedor?",
    a: "El vendedor se enfoca en publicar, responder consultas, cerrar ventas y hacer crecer su cuenta de Mercado Libre.",
  },
  {
    q: "¿Qué hace Ventaz por detrás?",
    a: "Ventaz mantiene el stock organizado, registra pedidos, centraliza la operación, acompaña la logística y brinda soporte si aparece un problema.",
  },
  {
    q: "¿Tengo que comprar mercadería antes de vender?",
    a: "No. La idea es que puedas comenzar con una estructura ya armada, sin comprar stock desde el primer día.",
  },
];
