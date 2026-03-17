// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "@/components/layouts/MainLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import Rutas from "./pages/admin/Rutas"; 
import GestionCapital from "./pages/admin/GestionCapital";

// 1. IMPORTAMOS EL NUEVO COMPONENTE
import NuevoCredito from "./pages/cartera/NuevoCredito";

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
            <Route path="/admin/rutas" element={<Rutas />} />
            <Route path="/admin/capital" element={<GestionCapital />} />
            
            {/* 2. REGISTRAMOS LA NUEVA RUTA DE CARTERA */}
            <Route path="/cartera/nuevo-credito" element={<NuevoCredito />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}