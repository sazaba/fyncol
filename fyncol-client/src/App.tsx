import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "@/components/layouts/MainLayout";

// Vistas públicas y de carga rápida (sin Lazy)
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Dashboard from "./pages/dashboard/Dashboard";

// VISTAS PESADAS (Lazy Loading) - Estas solo se descargarán si el usuario entra a esa pantalla
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const Rutas = lazy(() => import("./pages/admin/Rutas")); 
const GestionCapital = lazy(() => import("./pages/admin/GestionCapital"));
const CierresDiarios = lazy(() => import("./pages/admin/CierresDiarios"));
const Monitoreo = lazy(() => import("./pages/admin/Monitoreo"));

const NuevoCredito = lazy(() => import("./pages/cartera/NuevoCredito"));
const CarteraActiva = lazy(() => import("./pages/cartera/CarteraActiva"));
const DatacreditoConsulta = lazy(() => import("./pages/cartera/DatacreditoConsulta")); 

// Componente de carga mientras se descargan las rutas "lazy"
const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0B0B12] text-blue-500">
    <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
    <p className="text-slate-400 text-sm font-semibold tracking-wider animate-pulse">CARGANDO MÓDULO...</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      {/* El Suspense envuelve la aplicación para manejar las rutas perezosas */}
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}