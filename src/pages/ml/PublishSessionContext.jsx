import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { IconBadge } from "./mlShared";
import PublishModeChooser from "./PublishModeChooser";
import PublishModal from "./PublishModal";
import PublishCatalogModal from "./PublishCatalogModal";
import PublishComboModal from "./PublishComboModal";
import MinimizedPublishPill from "./MinimizedPublishPill";

const PublishSessionContext = createContext(null);

export function usePublishSession() {
  return useContext(PublishSessionContext);
}

// Dueño del estado de "qué se está publicando en Mercado Libre" — vive acá (montado en
// Layout.jsx, no en MercadoLibre.jsx) para que sobreviva la navegación entre páginas cuando se
// minimiza: si viviera en MercadoLibre.jsx, React Router lo desmontaría al cambiar de ruta.
//
// session = null | { mode: "choose"|"own"|"combo"|"catalog", product?, comboId?, siteId?,
//                     addressStatus?, minimized }
// Empezar una publicación nueva mientras hay una activa reemplaza la anterior — sin pila de
// varias minimizadas a la vez, no se pidió y complica la UI para un caso raro.
export function PublishSessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [justPublished, setJustPublished] = useState(null);

  // TODO: "choose" (elegir entre publicación propia o por catálogo) queda deshabilitado a
  // propósito — la publicación por catálogo todavía no tiene su migración de DB corrida ni su
  // backend commiteado. Directo a "own" (el wizard de siempre) hasta que eso esté listo; para
  // reactivar el selector alcanza con volver esto a mode: "choose".
  function startPublish({ product, siteId, addressStatus }) {
    setSession({ mode: "own", product, siteId, addressStatus, minimized: false });
  }
  function startCombo({ comboId, addressStatus }) {
    setSession({ mode: "combo", comboId, addressStatus, minimized: false });
  }
  function chooseOwn()     { setSession(s => s && { ...s, mode: "own" }); }
  function chooseCatalog() { setSession(s => s && { ...s, mode: "catalog" }); }
  function minimize()      { setSession(s => s && { ...s, minimized: true }); }
  function restore()       { setSession(s => s && { ...s, minimized: false }); }
  function close()         { setSession(null); }

  // MercadoLibre.jsx, si está montada en este momento, "reclama" justPublished en un effect
  // propio (lo copia a su estado local para mostrar el toast rico de siempre con polling de
  // fotos + botón de variantes, y llama a dismissJustPublished) — si NO está montada, el toast
  // simple de acá abajo es lo único que el vendedor ve.
  function handlePublished(listing) {
    setJustPublished(listing);
    setSession(null);
  }
  function dismissJustPublished() { setJustPublished(null); }

  const value = {
    session, startPublish, startCombo, chooseOwn, chooseCatalog, minimize, restore, close,
    handlePublished, justPublished, dismissJustPublished,
  };

  return (
    <PublishSessionContext.Provider value={value}>
      {children}

      {session?.mode === "choose" && !session.minimized && (
        <PublishModeChooser
          product={session.product}
          onChooseOwn={chooseOwn}
          onChooseCatalog={chooseCatalog}
          onClose={close}
        />
      )}

      {session?.mode === "own" && (
        <PublishModal
          product={session.product}
          siteId={session.siteId}
          addressStatus={session.addressStatus}
          minimized={session.minimized}
          onMinimize={minimize}
          onClose={close}
          onPublished={handlePublished}
        />
      )}

      {session?.mode === "catalog" && (
        <PublishCatalogModal
          product={session.product}
          siteId={session.siteId}
          addressStatus={session.addressStatus}
          minimized={session.minimized}
          onMinimize={minimize}
          onClose={close}
          onSwitchToOwn={chooseOwn}
          onPublished={handlePublished}
        />
      )}

      {session?.mode === "combo" && (
        <PublishComboModal
          comboId={session.comboId}
          addressStatus={session.addressStatus}
          minimized={session.minimized}
          onMinimize={minimize}
          onClose={close}
          onPublished={handlePublished}
        />
      )}

      {session?.minimized && (
        <MinimizedPublishPill session={session} onRestore={restore} onClose={close} />
      )}

      {justPublished && createPortal(
        <div style={{
          position: "fixed", bottom: 24, left: 24, zIndex: 7000, maxWidth: 360,
          background: "#fff", border: "1px solid var(--border)", borderRadius: 16,
          boxShadow: "0 16px 40px rgba(0,0,0,.18)", padding: "16px 18px",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <IconBadge icon={CheckCircle2} color="var(--success,#059669)" bg="rgba(5,150,105,.12)" size={36} iconSize={18} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: ".9rem", fontWeight: 800 }}>¡Publicado en Mercado Libre!</strong>
            <p style={{ margin: "3px 0 0", fontSize: ".8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Entrá a "Tus publicaciones" para verlo.
            </p>
          </div>
          <button type="button" onClick={dismissJustPublished}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 2, flexShrink: 0 }}>
            ✕
          </button>
        </div>,
        document.body
      )}
    </PublishSessionContext.Provider>
  );
}
