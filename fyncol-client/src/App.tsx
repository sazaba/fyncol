// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "@/components/layouts/MainLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import Rutas from "./pages/admin/Rutas"; 
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
             
             {/* Nueva ruta activa */}
             <Route path="/admin/rutas" element={<Rutas />} />
             
             {/* Futuras rutas: /prestamos, etc. */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}