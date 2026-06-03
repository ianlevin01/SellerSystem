// src/api/client.js
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 15000,
});

// Adjuntar token automáticamente
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expiró, limpiar sesión (excluir rutas de auth para no interferir con errores de credenciales)
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/register");
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("seller_token");
      localStorage.removeItem("seller_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;
