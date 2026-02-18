// src/components/landing/Hero.tsx
import { useNavigate } from "react-router-dom"; // 1. Importar el hook

export default function Hero() {
  const navigate = useNavigate(); // 2. Inicializar el hook

  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden bg-[#020408] pt-24 pb-12 md:pt-32">
      
      {/* ... (Todo el código de fondo que ya tienes igual) ... */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[80vw] bg-blue-600/20 blur-[100px] rounded-full mix-blend-screen opacity-50 md:opacity-30" />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[300px] w-[60vw] bg-cyan-500/10 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 md:px-8 z-10">
        <div className="mx-auto max-w-4xl text-center">
          
          {/* ... (Tu Badge y Heading siguen igual) ... */}
          <div className="mx-auto mb-8 inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-950/10 px-4 py-1.5 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse mr-2"></span>
            <span className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
              Gestión de cobranza simplificada
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Recupera el control de <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              tu cartera y pagos.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed md:text-xl">
            Centraliza cada abono y saldo pendiente en una sola plataforma.
            Deja atrás el caos manual y asegura el flujo de caja de tu negocio
            con información precisa y al instante.
          </p>

          {/* CTA Principal */}
          <div className="mt-10 flex justify-center">
            <button 
              // 3. AGREGAR ESTO: La acción de navegar
              onClick={() => navigate("/login")}
              className="group relative inline-flex h-14 items-center justify-center rounded-full bg-blue-600 px-8 text-base font-semibold text-white transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)]"
            >
              <div className="absolute inset-0 rounded-full ring-1 ring-white/20 group-hover:ring-white/30" />
              <span className="mr-2">Iniciar sesión</span>
              <svg 
                className="h-5 w-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020408] to-transparent pointer-events-none" />
    </section>
  );
}