// src/content/landing.js
// SEO/FAQS de la landing combinada (/) separados del componente porque react-refresh no
// permite mezclar exports de datos con el export de un componente en el mismo archivo.
// Los usa tanto Landing.jsx (useSeo/useJsonLd en el cliente) como entry-server.jsx
// (scripts/prerender.mjs) — una sola fuente de verdad para el <head> de esta ruta.
export const SEO = {
  title: "Ventaz — Vendé online con tu tienda propia o por Mercado Libre, sin stock",
  description: "Ventaz te da el catálogo, la logística y la operación para vender online en Argentina, con tienda propia o publicando en Mercado Libre, sin comprar stock ni manejar envíos.",
  path: "/",
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
    q: "¿Tengo que elegir entre página propia y Mercado Libre?",
    a: "No. Podés activar las dos al mismo tiempo y usar cada una como quieras — el catálogo, el stock y la operación son los mismos de los dos lados.",
  },
  {
    q: "¿Vender por Mercado Libre tiene comisión de Ventaz?",
    a: "No. Ventaz no cobra comisión sobre tus ventas de Mercado Libre — solo pagás el costo de cada producto vendido. Las comisiones propias de Mercado Libre son independientes y siguen aplicando.",
  },
  {
    q: "¿Qué pasa si hay un reclamo?",
    a: "Ventaz interviene con reglas claras. Los cambios se aceptan por falla de fábrica o error en la operación.",
  },
];
