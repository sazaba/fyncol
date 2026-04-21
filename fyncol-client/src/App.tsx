import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "@/components/layouts/MainLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import Rutas from "./pages/admin/Rutas"; 
import GestionCapital from "./pages/admin/GestionCapital";
import CierresDiarios from "./pages/admin/CierresDiarios";
import Monitoreo from "./pages/admin/Monitoreo"; // <-- Nuestro nuevo dashboard

// COMPONENTES DE CARTERA
import NuevoCredito from "./pages/cartera/NuevoCredito";
import CarteraActiva from "./pages/cartera/CarteraActiva";
import DatacreditoConsulta from "./pages/cartera/DatacreditoConsulta"; 
import Register from "./pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* NIVEL 1: Protección General (Cualquier usuario logueado con suscripción activa) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            
            {/* Rutas compartidas por todos (Cobradores, Admin, Superadmin) */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/cartera/nuevo-credito" element={<NuevoCredito />} />
            <Route path="/cartera/activa" element={<CarteraActiva />} /> 
            <Route path="/buro" element={<DatacreditoConsulta />} /> 

            {/* NIVEL 2: Protección Específica para Administradores */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} />}>
              <Route path="/admin/usuarios" element={<UsersPage />} />
              <Route path="/admin/rutas" element={<Rutas />} />
              <Route path="/admin/capital" element={<GestionCapital />} />
              <Route path="/admin/cierres" element={<CierresDiarios />} />
              <Route path="/admin/monitoreo" element={<Monitoreo />} />
            </Route>

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}