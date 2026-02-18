// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  
  // Estados para manejar los inputs y el feedback de carga/error
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // URL de tu Backend (Usa la variable de entorno de Vercel o localhost por defecto)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 1. Guardar token y usuario en localStorage para persistencia
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // 2. Redirigir al Dashboard
        navigate("/dashboard");
      } else {
        // Mostrar error que viene del backend (ej: "Credenciales inválidas")
        setError(data.message || "Error al iniciar sesión");
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // CAMBIO CLAVE: Usamos h-[100dvh] en lugar de min-h-screen
    // Esto fuerza al contenedor a tener EXACTAMENTE el tamaño visible de la pantalla móvil
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#020408] px-4 selection:bg-blue-500/30">
      
      {/* Background Gradients (Optimizados para GPU) */}
      <div className="pointer-events-none absolute inset-0 transform-gpu overflow-hidden">
        <div className="absolute top-1/2 right-[-10%] h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px] will-change-transform" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[120px] will-change-transform" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[420px] rounded-[32px] border border-white/10 bg-[#0B1020]/60 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <img 
            src={logo} 
            alt="Fyncol" 
            className="mb-6 h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] brightness-110" 
          />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Form - Conectado a la función handleLogin */}
        <form className="flex flex-col gap-5" onSubmit={handleLogin}>
          
          {/* Mensaje de Error (Solo aparece si hay error) */}
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-center text-xs font-medium text-red-400 border border-red-500/20 animate-pulse">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Correo Electrónico
            </label>
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-blue-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
  type="email"
  required
  placeholder="ejemplo@empresa.com"
  className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-base text-white placeholder-slate-500 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-blue-500/10 md:text-sm"
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
              <a href="#" className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-blue-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-base text-white placeholder-slate-500 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-blue-500/10 md:text-sm [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0B1020_inset] [&:-webkit-autofill]:-webkit-text-fill-color:white [&:-webkit-autofill]:caret-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="group relative mt-2 w-full overflow-hidden rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] transition-all hover:scale-[1.02] hover:bg-blue-500 hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? "Verificando..." : "Iniciar Sesión"}
              {!loading && (
                <svg className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              )}
            </span>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 flex flex-col items-center gap-4 text-sm">
          <p className="text-slate-400">
            ¿Aún no tienes cuenta?{" "}
            <a href="#" className="font-medium text-white underline-offset-4 hover:underline decoration-blue-500">
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