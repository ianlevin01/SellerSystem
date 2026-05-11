import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { Layers, Pencil, Power, Trash2 } from "lucide-react";
import "../styles/Combos.css";

function fmt(n) {
  return Number(Math.round(Number(n || 0))).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function money(n) {
  const v = Math.round(Number(n || 0));
  if (!Number.isFinite(v) || v <= 0) return "—";
  return `$${fmt(v)}`;
}

export default function PageCombos({ pageId }) {
  const navigate = useNavigate();
  const [combos,  setCombos]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/seller/store/pages/${pageId}/combos`)
      .then(res => setCombos(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageId]);

  async function handleToggle(combo) {
    try {
      await client.patch(`/seller/store/pages/${pageId}/combos/${combo.id}`, { active: !combo.active });
      setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, active: !c.active } : c));
    } catch { /* silent */ }
  }

  async function handleDelete(combo) {
    if (!confirm(`¿Eliminar el combo "${combo.name}"?`)) return;
    try {
      await client.delete(`/seller/store/pages/${pageId}/combos/${combo.id}`);
      setCombos(prev => prev.filter(c => c.id !== combo.id));
    } catch { /* silent */ }
  }

  return (
    <div className="combos-section-wrap">
      <div className="combos-section-head">
        <div className="combos-section-head__left">
          <Layers size={18} />
          <div>
            <h3>Combos</h3>
            <p>Agrupá productos en combos con precio especial para tu tienda.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="combos-skeleton">
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 10 }} />)}
        </div>
      ) : combos.length === 0 ? (
        <div className="combos-empty-inline">
          <Layers size={24} />
          <span>Sin combos todavía. Usá el botón <strong>Crear combo</strong> de arriba para empezar.</span>
        </div>
      ) : (
        <div className="combos-list">
          {combos.map(combo => (
            <article key={combo.id} className={`combos-card ${!combo.active ? "is-inactive" : ""}`}>
              <div className="combos-card__thumb">
                {combo.images?.[0] ? (
                  <img src={combo.images[0]} alt={combo.name} />
                ) : (
                  <div className="combos-card__thumb-ph"><Layers size={18} /></div>
                )}
              </div>

              <div className="combos-card__body">
                <div className="combos-card__name">{combo.name}</div>
                <div className="combos-card__meta">
                  {(combo.products || []).length} producto{(combo.products || []).length !== 1 ? "s" : ""}
                  {combo.custom_price > 0 && <> · <strong>{money(combo.custom_price)}</strong></>}
                  {!combo.active && <span className="combos-badge-off">Inactivo</span>}
                </div>
              </div>

              <div className="combos-card__actions">
                <button
                  type="button"
                  title={combo.active ? "Desactivar" : "Activar"}
                  className={`combos-card__action ${combo.active ? "is-on" : ""}`}
                  onClick={() => handleToggle(combo)}
                >
                  <Power size={14} />
                </button>
                <button
                  type="button"
                  title="Editar"
                  className="combos-card__action"
                  onClick={() => navigate(`/pages/${pageId}/combos/${combo.id}/edit`)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  className="combos-card__action combos-card__action--del"
                  onClick={() => handleDelete(combo)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
