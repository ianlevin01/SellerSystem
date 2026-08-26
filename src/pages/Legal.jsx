// src/pages/Legal.jsx
// Página legal y privacidad interna de Ventaz

import { FileText, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

// Mismo logo/badge amarillo que ya se usa en StartChoice.jsx para identificar Mercado Libre
// en el resto del panel — acá con la misma API (size) que los íconos de lucide-react, para
// que el render de la sección no tenga que distinguir entre ícono e imagen.
function MercadoLibreLogo({ size = 20 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: size / 4, background: "#FFE600",
      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <img src="/mercadolibre-logo.png" alt="" style={{ width: "72%", height: "72%", objectFit: "contain" }} />
    </span>
  );
}

const sections = [
  {
    id: "terminos",
    title: "Términos de uso",
    icon: FileText,
    paragraphs: [
      "Ventaz es una plataforma que permite a vendedores crear y administrar tiendas online, seleccionar productos disponibles, definir precios y gestionar su actividad comercial desde el panel.",
      "El usuario se compromete a cargar información real, usar la plataforma de buena fe y no publicar contenido falso, ofensivo, ilegal o que pueda afectar a clientes, terceros o a Ventaz.",
      "Las funcionalidades, integraciones, comisiones, reglas operativas y condiciones comerciales pueden actualizarse para mejorar el servicio o adaptarse a cambios de operación.",
    ],
  },
  {
    id: "privacidad",
    title: "Privacidad y datos personales",
    icon: LockKeyhole,
    paragraphs: [
      "Ventaz puede recolectar datos necesarios para crear la cuenta, operar la tienda, brindar soporte, gestionar pedidos, mejorar el servicio y cumplir obligaciones aplicables.",
      "Entre esos datos pueden incluirse nombre, email, teléfono, datos de perfil, información de tienda, actividad dentro del panel y comunicaciones con soporte.",
      "El usuario puede solicitar acceso, actualización o eliminación de sus datos escribiendo a soporte, siempre que no exista una obligación operativa o legal de conservar determinada información.",
    ],
  },
  {
    id: "operacion",
    title: "Pedidos, cambios y soporte",
    icon: RefreshCw,
    paragraphs: [
      "Los pedidos se procesan de acuerdo con la disponibilidad de stock, datos cargados por el vendedor y condiciones operativas vigentes al momento de la compra.",
      "Los cambios se gestionan únicamente cuando exista falla de fábrica comprobable o error operativo. No se aceptan cambios por uso indebido, daño accidental o motivos no contemplados.",
      "Ante dudas o reclamos, Ventaz puede intervenir para revisar la situación y orientar la resolución correspondiente.",
    ],
  },
  {
    id: "mercadolibre",
    title: "Mercado Libre",
    icon: MercadoLibreLogo,
    paragraphs: [
      { lead: "Despacho centralizado.", text: "Ventaz despacha todas las ventas realizadas por Mercado Libre desde su propio depósito, sin importar qué vendedor sea el dueño de la cuenta o de la publicación." },
      { lead: "Costo por venta.", text: "Cada venta genera un cargo a cuenta del vendedor, equivalente al costo del producto vendido (no al precio pagado por el comprador), calculado según el plan contratado." },
      { lead: "Período de gracia y deuda vencida.", text: "Según el plan contratado, el vendedor cuenta con un período de gracia para abonar el costo de los productos vendidos. Mientras haya una deuda vencida, Ventaz deja de despachar los pedidos pendientes de esa cuenta. Apenas se debita el total adeudado, el despacho se retoma con normalidad — no hay ninguna otra consecuencia." },
      { lead: "Cargos de Mercado Libre.", text: "Ventaz no se hace responsable por ningún cargo adicional que Mercado Libre le aplique al vendedor sobre su cuenta o sus publicaciones, sea cual sea el motivo. Ese tipo de cargos son exclusivamente entre el vendedor y Mercado Libre." },
      { lead: "Devoluciones.", text: "Si un comprador inicia una devolución, el caso se procesa recién cuando el producto es recibido en nuestro depósito. A partir de ahí entra en un período de revisión, donde evaluamos tanto el producto devuelto como la publicación original, para descartar que la devolución haya sido causada por un error en cómo se publicó. Si no hubo error y el caso es aprobado por Ventaz, el costo cobrado por esa venta se reintegra como saldo en la cuenta del vendedor." },
      { lead: "Cancelaciones antes del despacho.", text: "Si una venta se cancela antes de generarse el envío, no se genera ningún cargo — no llegó a despacharse nada." },
      { lead: "Publicaciones no hechas desde Ventaz.", text: "Ventaz asume el costo y el despacho únicamente para productos publicados a través de la plataforma. Si detectamos una venta de un producto de nuestro catálogo publicado directamente en Mercado Libre por fuera de Ventaz, no se genera ningún cargo de forma automática — nos ponemos en contacto con el vendedor para revisar la situación." },
      { lead: "Domicilio de despacho.", text: "El vendedor debe mantener cargada en su cuenta de Mercado Libre la dirección de despacho que le indique Ventaz. Si la dirección configurada no coincide, las publicaciones quedan bloqueadas hasta que se corrija." },
    ],
  },
  {
    id: "seguridad",
    title: "Seguridad de la cuenta",
    icon: ShieldCheck,
    paragraphs: [
      "El vendedor es responsable de mantener la confidencialidad de su contraseña y del uso de su cuenta.",
      "Si detecta un acceso no autorizado o actividad sospechosa, debe contactar a soporte lo antes posible.",
      "Ventaz puede limitar o suspender una cuenta si detecta uso indebido, fraude, incumplimientos o riesgo para clientes, vendedores o la plataforma.",
    ],
  },
];

export default function Legal() {
  return (
    <main className="info-page legal-page">
      <section className="info-hero">
        <div className="info-hero__copy">
          <span className="info-kicker"><ShieldCheck size={16} /> Legal y privacidad</span>
          <h1>Reglas claras para operar con confianza.</h1>
          <p>Esta página resume las condiciones principales de uso, privacidad, soporte y operación dentro de Ventaz.</p>
        </div>      </section>

      <section className="legal-layout">
        <aside className="legal-nav">
          <span>Contenido</span>
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        </aside>

        <div className="legal-content">
          {sections.map(({ id, title, icon: Icon, paragraphs }) => (
            <section className="legal-block" id={id} key={id}>
              <div className="legal-block__head"><Icon size={20} /><h2>{title}</h2></div>
              {paragraphs.map((paragraph, i) => (
                <p key={i}>
                  {typeof paragraph === "string" ? paragraph : <><strong>{paragraph.lead}</strong> {paragraph.text}</>}
                </p>
              ))}
            </section>
          ))}

          <section className="legal-block legal-block--soft">
            <h2>Contacto legal y privacidad</h2>
            <p>Para consultas sobre cuenta, datos, privacidad o condiciones de uso, escribinos desde la página de contacto.</p>
            <Link to="/contact" className="info-btn info-btn--primary">Ir a contacto</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
