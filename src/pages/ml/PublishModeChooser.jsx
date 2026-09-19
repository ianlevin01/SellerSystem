import { useState } from "react";
import { PackageCheck, FileEdit, HelpCircle, Tag, Users, Target, ClipboardList } from "lucide-react";
import { Modal, IconBadge } from "./mlShared";

// Mismo fallback de imagen que ya usan PageProducts.jsx y MinimizedPublishPill.jsx — duplicado
// acá también en vez de extraer una utilidad compartida, siguiendo la convención ya establecida
// en este código (esos dos archivos tampoco la comparten entre sí).
function firstProductImage(product) {
  if (Array.isArray(product.seller_images) && product.seller_images[0]) return product.seller_images[0];
  if (Array.isArray(product.system_images) && product.system_images[0]) return product.system_images[0];
  if (Array.isArray(product.images) && product.images.length > 0) {
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || img?.image_url || "";
  }
  return product.image_url || product.image || product.thumbnail || product.main_image || product.photo_url || "";
}

function ModeAttributeRow(props) {
  const { icon: Icon, label, value } = props;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".78rem", color: "var(--text-secondary)" }}>
      <Icon size={13} style={{ flexShrink: 0 }} />
      <span>{label} · <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</strong></span>
    </div>
  );
}

// Catálogo se muestra siempre primera y como "Recomendado" — sin detección de elegibilidad en
// vivo (eso queda para más adelante), es una preferencia de producto incondicional de Ventaz.
const OPTIONS = [
  {
    key: "catalog",
    recommended: true,
    icon: PackageCheck,
    title: "Publicación de catálogo",
    description: "Publicás sobre un producto que ya está en el catálogo de Mercado Libre. La información del producto ya está verificada y competís con otros vendedores para ser la primera opción de compra.",
    attributes: [
      { icon: Tag, label: "Información del producto", value: "Mercado Libre" },
      { icon: Users, label: "Competencia", value: "Otros vendedores del mismo producto" },
      { icon: Target, label: "Objetivo", value: "Ser vendedor destacado" },
    ],
    note: "La información del producto se toma del catálogo de Mercado Libre. Vos definís las condiciones de venta.",
    warning: "Asegurate de que el producto coincida exactamente con el del catálogo.",
    cta: "Publicar con catálogo",
  },
  {
    key: "own",
    recommended: false,
    icon: FileEdit,
    title: "Publicación tradicional",
    description: "Creá una publicación independiente con tu propio título, fotos, descripción y características. Es la opción indicada cuando el producto no está en el catálogo o cuando querés administrarlo como una publicación tradicional.",
    attributes: [
      { icon: Tag, label: "Información del producto", value: "Vos" },
      { icon: Users, label: "Competencia", value: "Listado general" },
      { icon: ClipboardList, label: "Control", value: "Título, fotos y descripción" },
    ],
    note: "Tenés mayor control sobre el contenido de la publicación, incluyendo título, fotos, descripción y características.",
    warning: null,
    cta: "Publicar tradicionalmente",
  },
];

export default function PublishModeChooser({ product, onChooseOwn, onChooseCatalog, onClose }) {
  const [showHelp, setShowHelp] = useState(false);
  const image = firstProductImage(product);
  const name = product.custom_name || product.name;
  const handlers = { catalog: onChooseCatalog, own: onChooseOwn };

  return (
    <Modal title="Elegí cómo publicar tu producto" onClose={onClose} maxWidth={800}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        {image ? (
          <img src={image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--surface-2,#f3f4f6)" }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface-2,#f3f4f6)", flexShrink: 0 }} />
        )}
        <span style={{ fontSize: ".88rem", color: "var(--text-primary)" }}>{name}</span>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: ".84rem", color: "var(--text-secondary)" }}>
        Seleccioná la modalidad que querés usar para publicar este producto en Mercado Libre.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          const onActivate = handlers[opt.key];
          return (
            <div
              key={opt.key}
              role="button"
              tabIndex={0}
              onClick={onActivate}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); } }}
              className={`card ml-mode-card${opt.recommended ? " ml-mode-card--recommended" : ""}`}
              style={{
                width: 340, textAlign: "left", padding: 20, borderRadius: 12,
                border: "1px solid var(--border)", background: "#fff",
                display: "flex", flexDirection: "column", gap: 12, position: "relative",
              }}
            >
              {opt.recommended && (
                <span className="badge badge--brand" style={{ position: "absolute", top: -10, left: 16 }}>Recomendado</span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconBadge icon={Icon} size={36} iconSize={17} />
                <h3 style={{ margin: 0, fontSize: ".96rem", fontWeight: 700 }}>{opt.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {opt.description}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                {opt.attributes.map(attr => (
                  <ModeAttributeRow key={attr.label} icon={attr.icon} label={attr.label} value={attr.value} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: ".76rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {opt.note}
              </p>
              {opt.warning && (
                <p style={{ margin: 0, fontSize: ".76rem", color: "#92400e", lineHeight: 1.4 }}>
                  {opt.warning}
                </p>
              )}
              <button
                type="button"
                className="btn btn--primary"
                style={{ marginTop: "auto", width: "100%", justifyContent: "center", padding: "11px" }}
                onClick={e => { e.stopPropagation(); onActivate(); }}
              >
                {opt.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button
          type="button"
          onClick={() => setShowHelp(v => !v)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: ".8rem", color: "var(--text-secondary)", textDecoration: "underline",
          }}
        >
          <HelpCircle size={13} /> ¿Cuál debería elegir?
        </button>
        {showHelp && (
          <p style={{ margin: "10px auto 0", maxWidth: 520, fontSize: ".78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            El catálogo agrupa a todos los vendedores que ofrecen el mismo producto en una sola Página de Producto — quien tenga mejor precio, stock y reputación aparece como vendedor destacado. Es la opción recomendada cuando tu producto ya está ahí. Si no está, o preferís manejar vos el contenido de la publicación, usá la tradicional.
          </p>
        )}
      </div>
    </Modal>
  );
}
