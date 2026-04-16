// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login        from "./pages/Login";
import Register     from "./pages/Register";
import VerifyEmail  from "./pages/VerifyEmail";
import Dashboard    from "./pages/Dashboard";
import Products     from "./pages/Products";
import ProductEditor from "./pages/ProductEditor";
import StoreConfig  from "./pages/StoreConfig";
import Orders       from "./pages/Orders";
import Calculator   from "./pages/Calculator";
import PublicStore  from "./pages/PublicStore";
import Profile      from "./pages/Profile";
import Chat         from "./pages/Chat";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/store/:slug"  element={<PublicStore />} />

          {/* Panel del vendedor (requiere auth) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/"            element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/products"    element={<Products />} />
              <Route path="/products/:productId/edit" element={<ProductEditor />} />
              <Route path="/store-config" element={<StoreConfig />} />
              <Route path="/orders"      element={<Orders />} />
              <Route path="/calculator"  element={<Calculator />} />
              <Route path="/profile"     element={<Profile />} />
              <Route path="/chat"        element={<Chat />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
