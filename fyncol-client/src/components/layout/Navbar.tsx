import { useEffect, useMemo, useState } from "react";
import logo from "@/assets/logo.png";

type NavbarProps = {
  brand?: string;
  userLabel?: string; // ej: "Hola, Eclizca"
  primaryCtaLabel?: string; // ej: "Iniciar sesión"
  onPrimaryCta?: () => void;
};

export default function Navbar({
  brand = "Fyncol",
  userLabel,
  primaryCtaLabel = "Iniciar sesión",
  onPrimaryCta,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };

    const onScroll = () => setScrolled(window.scrollY > 10);

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Ultra-premium backdrop */}
      <div className="absolute inset-0 -z-10">
        {/* glass layer */}
        <div
          className={[
            "absolute inset-0 backdrop-blur-2xl transition",
            scrolled ? "bg-[#070A12]/82" : "bg-[#070A12]/58",
          ].join(" ")}
        />

        {/* subtle gradient wash */}
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -top-24 left-1/2 h-56 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-indigo-600/20 blur-3xl" />
          <div className="absolute -top-20 right-[-10rem] h-56 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -top-24 left-[-10rem] h-56 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        {/* hairlines */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      </div>

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        {/* Brand */}
        <a
          href="/"
          className="group inline-flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-white/[0.03]"
        >
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
            {/* inner glow */}
            <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <span className="absolute -left-6 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-cyan-500/25 blur-2xl" />
              <span className="absolute -right-6 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-indigo-500/25 blur-2xl" />
            </span>

            {/* shiny sweep */}
            <span className="absolute -left-24 top-0 h-full w-24 rotate-12 bg-white/10 blur-xl transition-all duration-700 group-hover:left-28" />

            <img
              src={logo}
              alt={`${brand} logo`}
              className="relative h-7 w-7 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
            />
          </span>

          <div className="leading-tight">
            <span className="block text-[17px] font-semibold tracking-wide text-white">
              {brand}
            </span>
            <span className="block text-xs text-white/55">
              Seguimiento de cartera · {year}
            </span>
          </div>
        </a>

        {/* Right (desktop) */}
        <div className="hidden items-center gap-3 lg:flex">
          {userLabel ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
              <span className="text-sm text-white/75">{userLabel}</span>
            </div>
          ) : (
            <div className="hidden md:block text-sm text-white/55">
              Bienvenido a tu panel
            </div>
          )}

          {/* Premium CTA */}
          <button
            onClick={onPrimaryCta}
            className="group relative inline-flex items-center justify-center rounded-full px-[18px] py-[10px] text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {/* outer gradient */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-95" />
            {/* glow */}
            <span className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-35 transition group-hover:opacity-45" />
            {/* inner glass */}
            <span className="absolute inset-[1px] rounded-full bg-[#0B1020]/40" />
            {/* border ring */}
            <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />

            <span className="relative inline-flex items-center gap-2">
              <span>{primaryCtaLabel}</span>
              <svg
                className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M13 7l5 5-5 5M6 12h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={onPrimaryCta}
            className="relative inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white"
          >
            <span className="absolute inset-0 rounded-xl bg-white/[0.06]" />
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
            <span className="relative">{primaryCtaLabel}</span>
          </button>

          <button
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown (solo user + CTA) */}
      {open && (
        <div className="lg:hidden">
          <div className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-2xl">
              {userLabel ? (
                <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                  {userLabel}
                </div>
              ) : (
                <div className="mb-2 text-sm text-white/60">
                  Accede para empezar
                </div>
              )}

              <button
                onClick={() => {
                  setOpen(false);
                  onPrimaryCta?.();
                }}
                className="group relative w-full rounded-xl px-3 py-2 text-sm font-semibold text-white"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-95" />
                <span className="absolute inset-0 rounded-xl blur-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-30 transition group-hover:opacity-40" />
                <span className="absolute inset-[1px] rounded-xl bg-[#0B1020]/35" />
                <span className="absolute inset-0 rounded-xl ring-1 ring-white/15" />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {primaryCtaLabel}
                  <svg
                    className="h-4 w-4 opacity-80"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M13 7l5 5-5 5M6 12h12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
