import { createPortal } from "react-dom";
import { Maximize2, X, Package, Layers } from "lucide-react";

// Misma lógica de PageProducts.jsx (firstImage/productName, no exportadas ahí) replicada acá en
// chico — el objeto que llega en session.product es el mismo shape de producto de toda la app.
function firstImage(product) {
  if (!product) return "";
  if (Array.isArray(product.seller_images) && product.seller_images.length > 0 && product.seller_images[0]) {
    return product.seller_images[0];
  }
  if (Array.isArray(product.system_images) && product.system_images.length > 0 && product.system_images[0]) {
    return product.system_images[0];
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || img?.image_url || "";
  }
  return product.image_url || product.image || product.thumbnail || product.main_image || product.photo_url || "";
}
function productName(product) {
  return product?.custom_name || product?.name || product?.nombre || "Producto sin nombre";
}

const MODE_LABEL = {
  choose: "Elegir cómo publicar",
  own: "Publicando en Mercado Libre",
  catalog: "Publicando por catálogo",
  combo: "Publicando combo",
};

// Cartelito de la publicación minimizada — esquina inferior derecha (el toast de éxito ya
// existente vive abajo a la izquierda), portado a document.body por el mismo motivo que Modal
// en mlShared.jsx: .layout__main tiene una animation con fill-mode both que deja un transform
// permanente, y eso rompe position:fixed de cualquier descendiente que no porte afuera.
export default function MinimizedPublishPill({ session, onRestore, onClose }) {
  const isCombo = session.mode === "combo";
  const image = isCombo ? "" : firstImage(session.product);
  const title = isCombo ? "Combo para Mercado Libre" : productName(session.product);
  const subtitle = MODE_LABEL[session.mode] || "Publicando en Mercado Libre";

  return createPortal(
    <div
      className="ml-minimized-pill"
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 6000, maxWidth: 300 }}
      role="button"
      tabIndex={0}
      onClick={onRestore}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRestore(); } }}
    >
      {image ? (
        <img src={image} alt="" className="ml-minimized-pill__thumb" />
      ) : (
        <div className="ml-minimized-pill__thumb ml-minimized-pill__thumb--icon">
          {isCombo ? <Layers size={18} /> : <Package size={18} />}
        </div>
      )}

      <div className="ml-minimized-pill__body">
        <div className="ml-minimized-pill__title">{title}</div>
        <div className="ml-minimized-pill__subtitle">{subtitle}</div>
      </div>

      <button type="button" className="ml-minimized-pill__btn" title="Maximizar"
        onClick={e => { e.stopPropagation(); onRestore(); }}>
        <Maximize2 size={15} />
      </button>

      <button type="button" className="ml-minimized-pill__close" title="Cerrar"
        onClick={e => { e.stopPropagation(); onClose(); }}>
        <X size={14} />
      </button>
    </div>,
    document.body
  );
}
