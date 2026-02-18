// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // 1. Buscamos el token en la caja fuerte (localStorage)
  const token = localStorage.getItem("token");

  // 2. Si NO hay token, redirigimos al Login inmediatamente
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si SÍ hay token, dejamos pasar al usuario (mostramos el contenido hijo)
  return <Outlet />;
}