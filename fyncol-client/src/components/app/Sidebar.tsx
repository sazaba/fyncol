// src/components/app/Sidebar.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png"; 

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Función para saber si un link está activo
  const isActive = (path: string) => location.pathname === path;

  // Función de Cerrar Sesión
  const handleLogout = () => {
    // 1. Borramos credenciales
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // 2. Redirigimos
    navigate("/login");
  };

  return (
    <aside className={`${isOpen ? "w-64" : "w-20"} relative z-20 flex flex-col border-r border-white/5 bg-[#05050A] transition-all duration-300 hidden md:flex`}>
      
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/5 shrink-0">
        <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
        {isOpen && <span className="ml-3 font-bold text-xl text-white tracking-tight">Fyncol</span>}
      </div>

      {/* Menú Principal */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto custom-scrollbar">
        <p className={`px-4 text-xs font-semibold text-slate-500 mb-2 mt-2 ${!isOpen && "hidden"}`}>OPERACIÓN</p>
        
        <NavItem label="Dashboard" path="/dashboard" icon="📊" isOpen={isOpen} active={isActive("/dashboard")} />
        {/* Rutas y Préstamos ocultos temporalmente para trabajar paso a paso */}
        
        {/* Sección Administración */}
        <div className="pt-4">
          <p className={`px-4 text-xs font-semibold text-slate-500 mb-2 ${!isOpen && "hidden"}`}>EMPRESA</p>
          <button
            onClick={() => isOpen && setIsAdminOpen(!isAdminOpen)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all ${!isOpen && "justify-center"}`}
          >
            <div className="flex items-center gap-3">
              <span>⚙️</span>
              {isOpen && <span className="text-sm font-medium">Administración</span>}
            </div>
            {isOpen && <span className={`text-xs transition-transform ${isAdminOpen ? "rotate-180" : ""}`}>▼</span>}
          </button>

          {/* Submenú Usuarios */}
          <div className={`overflow-hidden transition-all duration-300 ${isAdminOpen && isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-1">
              <Link to="/admin/usuarios" className={`block w-full text-left rounded-lg px-3 py-2 text-sm ${isActive("/admin/usuarios") ? "text-blue-400 bg-blue-500/10" : "text-slate-500 hover:text-white"}`}>
                Usuarios
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer del Sidebar (Botón Salir) */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group ${!isOpen && "justify-center"}`}
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
          {isOpen && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}

// Componente pequeño de botón
function NavItem({ label, path, icon, isOpen, active }: any) {
  return (
    <Link to={path} className={`flex w-full items-center rounded-xl px-3 py-2.5 mb-1 transition-all ${active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'} ${!isOpen && "justify-center"}`}>
      <span className="text-lg">{icon}</span>
      {isOpen && <span className="ml-3 text-sm font-medium">{label}</span>}
    </Link>
  );
}