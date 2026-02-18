// src/pages/Landing.tsx
import { useNavigate } from "react-router-dom"; // 1. Importamos el hook de navegación
import Navbar from "../components/layout/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/layout/Footer";

export default function Landing() {
  const navigate = useNavigate(); // 2. Inicializamos la función

  return (
    <div className="min-h-screen bg-[#020408] text-white selection:bg-blue-500/30">
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        // 3. Al hacer click, navegamos a la ruta "/login" que definimos en App.tsx
        onPrimaryCta={() => navigate("/login")}
      />
      
      {/* Es buena práctica envolver el contenido principal en <main> para accesibilidad */}
      <main>
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
}