// src/components/layout/Footer.tsx
import logo from "@/assets/fyncol-logo-navbar-optimized.png";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative">
      {/* Top hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* Soft glass background to match navbar/hero */}
      <div className="bg-[#070A12]/70 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            {/* Left: logo + description */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="Fyncol logo"
                  className="h-9 w-auto object-contain opacity-95"
                />
              </div>

              <p className="max-w-xl text-sm leading-relaxed text-white/65">
                Fyncol te ayuda a registrar pagos, controlar saldos y mantener un
                historial claro de tu cartera. Menos desorden, más claridad para
                cobrar a tiempo.
              </p>

              <p className="text-xs text-white/45">
                © {year}. Todos los derechos reservados.
              </p>
            </div>

            {/* Right: legal links */}
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="flex items-center gap-4 text-sm">
                <a
                  href="/terminos"
                  className="text-white/60 hover:text-white transition"
                >
                  Términos y condiciones
                </a>
                <span className="text-white/20">•</span>
                <a
                  href="/privacidad"
                  className="text-white/60 hover:text-white transition"
                >
                  Política de privacidad
                </a>
              </div>

              <p className="text-xs text-white/40 md:text-right">
                Diseñado para gestión de cartera y seguimiento de pagos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
