import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

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
import About          from "./pages/About";
import Contact        from "./pages/Contact";
import Legal          from "./pages/Legal";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword  from "./pages/ResetPassword";

function HomeRoute() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  const [ready, setReady] = useState(false);

  if (!ready) return <LoadingScreen onDone={() => setReady(true)} />;

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/"             element={<HomeRoute />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/verify-email"     element={<VerifyEmail />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
          <Route path="/store/:slug"      element={<PublicStore />} />

          {/* Panel del vendedor (requiere auth) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard"                     element={<Dashboard />} />
              <Route path="/products"                      element={<Navigate to="/pages" replace />} />
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
