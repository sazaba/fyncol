// src/pages/Landing.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Bloquea scroll SOLO en landing
    document.documentElement.classList.add("landing-lock");
    document.body.classList.add("landing-lock");

    return () => {
      // Restaura scroll al salir (login/dashboard/admin)
      document.documentElement.classList.remove("landing-lock");
      document.body.classList.remove("landing-lock");
    };
  }, []);

  return (
    <div className="h-[100dvh] bg-[#020408] text-white selection:bg-blue-500/30 overflow-hidden">
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        onPrimaryCta={() => navigate("/login")}
      />

      <main className="h-full overflow-hidden">
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
}
