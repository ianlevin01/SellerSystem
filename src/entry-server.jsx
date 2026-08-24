// src/entry-server.jsx
// Entry point de SSR usado SOLO en build time por scripts/prerender.mjs — no corre en
// producción como servidor (Ventaz sigue siendo un sitio estático en Vercel). Renderiza
// directamente las páginas públicas, sin pasar por <App/> (que trae AuthProvider, todas las
// rutas autenticadas, etc. — nada de eso hace falta ni es seguro renderizar del lado del
// servidor). Las páginas usan hooks (useSeo/useJsonLd) que solo tocan el DOM dentro de
// useEffect, así que no corren durante renderToString — el <head> por ruta lo arma
// scripts/prerender.mjs a partir del mismo SEO/FAQS que exporta cada página.
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import Landing from "./pages/Landing.jsx";
import LandingEcom from "./pages/LandingEcom.jsx";
import LandingMl from "./pages/LandingMl.jsx";
import { SEO as LandingSEO, FAQS as LandingFAQS } from "./content/landing.js";
import { SEO as EcomSEO, FAQS as EcomFAQS } from "./content/landingEcom.js";
import { SEO as MlSEO, FAQS as MlFAQS } from "./content/landingMl.js";

// scripts/prerender.mjs itera esto: por cada ruta arma el <head> (title/description/OG +
// FAQPage JSON-LD) con seo/faqs, y el <div id="root"> con lo que devuelve render(route).
export const ROUTES = {
  "/": { Component: Landing, seo: LandingSEO, faqs: LandingFAQS },
  "/ecom": { Component: LandingEcom, seo: EcomSEO, faqs: EcomFAQS },
  "/ml": { Component: LandingMl, seo: MlSEO, faqs: MlFAQS },
};

export function render(url) {
  const route = ROUTES[url];
  if (!route) throw new Error(`No hay página registrada para pre-renderizar la ruta "${url}"`);
  return renderToString(
    <StaticRouter location={url}>
      <route.Component />
    </StaticRouter>
  );
}
