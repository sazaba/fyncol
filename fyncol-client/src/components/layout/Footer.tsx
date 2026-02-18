export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">FYNCOL</div>
            <div className="text-xs text-white/60">
              Control simple y claro de pagos de clientes.
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <a href="#" className="text-white/70 hover:text-white">
              Términos
            </a>
            <a href="#" className="text-white/70 hover:text-white">
              Privacidad
            </a>
            <a href="#" className="text-white/70 hover:text-white">
              Contacto
            </a>
          </div>
        </div>

        <div className="mt-6 h-px w-full bg-white/10" />

        <div className="mt-4 text-xs text-white/50">
          © {year} FYNCOL. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
