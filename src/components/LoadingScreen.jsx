import { useEffect, useRef, useState } from "react";

export default function LoadingScreen({ onDone }) {
  const [fading, setFading] = useState(false);
  const timer = useRef(null);

  function finish() {
    clearTimeout(timer.current);
    setFading(true);
  }

  useEffect(() => {
    timer.current = setTimeout(finish, 5000);
    return () => clearTimeout(timer.current);
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "all",
      }}
      onTransitionEnd={() => fading && onDone?.()}
    >
      <video
        src="/loading.webm"
        autoPlay muted playsInline
        onEnded={finish}
        onError={finish}
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
}
