// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS --- */}
        {/* Cualquiera puede ver la Landing y el Login */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* --- RUTAS PROTEGIDAS --- */}
        {/* Todo lo que pongas aquí dentro requiere Token. 
            Si no hay token, ProtectedRoute los manda al Login. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Aquí podrás agregar más rutas privadas en el futuro, ejemplo:
          <Route path="/pacientes" element={<Pacientes />} /> 
          */}
        </Route>

        {/* Ruta 404 (Opcional): Redirige a Landing si escriben algo raro */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}