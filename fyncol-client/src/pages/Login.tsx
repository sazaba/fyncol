// src/pages/Login.tsx
import { useState } from "react";
import logo from "@/assets/logo.png"; // Usamos tu logo

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#020408] px-4">
      
      {/* Background Gradients (Ambientación similar a la imagen) */}
      <div className="pointer-events-none absolute inset-0">
        {/* Glow Violeta en la derecha */}
        <div className="absolute top-1/2 right-[-10%] h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        {/* Glow Azul en la izquierda (para mantener identidad Fyncol) */}
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[420px] rounded-[32px] border border-white/10 bg-[#0B1020]/60 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 shadow-inner ring-1 ring-white/10">
            <img src={logo} alt="Fyncol" className="h-6 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Correo Electrónico
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                placeholder="ejemplo@empresa.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contraseña
              </label>
              <a href="#" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button (Gradiente Violeta como en la imagen) */}
          <button className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_-5px_rgba(124,58,237,0.6)] active:scale-[0.98]">
            <span className="relative z-10">Iniciar Sesión</span>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 flex flex-col items-center gap-4 text-sm">
          <p className="text-slate-400">
            ¿Aún no tienes cuenta?{" "}
            <a href="#" className="font-medium text-white hover:underline decoration-blue-500 underline-offset-4">
              Regístrate gratis
            </a>
          </p>
          
          <a 
            href="/"
            className="group flex items-center gap-2 text-slate-500 transition-colors hover:text-white"
          >
            <svg 
              className="h-4 w-4 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </a>
        </div>

      </div>
    </div>
  );
}