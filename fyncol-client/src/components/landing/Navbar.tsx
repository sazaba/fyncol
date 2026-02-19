import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

type NavbarProps = {
  brand?: string;
  userLabel?: string;
  primaryCtaLabel?: string;
  onPrimaryCta?: () => void;

  /**
   * Si el scroll NO ocurre en window (ej: dashboard con overflow-y-auto),
   * pásale el ref del contenedor scrolleable.
   * Si no lo pasas, usa window (landing).
   */
  scrollContainerRef?: React.RefObject<HTMLElement>;
};

export default function Navbar({
  brand = "Fyncol",
  primaryCtaLabel = "Iniciar sesión",
  onPrimaryCta,
  scrollContainerRef,
}: NavbarProps) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  // Mantener auth actualizada (incluye cambios entre tabs)
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
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };

    // Detectar el scroller real
    const el = scrollContainerRef?.current ?? null;

    // Inicializar lastY según dónde se hace scroll
    lastYRef.current = el ? el.scrollTop : window.scrollY;

    const getY = () => (el ? el.scrollTop : window.scrollY);

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const y = getY() || 0;

        // Efecto "glass" cuando baja un poquito
        setScrolled(y > 10);

        const delta = y - lastYRef.current;

        // Evita jitter con umbral pequeño
        if (Math.abs(delta) > 6) {
          // Baja => ocultar. Sube => mostrar.
          if (y > 60 && delta > 0) setHidden(true);
          if (delta < 0) setHidden(false);

          lastYRef.current = y;
        }

        // Siempre visible cerca del top
        if (y < 20) setHidden(false);

        tickingRef.current = false;
      });
    };

    window.addEventListener("resize", onResize);

    // Listener al scroller correcto
    if (el) el.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      if (el) el.removeEventListener("scroll", onScroll as any);
      else window.removeEventListener("scroll", onScroll as any);
    };
    // IMPORTANTE: escuchar cuando el ref "aparece"
  }, [scrollContainerRef?.current]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setOpen(false);
    navigate("/");
  };

  const buttonBaseStyles =
    "relative inline-flex items-center justify-center font-semibold text-white transition-all active:scale-95 duration-200";

  const primaryButtonStyles = `
    ${buttonBaseStyles} rounded-full bg-blue-600 px-6 py-2.5 text-[15px]
    shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]
    hover:bg-blue-500 hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)]
    before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r
    before:from-cyan-400 before:via-blue-500 before:to-indigo-500
    before:opacity-0 before:transition-opacity hover:before:opacity-100 before:-z-10
  `;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-in-out transform-gpu",
        hidden ? "-translate-y-full" : "translate-y-0",
        scrolled
          ? "bg-[#05050A]/80 backdrop-blur-xl border-b border-white/5 py-3"
          : "bg-transparent py-4",
      ].join(" ")}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 md:px-8">
        <a
          href="/"
          aria-label={brand}
          className="relative z-10 flex items-center"
          onClick={() => setOpen(false)}
        >
          <img
            src={logo}
            alt={brand}
            className="h-8 w-auto md:h-9 object-contain brightness-110 drop-shadow-lg"
          />
        </a>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-6 lg:flex">
          {isAuthenticated ? (
            <>
              <button onClick={() => navigate("/dashboard")} className={primaryButtonStyles}>
                Ir al Dashboard
              </button>

              <button
                onClick={handleLogout}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                title="Cerrar Sesión"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </>
          ) : (
            <button onClick={onPrimaryCta} className={primaryButtonStyles}>
              <span>{primaryCtaLabel}</span>
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white active:bg-white/10 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div
        className={`fixed inset-x-0 top-0 z-0 bg-[#05050A] pt-24 pb-8 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex flex-col gap-4 px-6">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/dashboard");
                }}
                className={`${primaryButtonStyles} w-full py-3.5 text-base`}
              >
                Ir al Dashboard
              </button>

              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-slate-300 active:bg-white/10"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                onPrimaryCta?.();
              }}
              className={`${primaryButtonStyles} w-full py-3.5 text-base`}
            >
              {primaryCtaLabel}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
