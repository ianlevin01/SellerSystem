// src/utils/seo.js
// Arma el JSON-LD de FAQPage a partir del mismo array de preguntas que ya se muestra en
// pantalla — una sola fuente de verdad, nunca hay que mantener las preguntas dos veces.
// FAQPage es el schema con mayor correlación con citas de IA (ChatGPT/Perplexity/etc.) según
// la literatura de GEO — por eso es la primera pieza de structured data que se agrega acá.
export function buildFaqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
