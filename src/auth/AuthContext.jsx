// src/auth/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from "react";
import { signInWithPopup } from "firebase/auth";
import { firebaseAuth, googleProvider } from "../firebase";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [seller, setSeller] = useState(() => {
    try {
      const stored = localStorage.getItem("seller_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const res = await client.post("/seller/auth/login", { email, password });
    const { token, seller: sellerData } = res.data;
    localStorage.setItem("seller_token", token);
    // Fetch full profile data (includes city, age, how_found_us, phone_verified)
    localStorage.setItem("seller_user", JSON.stringify(sellerData));
    setSeller(sellerData);
    // Refresh immediately to get all profile fields
    try {
      const profileRes = await client.get("/seller/auth/me");
      localStorage.setItem("seller_user", JSON.stringify(profileRes.data));
      setSeller(profileRes.data);
      return profileRes.data;
    } catch {
      return sellerData;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!firebaseAuth) throw new Error("Login con Google no disponible");
    const result  = await signInWithPopup(firebaseAuth, googleProvider);
    const idToken = await result.user.getIdToken();
    const res     = await client.post("/seller/auth/google", { idToken });
    const { token, seller: sellerData } = res.data;
    localStorage.setItem("seller_token", token);
    localStorage.setItem("seller_user", JSON.stringify(sellerData));
    setSeller(sellerData);
    try {
      const profileRes = await client.get("/seller/auth/me");
      localStorage.setItem("seller_user", JSON.stringify(profileRes.data));
      setSeller(profileRes.data);
      return profileRes.data;
    } catch {
      return sellerData;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("seller_token");
    localStorage.removeItem("seller_user");
    setSeller(null);
  }, []);

  const refreshSeller = useCallback(async () => {
    const res = await client.get("/seller/auth/me");
    localStorage.setItem("seller_user", JSON.stringify(res.data));
    setSeller(res.data);
    return res.data;
  }, []);

  return (
    <AuthContext.Provider value={{ seller, login, loginWithGoogle, logout, refreshSeller, isLoggedIn: !!seller }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
