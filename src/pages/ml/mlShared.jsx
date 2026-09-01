import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { unitFor } from "./mlUtils";

// Insignia con ícono redondeado — mismo tratamiento visual que ya se usa en el primer paso de
// "Agregar variantes" (PublishVariantsModal), reutilizado acá para que el resto de los modales
// de esta sección compartan el mismo lenguaje visual en vez de que cada uno tenga el suyo.
export function IconBadge(props) {
  const { icon: Icon, color = "var(--brand,#4db81a)", bg = "var(--brand-light,#eafbe0)", size = 56, iconSize = 26 } = props;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.29, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon size={iconSize} color={color} />
    </div>
  );
}

// ── Modal genérico (portal a document.body — evita el bug de position:fixed
// roto por algún transform en un contenedor padre, mismo patrón que usa PageProducts.jsx) ──

// `footer` es opcional — cuando se pasa (botones de acción tipo Atrás/Siguiente/Publicar),
// queda FUERA del área con scroll, como tercer bloque fijo, para que nunca se pueda perder de
// vista scrolleando el contenido (pasaba en el wizard de publicar: con muchas categorías
// sugeridas, el botón "Siguiente" quedaba después de la lista y había que scrollear para verlo).
export function Modal({ title, onClose, children, footer, maxWidth = 460 }) {
  return createPortal(
    <div
      style={{
        // z-index por encima de 5000: PageProducts porta una barra de búsqueda "sticky"
        // a document.body con z-index 5000 al hacer scroll, y sin esto quedaba tapando el modal.
        position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 6000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div className="card" style={{ maxWidth, width: "100%", padding: 0, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto", minHeight: 0 }}>{children}</div>
        {footer && (
          <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Mercado Libre a veces da una lista fija (marca, por ejemplo) que no siempre tiene la opción
// real del producto — como igual mandamos value_name como texto (no value_id), ML acepta un
// valor que no esté en la lista, así que dejamos una opción "Otra" que pasa a un input libre.
export function AttributeField({ attr, value, onChange }) {
  const isNumberUnit = attr.valueType === "number_unit";
  const hasOptions   = attr.values?.length > 0;
  const matchesOption = hasOptions && attr.values.some(v => v.name === value);
  const [customMode, setCustomMode] = useState(hasOptions && !!value && !matchesOption);

  return (
    <div>
      <label style={{ fontSize: ".78rem", display: "block", marginBottom: 3 }}>
        {attr.name}
        {isNumberUnit && (
          <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}> ({unitFor(attr)})</span>
        )}
      </label>
      {hasOptions && !customMode ? (
        <select className="form-input" value={value || ""} onChange={e => {
          if (e.target.value === "__custom__") { setCustomMode(true); onChange(""); return; }
          onChange(e.target.value);
        }}>
          <option value="">Seleccioná...</option>
          {attr.values.map(v => <option key={v.id || v.name} value={v.name}>{v.name}</option>)}
          <option value="__custom__">No está en la lista (escribir)...</option>
        </select>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <input
            className="form-input"
            type={isNumberUnit ? "number" : "text"}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
          />
          {hasOptions && (
            <button type="button" onClick={() => { setCustomMode(false); onChange(""); }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: ".74rem", color: "var(--brand,#4db81a)", textAlign: "left" }}>
              Elegir de la lista
            </button>
          )}
        </div>
      )}
    </div>
  );
}
