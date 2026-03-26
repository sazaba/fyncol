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

// COMPONENTES DE CARTERA
import NuevoCredito from "./pages/cartera/NuevoCredito";
import CarteraActiva from "./pages/cartera/CarteraActiva";
import DatacreditoConsulta from "./pages/cartera/DatacreditoConsulta"; // <-- Importamos el Buró

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* ADMINISTRACIÓN */}
            <Route path="/admin/usuarios" element={<UsersPage />} />
            <Route path="/admin/rutas" element={<Rutas />} />
            <Route path="/admin/capital" element={<GestionCapital />} />
            <Route path="/admin/cierres" element={<CierresDiarios />} />
            
            {/* CARTERA */}
            <Route path="/cartera/nuevo-credito" element={<NuevoCredito />} />
            <Route path="/cartera/activa" element={<CarteraActiva />} /> 
            
            {/* BURÓ DE CRÉDITO (Accesible para todos) */}
            <Route path="/buro" element={<DatacreditoConsulta />} /> 
            
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}