export default function Features() {
  return (
    <section className="relative bg-[#020408] py-24 md:py-32 overflow-hidden transform-gpu">
      
      {/* Background Glow sutil para separar secciones */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-900/40 to-transparent transform-gpu" />
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-full w-full max-w-7xl bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 md:px-8">
        
        {/* Header de la sección */}
        <div className="reveal-on-scroll mb-16 md:text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Todo lo que necesitas para <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">cobrar con confianza.</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Una suite completa para gestionar tu cartera sin complicaciones técnicas.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* Card 1: Cartera en tiempo real (Azul) */}
          <div className="reveal-on-scroll delay-100 md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B1020]/50 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-[#0B1020]/80 transform-gpu">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-blue-600/20 blur-2xl transition-all group-hover:bg-blue-600/30 transform-gpu" />
            
            <div className="relative z-10">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Saldos en Tiempo Real</h3>
              <p className="text-slate-400 max-w-sm">
                Visualiza instantáneamente cuánto te debe cada cliente. Sin sumas manuales ni calculadoras. El sistema actualiza el saldo con cada abono registrado.
              </p>
            </div>
          </div>

          {/* Card 2: Seguridad (Esmeralda) */}
          <div className="reveal-on-scroll delay-200 md:row-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B1020]/50 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-[#0B1020]/80 transform-gpu">
             <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20 transform-gpu" />
             
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Datos Seguros</h3>
                  <p className="text-slate-400">
                    Tu información financiera está encriptada y protegida. Olvídate de perder cuadernos o archivos corruptos de Excel.
                  </p>
                </div>
                {/* Visual decorativo simulado */}
                <div className="mt-8 rounded-lg border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="h-1.5 w-16 rounded-full bg-white/10" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5" />
                </div>
             </div>
          </div>

          {/* Card 3: Historial (Morado) */}
          <div className="reveal-on-scroll delay-300 group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B1020]/50 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-[#0B1020]/80 transform-gpu">
            <div className="relative z-10">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Historial Detallado</h3>
              <p className="text-slate-400 text-sm">
                Consulta cada movimiento pasado. Filtra por fechas y ten claridad total ante cualquier reclamo.
              </p>
            </div>
          </div>

          {/* Card 4: Rapidez (Naranja) */}
          <div className="reveal-on-scroll delay-300 group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B1020]/50 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-[#0B1020]/80 transform-gpu">
            <div className="relative z-10">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Registro Veloz</h3>
              <p className="text-slate-400 text-sm">
                Diseñado para registrar un abono en menos de 5 segundos. La velocidad que tu negocio necesita.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}