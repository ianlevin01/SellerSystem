import { useEffect } from "react";

export default function Impersonate() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      localStorage.setItem("seller_token", token);
      // Decodificar JWT y guardar seller_user para que AuthContext inicialice con isLoggedIn=true
      // Sin esto, ProtectedRoute redirige al login antes de que el useEffect de AuthContext corra
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        localStorage.setItem("seller_user", JSON.stringify({
          id:    payload.id,
          email: payload.email,
          name:  payload.name,
          slug:  payload.slug,
        }));
      } catch { /* token malformado — AuthContext cargará el perfil igual via /auth/me */ }
    }
    window.location.replace("/dashboard");
  }, []);

  return null;
}
