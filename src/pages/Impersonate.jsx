import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Impersonate() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      localStorage.setItem("seller_token", token);
    }
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return null;
}
