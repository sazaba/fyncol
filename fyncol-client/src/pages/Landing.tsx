// src/pages/Landing.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();

  // Observer para las animaciones tipo Wasaaa
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // Dejar de observar una vez que ya apareció
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1, // Se activa cuando el 10% del elemento es visible
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elements = document.querySelectorAll(".reveal-on-scroll");
    
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#020408] text-white selection:bg-blue-500/30 scroll-smooth">
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        onPrimaryCta={() => navigate("/login")}
      />

      <main className="flex flex-col overflow-hidden relative">
        {/* Si quieres el fondo global con las luces, puedes ponerlo aquí */}
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
}