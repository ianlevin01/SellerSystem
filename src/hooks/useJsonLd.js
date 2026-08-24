// src/hooks/useJsonLd.js
// Inyecta un <script type="application/ld+json"> en el <head> mientras el componente esté
// montado, y lo saca al desmontar (para no acumular schemas de otras páginas al navegar entre
// rutas de la SPA). Mismo límite que useSeo: solo lo ve Googlebot (ejecuta JS) hasta que se
// pre-renderice la página — los crawlers de IA necesitan el HTML ya armado.
import { useEffect } from "react";

export default function useJsonLd(id, data) {
  useEffect(() => {
    if (!data) return undefined;
    // Si la página vino pre-renderizada (ver scripts/prerender.mjs) ya existe un <script> con
    // este id en el HTML servido — se reutiliza en vez de agregar uno duplicado al hidratar.
    let script = document.getElementById(id);
    const createdHere = !script;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => { if (createdHere) script.remove(); };
  }, [id, data]);
}
