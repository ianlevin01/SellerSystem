// scripts/prerender.mjs
// Post-build: genera HTML estático para las landings públicas (/, /ecom, /ml) a partir del
// bundle de SSR compilado en dist-ssr/entry-server.js (ver "build:ssr" en package.json).
// Ventaz sigue siendo un sitio estático — esto NO deja un servidor corriendo, solo escribe
// archivos .html una vez en build time. El motivo: crawlers de IA (GPTBot, ClaudeBot,
// PerplexityBot) no ejecutan JavaScript, así que sin esto solo verían un <div id="root">
// vacío en vez del contenido real de cada landing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, ROUTES } from "../dist-ssr/entry-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const template = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");

function escapeForAttr(value) {
  return value.replace(/"/g, "&quot;");
}

function injectHead(html, { title, description, url }) {
  const t = escapeForAttr(title);
  const d = escapeForAttr(description);
  return html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title"\s+content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:title"\s+content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`);
}

function faqPageJsonLd(faqs) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  });
}

for (const [route, { seo, faqs }] of Object.entries(ROUTES)) {
  const appHtml = render(route);
  const url = `https://ventaz.com.ar${seo.path}`;

  let pageHtml = injectHead(template, { title: seo.title, description: seo.description, url });
  pageHtml = pageHtml.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  if (faqs?.length) {
    const script = `<script type="application/ld+json" id="ld-faq">${faqPageJsonLd(faqs)}</script>`;
    pageHtml = pageHtml.replace("</head>", `${script}\n  </head>`);
  }

  // OJO: dist/index.html NO se toca acá — ese archivo es también el fallback de SPA que
  // Vercel sirve para cualquier ruta no listada (/login, /dashboard, etc. — ver rewrites en
  // vercel.json). Si lo pisáramos con el contenido de "/", esas otras rutas destellarían la
  // landing antes de que React las reemplace. "/" se escribe en su propia carpeta (home/) y
  // vercel.json la redirige ahí con una regla específica, igual que /ecom y /ml.
  const slug = route === "/" ? "home" : route.replace(/^\//, "");
  const outDir = path.join(distDir, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "index.html");
  fs.writeFileSync(outFile, pageHtml);
  console.log(`[prerender] ${route} -> ${path.relative(distDir, outFile)}`);
}
