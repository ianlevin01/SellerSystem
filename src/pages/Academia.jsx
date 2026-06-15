const COMING_SOON = [
  { icon: "🏪", title: "Cómo crear y configurar tu tienda",    desc: "Desde el slug y los colores hasta los primeros productos." },
  { icon: "📦", title: "Gestión de productos y precios",        desc: "Cómo agregar productos, fijar precios y gestionar tu catálogo." },
  { icon: "💳", title: "Pagos y cobros con MercadoPago",        desc: "Integración completa, seguimiento de órdenes y retiro de ganancias." },
  { icon: "📈", title: "Estrategias para vender más",           desc: "Combos, descuentos y herramientas para aumentar tus ventas." },
];

export default function Academia() {
  return (
    <div className="academia-page">
      <div className="academia-hero">
        <div className="academia-hero__glow" />
        <div className="academia-hero__inner">
          <span className="academia-hero__kicker">Academia Ventaz</span>
          <h1 className="academia-hero__title">Aprendé a vender online</h1>
          <p className="academia-hero__sub">Cursos prácticos para empezar a vender con Ventaz desde cero.</p>

          <h3 className="academia-preview-title">¿Qué vas a aprender?</h3>
          <div className="academia-preview-grid">
            {COMING_SOON.map((item, i) => (
              <div key={i} className="academia-preview-card">
                <span className="academia-preview-card__icon">{item.icon}</span>
                <h4 className="academia-preview-card__title">{item.title}</h4>
                <p className="academia-preview-card__desc">{item.desc}</p>
                <span className="academia-preview-card__tag">Próximamente</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
