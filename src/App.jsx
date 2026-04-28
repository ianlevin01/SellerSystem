import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
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

function HomeRoute() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/"             element={<HomeRoute />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/store/:slug"  element={<PublicStore />} />

          {/* Panel del vendedor (requiere auth) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard"                     element={<Dashboard />} />
              <Route path="/products"                      element={<Navigate to="/pages" replace />} />
              <Route path="/products/:productId/edit"      element={<ProductEditor />} />
              <Route path="/pages"                         element={<Pages />} />
              <Route path="/pages/:pageId"                 element={<PageEditor tab="config" />} />
              <Route path="/pages/:pageId/products"        element={<PageEditor tab="products" />} />
              <Route path="/pages/:pageId/discounts"       element={<PageEditor tab="discounts" />} />
              <Route path="/orders"                        element={<Orders />} />
              <Route path="/calculator"                    element={<Calculator />} />
              <Route path="/profile"                       element={<Profile />} />
              <Route path="/chat"                          element={<Chat />} />
              {/* Redirecciones de rutas antiguas */}
              <Route path="/store-config"  element={<Navigate to="/pages" replace />} />
              <Route path="/discounts"     element={<Navigate to="/pages" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
