// src/pages/Landing.tsx
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
  className="
    min-h-[100dvh] bg-[#020408] text-white selection:bg-blue-500/30
    overflow-x-hidden
    [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
  "
>

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
