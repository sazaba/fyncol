import { useEffect, useState } from "react";

type NavbarProps = {
  brand?: string;
  userLabel?: string; // ej: "Hola, Eclizca"
  primaryCtaLabel?: string; // ej: "Dashboard" o "Iniciar sesión"
  onPrimaryCta?: () => void;
};

const links = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Precios", href: "#precios" },
  { label: "FAQs", href: "#faqs" },
];

export default function Navbar({
  brand = "Fyncol",
  userLabel,
  primaryCtaLabel = "Iniciar sesión",
  onPrimaryCta,
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 -z-10 bg-[#070A12]/70 backdrop-blur-xl" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-white/10" />

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        {/* Brand */}
        <a href="/" className="inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
            <span className="text-sm font-bold text-emerald-200">F</span>
          </span>
          <span className="text-lg font-semibold tracking-wide text-white">
            {brand}
          </span>
        </a>

        {/* Center pill nav */}
        <div className="hidden lg:flex">
          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 backdrop-blur">
            <div className="flex items-center gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-4 py-2 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="hidden items-center gap-3 lg:flex">
          {userLabel ? (
            <span className="text-sm text-white/70">{userLabel}</span>
          ) : null}

          <button
            onClick={onPrimaryCta}
            className="relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-90" />
            <span className="absolute inset-0 rounded-full blur-md bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-35" />
            <span className="relative">{primaryCtaLabel}</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white lg:hidden"
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

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden">
          <div className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <div className="flex flex-col">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  onPrimaryCta?.();
                }}
                className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                {primaryCtaLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
