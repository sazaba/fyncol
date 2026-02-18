export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative">
      {/* top hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* glass layer */}
      <div className="bg-[#070A12]/70 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-white/90">Fyncol</p>
              <p className="mt-1 text-sm text-white/60">
                Control de pagos y cartera, sin fricción.
              </p>
            </div>

            <p className="text-xs text-white/45">
              © {year} Fyncol. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
