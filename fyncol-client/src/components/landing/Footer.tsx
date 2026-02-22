import logo from "@/assets/logo.png";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-[#020408] border-t border-white/5 pt-12 pb-12 md:pt-16 md:pb-16 overflow-hidden transform-gpu">
      
      {/* Efecto de luz superior azul restaurado */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent transform-gpu" />

      <div className="mx-auto w-full max-w-7xl px-5 md:px-8 relative z-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:items-start">
          
          {/* Columna Izquierda: Marca y Misión */}
          <div className="reveal-on-scroll flex flex-col gap-6 max-w-sm">
            <a href="/" aria-label="Volver al inicio" className="inline-block">
              <div className="relative group inline-block transform-gpu">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src={logo}
                  alt="Fyncol logo"
                  className="relative h-8 w-auto object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                />
              </div>
            </a>

            <p className="text-[15px] leading-relaxed text-slate-400">
              Fyncol te ayuda a registrar pagos, controlar saldos y mantener un
              historial claro de tu cartera. Menos desorden, más claridad para
              cobrar a tiempo.
            </p>

            <div className="flex gap-4">
               {/* Íconos sociales futuros */}
            </div>
          </div>

          {/* Columna Derecha: Enlaces Legales y Copyright */}
          <div className="reveal-on-scroll delay-100 flex flex-col gap-6 lg:items-end lg:text-right">
            
            <nav className="flex flex-wrap gap-x-6 gap-y-2 lg:justify-end">
              <a
                href="/terminos"
                className="text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors py-1 transform-gpu"
              >
                Términos y condiciones
              </a>
              <a
                href="/privacidad"
                className="text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors py-1 transform-gpu"
              >
                Política de privacidad
              </a>
            </nav>

            <div className="flex flex-col gap-1 lg:items-end">
              <p className="text-sm text-slate-500">
                Diseñado para gestión de cartera y seguimiento de pagos.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                © {year} Fyncol Inc. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}