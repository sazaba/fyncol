import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    companyName: "",
    userName: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard"); // Auto-login al dashboard
      } else {
        setError(data.message || "Error al crear la cuenta");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#020408] px-4 py-10 selection:bg-blue-500/30">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 right-[-10%] h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[480px] rounded-[32px] border border-white/10 bg-[#0B1020]/60 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="Fyncol" className="mb-6 h-10 w-auto object-contain brightness-110" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Comienza tu prueba gratis</h1>
          <p className="mt-2 text-sm text-slate-400">14 días de acceso total, sin tarjeta de crédito.</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleRegister}>
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-center text-xs font-medium text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre Empresa</label>
              <input type="text" required placeholder="Mi Negocio" 
                className="w-full rounded-xl border border-white/10 bg-[#05050A] py-3.5 px-4 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:bg-[#0B1020] focus:outline-none"
                value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Tu Nombre</label>
              <input type="text" required placeholder="Juan Pérez" 
                className="w-full rounded-xl border border-white/10 bg-[#05050A] py-3.5 px-4 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:bg-[#0B1020] focus:outline-none"
                value={formData.userName} onChange={(e) => setFormData({...formData, userName: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Correo Electrónico</label>
            <input type="email" required placeholder="ejemplo@empresa.com" 
              className="w-full rounded-xl border border-white/10 bg-[#05050A] py-3.5 px-4 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:bg-[#0B1020] focus:outline-none"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Contraseña</label>
            <input type="password" required placeholder="••••••••" minLength={6}
              className="w-full rounded-xl border border-white/10 bg-[#05050A] py-3.5 px-4 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:bg-[#0B1020] focus:outline-none"
              value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>

          <button type="submit" disabled={loading}
            className="group relative mt-2 w-full overflow-hidden rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] transition-all hover:scale-[1.02] hover:bg-blue-500 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait">
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </span>
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4 text-sm">
          <p className="text-slate-400">
            ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-white hover:underline decoration-blue-500">Inicia sesión</Link>
          </p>
          <Link to="/" className="text-slate-500 hover:text-white">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}