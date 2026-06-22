import { useEffect } from "react";

export default function Impersonate() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) localStorage.setItem("seller_token", token);
    window.location.replace("/dashboard");
  }, []);

  return null;
}
