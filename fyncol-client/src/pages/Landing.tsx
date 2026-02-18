// src/pages/Landing.tsx
import { useNavigate } from "react-router-dom"; 
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();

  return (
    // Agregamos bg-[#020408] aquí también para evitar parpadeos blancos al cargar
    <div className="min-h-screen bg-[#020408] text-white selection:bg-blue-500/30">
      
      {/* NAVBAR: Le pasamos la función para navegar */}
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        onPrimaryCta={() => navigate("/login")} 
      />
      
      <main>
        {/* HERO: Ya tiene el navigate por dentro (ver punto 1) */}
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
}