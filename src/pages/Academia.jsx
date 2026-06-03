const COMING_SOON = [
  { icon: "🏪", title: "Cómo crear y configurar tu tienda",    desc: "Desde el slug y los colores hasta los primeros productos. Todo para que tu tienda esté lista para vender." },
  { icon: "📦", title: "Gestión de productos y precios",        desc: "Cómo agregar productos, fijar precios, aplicar descuentos y gestionar tu catálogo de forma eficiente." },
  { icon: "💳", title: "Pagos y cobros con MercadoPago",        desc: "Integración completa, cómo recibir pagos, hacer seguimiento de órdenes y retirar tus ganancias." },
  { icon: "📈", title: "Estrategias para vender más",           desc: "Combos, descuentos por volumen, promociones y otras herramientas para aumentar tus ventas." },
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
        </div>
      </div>

      <div className="academia-body">
        <div className="academia-soon">
          <div className="academia-soon__badge">Próximamente</div>
          <h2 className="academia-soon__title">Los cursos están en camino</h2>
          <p className="academia-soon__desc">
            Estamos preparando el contenido para que puedas aprender todo lo que necesitás
            para sacarle el máximo provecho a Ventaz.
          </p>
        </div>

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
  );
}
