// src/components/landing/Navbar.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

type NavbarProps = {
  brand?: string;
};

export default function Navbar({ brand = "Fyncol" }: NavbarProps) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(!!localStorage.getItem("token"));
    syncAuth();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") syncAuth();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let ticking = false;

    const controlNavbar = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          if (currentScrollY <= 0) {
            setIsVisible(true);
            setIsScrolled(false);
          } else {
            setIsScrolled(currentScrollY > 20);

            if (currentScrollY > lastScrollY && currentScrollY > 80) {
              setIsVisible(false);
            } else {
              setIsVisible(true);
            }
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", controlNavbar, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", controlNavbar);
    };
  }, [lastScrollY]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setOpen(false);
    navigate("/");
  };

  const primaryButtonStyles = `
    relative inline-flex items-center justify-center font-semibold text-white transition-all active:scale-95 duration-200 transform-gpu
    rounded-full bg-blue-600 px-6 py-2.5 text-[15px]
    shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] border border-white/10
    hover:bg-blue-500 hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)] hover:scale-105
    before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r
    before:from-cyan-400 before:via-blue-500 before:to-indigo-500
    before:opacity-0 before:transition-opacity hover:before:opacity-100 before:-z-10
  `;

  return (
    <>
      <header
        className={[
          "fixed w-full top-0 z-[100] transition-transform duration-300 ease-in-out border-b transform-gpu",
          isScrolled
            ? "bg-[#05050A]/85 backdrop-blur-xl border-white/10 shadow-lg shadow-black/20"
            : "bg-transparent border-transparent py-4",
          isVisible ? "translate-y-0" : "-translate-y-full"
        ].filter(Boolean).join(" ")}
      >
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 md:px-6 h-16 md:h-20">
          
          <a
            href="/"
            aria-label={brand}
            className="relative group z-50 flex items-center gap-3 transform-gpu"
            onClick={() => setOpen(false)}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src={logo}
                alt={brand}
                className="relative h-9 w-auto md:h-11 object-contain brightness-110 drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </a>

          {/* Menú Desktop */}
          <div className="hidden items-center gap-6 lg:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-4 animate-in fade-in duration-500">
                <button onClick={() => navigate("/dashboard")} className={primaryButtonStyles}>
                  Ir al Dashboard
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-full p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors transform-gpu"
                  title="Cerrar Sesión"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              // NUEVO: Dos botones separados para usuarios no logueados en Desktop
              <div className="flex items-center gap-5 animate-in fade-in duration-500">
                <button 
                  onClick={() => navigate("/login")} 
                  className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Iniciar sesión
                </button>
                <button onClick={() => navigate("/register")} className={primaryButtonStyles}>
                  Empezar gratis
                </button>
              </div>
            )}
          </div>

          <button
            className="relative z-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 active:scale-95 transition-all transform-gpu lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </nav>
      </header>
      
      <div 
        className={[
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] lg:hidden transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        ].filter(Boolean).join(" ")}
        onClick={() => setOpen(false)}
      />

      <div
        className={[
          "fixed top-0 right-0 h-[100dvh] w-[85vw] max-w-[320px] bg-[#05050A]/95 backdrop-blur-2xl border-l border-white/10 z-[110] lg:hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col transform-gpu",
          open ? "translate-x-0" : "translate-x-full"
        ].filter(Boolean).join(" ")}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_60%)] pointer-events-none" />

        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <span className="font-bold text-xl tracking-tight text-white flex items-center gap-3">
            <img src={logo} alt="logo" className="w-8 h-8 object-contain" />
            {brand}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-end p-6 overflow-y-auto relative z-10">
          
          <div className="flex flex-col gap-4 mt-8">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => { setOpen(false); navigate("/dashboard"); }}
                  className={`${primaryButtonStyles} w-full py-3.5 text-base`}
                >
                  Ir al Dashboard
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-red-900/30 bg-red-950/10 py-3.5 text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              // NUEVO: Dos botones para la versión móvil
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setOpen(false); navigate("/login"); }}
                  className="w-full rounded-xl border border-white/10 bg-transparent py-3.5 text-base font-semibold text-white hover:bg-white/5 transition-all"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => { setOpen(false); navigate("/register"); }}
                  className={`${primaryButtonStyles} w-full py-3.5 text-base`}
                >
                  Empezar prueba gratis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}