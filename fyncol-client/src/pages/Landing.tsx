// src/pages/Landing.tsx
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020408] text-white selection:bg-blue-500/30">
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        onPrimaryCta={() => navigate("/login")}
      />

      <main>
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
}
