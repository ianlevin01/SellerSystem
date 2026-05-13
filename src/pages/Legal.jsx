// src/pages/Legal.jsx
// Página legal y privacidad interna de Ventaz

import { FileText, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

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
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
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
