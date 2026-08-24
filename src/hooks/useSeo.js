// src/hooks/useSeo.js
// Actualiza el <title> y las meta tags ya presentes en index.html (description, canonical,
// og:*, twitter:*) para que cada ruta pública (landings) tenga su propio título/descripción
// en vez de compartir siempre el genérico. Solo muta tags que YA existen en el <head> (no crea
// nada nuevo) — así no hay riesgo de duplicar tags si el componente se monta más de una vez.
//
// Ojo: esto solo ayuda a navegadores reales y a Googlebot (que sí ejecuta JavaScript). Los
// crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) no corren JS y van a seguir viendo el
// index.html estático tal cual — para que también vean esto hace falta pre-renderizar la
// página a HTML en el build (ver vite.config.js / plugin de prerender).
import { useEffect } from "react";

const BASE_URL = "https://ventaz.com.ar";

function setAttr(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export default function useSeo({ title, description, path, image }) {
  useEffect(() => {
    if (title) {
      document.title = title;
      setAttr('meta[property="og:title"]', "content", title);
      setAttr('meta[name="twitter:title"]', "content", title);
    }
    if (description) {
      setAttr('meta[name="description"]', "content", description);
      setAttr('meta[property="og:description"]', "content", description);
      setAttr('meta[name="twitter:description"]', "content", description);
    }
    if (path) {
      const url = `${BASE_URL}${path}`;
      setAttr('link[rel="canonical"]', "href", url);
      setAttr('meta[property="og:url"]', "content", url);
    }
    if (image) {
      const url = `${BASE_URL}${image}`;
      setAttr('meta[property="og:image"]', "content", url);
      setAttr('meta[name="twitter:image"]', "content", url);
    }
  }, [title, description, path, image]);
}
