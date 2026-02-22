// src/components/landing/Hero.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden bg-[#020408] pt-24 pb-12 md:pt-32">
      
      {/* Background Effects - Cambiados a Verde Neón */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[80vw] bg-green-500/20 blur-[100px] rounded-full mix-blend-screen opacity-50 md:opacity-30" />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[300px] w-[60vw] bg-lime-400/10 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 md:px-8 z-10">
        <div className="mx-auto max-w-4xl text-center">
          
          {/* Badge: Aparece primero */}
          <div className="reveal-on-scroll mx-auto mb-8 inline-flex items-center rounded-full border border-green-500/30 bg-green-950/30 px-4 py-1.5 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse mr-2"></span>
            <span className="text-[11px] font-bold tracking-wider text-green-300 uppercase">
              Gestión de cobranza simplificada
            </span>
          </div>

          {/* Título: Aparece con un poco de retraso */}
          <h1 className="reveal-on-scroll delay-100 text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Recupera el control de <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-lime-300">
              tu cartera y pagos.
            </span>
          </h1>

          {/* Párrafo: Aparece después del título */}
          <p className="reveal-on-scroll delay-200 mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed md:text-xl">
            Centraliza cada abono y saldo pendiente en una sola plataforma.
            Deja atrás el caos manual y asegura el flujo de caja de tu negocio
            con información precisa y al instante.
          </p>

          {/* Botón: Aparece de último */}
          <div className="reveal-on-scroll delay-300 mt-10 flex justify-center">
            <button 
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
              className="group relative inline-flex h-14 items-center justify-center rounded-full bg-green-500 px-8 text-base font-bold text-[#020408] transition-all hover:bg-green-400 hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_-10px_rgba(74,222,128,0.5)]"
            >
              <div className="absolute inset-0 rounded-full ring-1 ring-white/20 group-hover:ring-white/40" />
              
              <span className="mr-2">
                {isAuthenticated ? "Ir a mi Dashboard" : "Iniciar sesión"}
              </span>
              
              <svg 
                className="h-5 w-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020408] to-transparent pointer-events-none" />
    </section>
  );
}