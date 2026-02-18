import { useEffect, useState } from "react";

type NavbarProps = {
  brand?: string;
  onLogin?: () => void;
};

export default function Navbar({ brand = "FYNCOL", onLogin }: NavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* glow backdrop */}
      <div className="absolute inset-0 -z-10 bg-[#070A12]/70 backdrop-blur-xl" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-white/10" />

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        {/* Brand */}
        <a href="/" className="group inline-flex items-center gap-2">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-cyan-500/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative text-sm font-semibold text-white">F</span>
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">{brand}</div>
            <div className="text-xs text-white/60">Registro de pagos</div>
          </div>
        </a>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Soporte
          </a>

          <button
            onClick={onLogin}
            className="relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-90" />
            <span className="absolute inset-0 rounded-xl blur-md bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-40" />
            <span className="relative">Iniciar sesión</span>
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white md:hidden"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden">
          <div className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <a
                href="#"
                className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
              >
                Soporte
              </a>

              <button
                onClick={onLogin}
                className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
