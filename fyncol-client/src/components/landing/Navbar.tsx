import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

type NavbarProps = {
  brand?: string;
  userLabel?: string;
  primaryCtaLabel?: string;
  onPrimaryCta?: () => void;
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

    const el = scrollContainerRef?.current ?? null;
    lastYRef.current = el ? el.scrollTop : window.scrollY;

    const getY = () => (el ? el.scrollTop : window.scrollY);

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const y = getY() || 0;

        setScrolled(y > 20);

        const delta = y - lastYRef.current;

        if (Math.abs(delta) > 6) {
          if (y > 100 && delta > 0) setHidden(true);
          if (delta < 0) setHidden(false);

          lastYRef.current = y;
        }

        if (y < 20) setHidden(false);

        tickingRef.current = false;
      });
    };

    window.addEventListener("resize", onResize);

    if (el) el.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      if (el) el.removeEventListener("scroll", onScroll as any);
      else window.removeEventListener("scroll", onScroll as any);
    };
  }, [scrollContainerRef?.current]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setOpen(false);
    navigate("/");
  };

  const buttonBaseStyles =
    "relative inline-flex items-center justify-center font-semibold text-[#020408] transition-all active:scale-95 duration-200";

  // Botón actualizado a verde neón
  const primaryButtonStyles = `
    ${buttonBaseStyles} rounded-full bg-green-500 px-6 py-2.5 text-[15px]
    shadow-[0_0_20px_-5px_rgba(74,222,128,0.5)] border border-white/10
    hover:bg-green-400 hover:shadow-[0_0_25px_-5px_rgba(74,222,128,0.6)] hover:scale-105
  `;

  return (
    <header
      className={[
        "fixed w-full top-0 z-[100] transition-all duration-300 ease-in-out border-b",
        scrolled
          ? "bg-[#05050A]/80 backdrop-blur-xl border-white/10 shadow-lg shadow-black/20"
          : "bg-transparent border-transparent py-4",
        hidden ? "-translate-y-full" : "translate-y-0"
      ].filter(Boolean).join(" ")}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 md:px-6 h-16 md:h-20">
        <a
          href="/"
          aria-label={brand}
          className="relative group z-50 flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src={logo}
              alt={brand}
              className="relative h-9 w-auto md:h-11 object-contain brightness-110 drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </a>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-6 lg:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-4 animate-in fade-in duration-500">
              <button onClick={() => navigate("/dashboard")} className={primaryButtonStyles}>
                Ir al Dashboard
              </button>

              <button
                onClick={handleLogout}
                className="rounded-full p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
            </div>
          ) : (
            <button onClick={onPrimaryCta} className={primaryButtonStyles}>
              <span>{primaryCtaLabel}</span>
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="relative z-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 active:scale-95 transition-all lg:hidden"
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
        className={[
          "fixed inset-x-0 top-0 z-40 bg-[#05050A]/95 backdrop-blur-2xl border-b border-white/10 pt-24 pb-8 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden",
          open ? "translate-y-0" : "-translate-y-full"
        ].filter(Boolean).join(" ")}
      >
        <div className="flex flex-col gap-4 px-6 relative z-10">
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
                className="w-full rounded-xl border border-red-900/30 bg-red-950/10 py-3 text-sm text-red-400 hover:bg-red-900/20 active:scale-95 transition-all"
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
              className={`${primaryButtonStyles} w-full py-3.5 text-base text-center flex justify-center items-center`}
            >
              {primaryCtaLabel}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}