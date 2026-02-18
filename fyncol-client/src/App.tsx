import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "@/components/layouts/MainLayout"; // <--- Importas el layout
import Dashboard from "./pages/dashboard/Dashboard";
import UsersPage from "./pages/admin/UsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas (SaaS) */}
        <Route element={<ProtectedRoute />}>
          {/* El MainLayout envuelve todo: Sidebar + Contenido */}
          <Route element={<MainLayout />}>
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/admin/usuarios" element={<UsersPage />} />
             {/* Futuras rutas: /rutas, /prestamos, etc. */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}