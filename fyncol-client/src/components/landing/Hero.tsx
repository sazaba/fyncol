export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 left-[-180px] h-[720px] w-[720px] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-[-260px] right-[-220px] h-[780px] w-[780px] rounded-full bg-indigo-600/15 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 md:px-6 md:pt-20">
        {/* small pill */}
        <div className="mx-auto mb-8 w-fit rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-cyan-200">
          CONTROL DE PAGOS Y CARTERA • SIMPLE Y CLARO
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-4xl font-extrabold leading-tight text-white md:text-6xl">
            El sistema que{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              registra pagos
            </span>{" "}
            y te muestra la cartera en segundos
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/70 md:text-lg">
            Olvídate del Excel desordenado. Fyncol centraliza clientes, abonos,
            saldos e historial para que cobres con confianza y sin perder
            tiempo.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button className="relative inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white">
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-95" />
              <span className="absolute inset-0 rounded-full blur-md bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-40" />
              <span className="relative inline-flex items-center gap-2">
                <span className="inline-block h-5 w-5 rounded-md bg-white/15" />
                Crear cuenta / Iniciar sesión
              </span>
            </button>

            <a
              href="#como-funciona"
              className="text-sm font-semibold text-white/70 hover:text-white"
            >
              Ver cómo funciona (sin compromiso)
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
