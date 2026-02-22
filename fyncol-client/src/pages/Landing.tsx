// src/pages/Landing.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();
  
  // 1. Lo regresamos a HTMLDivElement para que el <div> nativo no marque error
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Observer para las animaciones (reveal-on-scroll)
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elements = document.querySelectorAll(".reveal-on-scroll");
    
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    // 2. Este div ahora acepta el ref sin problemas
    <div 
      ref={mainScrollRef}
      className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#020408] text-white selection:bg-blue-500/30 scroll-smooth scrollbar"
    >
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        onPrimaryCta={() => navigate("/login")}
        // 3. Le decimos a TypeScript "confía en mí, es un elemento HTML válido" usando as any
        scrollContainerRef={mainScrollRef as any}
      />

      <main className="flex flex-col relative">
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
}