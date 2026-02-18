// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal: Muestra la Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* Ruta de login: Muestra el formulario de inicio de sesión */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}