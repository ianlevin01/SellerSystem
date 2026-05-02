import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "32px 24px",
        background: "#f8fafc",
        textAlign: "center",
        fontFamily: "inherit",
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>
            Algo salió mal
          </p>
          <p style={{ margin: "6px 0 0", fontSize: ".875rem", color: "#64748b" }}>
            Ocurrió un error inesperado. Tocá el botón para reintentar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #57d625, #4ab81e)",
            color: "#fff",
            fontWeight: 700,
            fontSize: ".9rem",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
}
