import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import client from "./api/client";

// Si alguien accede directamente a academia.ventaz.com.ar sin estar logueado,
// redirigirlo a ventaz.com.ar (el panel principal).
if (
  window.location.hostname === "academia.ventaz.com.ar" &&
  !localStorage.getItem("seller_token")
) {
  window.location.replace("https://ventaz.com.ar");
}
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoadingScreen from "./components/LoadingScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Landing      from "./pages/Landing";
import LandingEcom  from "./pages/LandingEcom";
import LandingMl    from "./pages/LandingMl";
import Login        from "./pages/Login";
import Register     from "./pages/Register";
import VerifyEmail  from "./pages/VerifyEmail";
import Dashboard    from "./pages/Dashboard";
import ProductEditor from "./pages/ProductEditor";
import Pages        from "./pages/Pages";
import PageEditor   from "./pages/PageEditor";
import Orders       from "./pages/Orders";
import Calculator   from "./pages/Calculator";
import PublicStore  from "./pages/PublicStore";
import Profile      from "./pages/Profile";
import Chat         from "./pages/Chat";
import Payouts      from "./pages/Payouts";
import Integrations from "./pages/Integrations";
import ComboEditor    from "./pages/ComboEditor";
import Subscription  from "./pages/Subscription";
import Estadisticas  from "./pages/Estadisticas";
import Academia      from "./pages/Academia";
import Publicidad     from "./pages/Publicidad";
import MercadoLibre    from "./pages/MercadoLibre";
import About          from "./pages/About";
import Contact        from "./pages/Contact";
import Legal          from "./pages/Legal";
import ForgotPassword  from "./pages/ForgotPassword";
import ResetPassword   from "./pages/ResetPassword";
import Impersonate     from "./pages/Impersonate";
import StartChoice     from "./pages/StartChoice";

function HomeRoute() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Landing />;
}

// Landings de campaña — mismo criterio que HomeRoute (si ya está logueado, directo al panel).
function EcomLandingRoute() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <LandingEcom />;
}
function MlLandingRoute() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <LandingMl />;
}

// Mismo criterio que HomeRoute/EcomLandingRoute/MlLandingRoute — si ya está logueado, /login
// no tiene sentido mostrarlo, directo al panel.
function LoginRoute() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />;
}

// Lleva al vendedor directo a los productos de su primera página (para links de email)
function MyProductsRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    client.get("/seller/store/pages")
      .then(res => {
        const pages = res.data || [];
        navigate(pages.length > 0 ? `/pages/${pages[0].id}/products` : "/pages", { replace: true });
      })
      .catch(() => navigate("/pages", { replace: true }));
  }, []);
  return null;
}

// Redirect /products → /pages preservando los query params (back_url de MP incluye ?payment_id=)
function ProductsRedirect() {
  const location = useLocation();
  return <Navigate to={`/pages${location.search}`} replace />;
}

// Publicidad todavía no pasó la revisión de Meta — visible solo para la cuenta de prueba.
const BETA_SELLER_EMAIL = "yolodercye@gmail.com";
function PublicidadRoute() {
  const { seller } = useAuth();
  return seller?.email === BETA_SELLER_EMAIL ? <Publicidad /> : <Navigate to="/dashboard" replace />;
}

// Detecta el ?payment_id= que MP agrega al back_url y llama al confirm endpoint
function PaymentReturnHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentId = params.get("payment_id") || params.get("collection_id");
    if (!paymentId) return;
    client.get(`/seller/purchase/confirm?payment_id=${paymentId}`).catch(() => {});
    const confirmed = params.get("confirmed");
    navigate(location.pathname + (confirmed ? `?confirmed=${confirmed}` : ""), { replace: true });
  }, []);
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);

  if (!ready) return <LoadingScreen onDone={() => setReady(true)} />;

  return (
    <AuthProvider>
      <BrowserRouter>
        <PaymentReturnHandler />
        <Routes>
          {/* Públicas */}
          <Route path="/"             element={<HomeRoute />} />
          <Route path="/ecom"         element={<EcomLandingRoute />} />
          <Route path="/ml"           element={<MlLandingRoute />} />
          <Route path="/login"        element={<LoginRoute />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/verify-email"     element={<VerifyEmail />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
          <Route path="/store/:slug"      element={<PublicStore />} />
          <Route path="/impersonate"      element={<Impersonate />} />

          {/* Panel del vendedor (requiere auth) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/start" element={<StartChoice />} />
            <Route element={<Layout />}>
              <Route path="/dashboard"                     element={<Dashboard />} />
              <Route path="/products"                      element={<ProductsRedirect />} />
              <Route path="/mis-productos"                 element={<MyProductsRedirect />} />
              <Route path="/products/:productId/edit"                        element={<ProductEditor />} />
              <Route path="/pages/:pageId/products/:productId/edit"        element={<ProductEditor />} />
              <Route path="/pages/:pageId/combos/:comboId/edit"          element={<ComboEditor />} />
              <Route path="/pages"                         element={<Pages />} />
              <Route path="/orders"                        element={<Orders />} />
              <Route path="/calculator"                    element={<Calculator />} />
              <Route path="/profile"                       element={<Profile />} />
              <Route path="/chat"                          element={<Chat />} />
              <Route path="/estadisticas"                  element={<Estadisticas />} />
              <Route path="/cobros"                        element={<Payouts />} />
              <Route path="/integrations"                  element={<Integrations />} />
              <Route path="/about"                         element={<About />} />
              <Route path="/contact"                       element={<Contact />} />
              <Route path="/legal"                         element={<Legal />} />

              <Route path="/subscription"                  element={<Subscription />} />
              <Route path="/academia"                      element={<Academia />} />
              <Route path="/publicidad"                    element={<PublicidadRoute />} />
              <Route path="/mercado-libre"                 element={<MercadoLibre />} />
              {/* Redirecciones de rutas antiguas */}
              <Route path="/store-config"  element={<Navigate to="/pages" replace />} />
              <Route path="/discounts"     element={<Navigate to="/pages" replace />} />
            </Route>

            {/* Editor de tienda — pantalla completa sin sidebar */}
            <Route path="/pages/:pageId"              element={<PageEditor tab="config" />} />
            <Route path="/pages/:pageId/products"     element={<PageEditor tab="products" />} />
            <Route path="/pages/:pageId/discounts"    element={<PageEditor tab="discounts" />} />
            <Route path="/pages/:pageId/integrations" element={<PageEditor tab="integrations" />} />
            <Route path="/pages/:pageId/ai"           element={<PageEditor tab="ai" />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
