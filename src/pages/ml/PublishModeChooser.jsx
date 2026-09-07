import { Store, Trophy, ArrowRight } from "lucide-react";
import { Modal, IconBadge } from "./mlShared";

// Fork previo al wizard de publicar — mismo tratamiento visual que StartChoice.jsx (las dos
// cards del onboarding ecommerce/ML), adaptado a dos opciones dentro de un Modal en vez de una
// pantalla completa. Publicación propia = el wizard de 7 pasos de siempre, sin cambios.
// Publicación de catálogo = nuevo, más corto, linkeado al catálogo compartido de Mercado Libre.
export default function PublishModeChooser({ product, onChooseOwn, onChooseCatalog, onClose }) {
  const OPTIONS = [
    {
      key: "own", icon: Store, color: "var(--brand,#4db81a)", bg: "var(--brand-light,#eafbe0)",
      title: "Publicación propia",
      description: "Publicás vos solo, con tu propio título, fotos y precio. No compite con otras publicaciones del mismo producto.",
      cta: "Elegir", onClick: onChooseOwn,
    },
    {
      key: "catalog", icon: Trophy, color: "#d97706", bg: "rgba(217,119,6,.12)",
      title: "Publicación de catálogo",
      description: "Buscás tu producto en el catálogo de Mercado Libre y competís con otros vendedores por la mejor posición (buy box) — mejor precio, envío y reputación ganan más visibilidad.",
      cta: "Elegir", onClick: onChooseCatalog,
    },
  ];

  return (
    <Modal title="Publicar en Mercado Libre" onClose={onClose} maxWidth={720}>
      <p style={{ margin: "0 0 18px", fontSize: ".86rem", color: "var(--text-secondary)" }}>
        Cómo querés publicar <strong>{product.custom_name || product.name}</strong>:
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={opt.onClick}
              className="card"
              style={{
                width: 300, textAlign: "left", padding: 22, cursor: "pointer",
                border: "1px solid var(--border)", background: "#fff",
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <IconBadge icon={Icon} color={opt.color} bg={opt.bg} />
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700 }}>{opt.title}</h3>
                <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {opt.description}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".84rem", fontWeight: 700, color: "var(--brand,#4db81a)", marginTop: "auto" }}>
                {opt.cta} <ArrowRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
