import Navbar from "../components/layout/Navbar";
import Hero from "../components/landing/Hero";
import Footer from "../components/layout/Footer";
import Features from "@/components/landing/Features";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <Navbar
        brand="Fyncol"
        primaryCtaLabel="Iniciar sesión"
        onPrimaryCta={() => alert("Login (pendiente)")}
      />
      <Hero />
      <Features/>
      <Footer />
    </div>
  );
}
