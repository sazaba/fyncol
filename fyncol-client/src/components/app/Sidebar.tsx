// src/components/app/Sidebar.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png"; 
import { FiHome, FiSettings, FiUsers, FiLogOut, FiChevronDown, FiX, FiGlobe } from "react-icons/fi";

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Cambiado: Ahora redirige al inicio (Landing Page) al cerrar sesión
    navigate("/");
  };

  return (
    <>
      {/* Overlay oscuro para móvil cuando el menú está abierto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Principal */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-white/5 bg-[#05050A] transition-transform duration-300 ease-in-out font-inter ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        
        {/* Cabecera Sidebar (Logo Clickeable) */}
        <div className="flex h-16 items-center justify-between md:justify-center px-4 md:px-0 border-b border-white/5 shrink-0">
          <Link to="/" onClick={() => setIsOpen(false)} className="transition-transform hover:scale-105 active:scale-95">
            <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
          </Link>
          
          {/* Botón de cerrar solo visible en móvil */}
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white p-2 transition-colors">
            <FiX size={24} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold tracking-widest text-slate-500 mb-2 mt-2 uppercase">Operación</p>
          
          <NavItem label="Dashboard" path="/dashboard" icon={<FiHome size={20} />} active={isActive("/dashboard")} onClick={() => setIsOpen(false)} />
          
          <div className="pt-4">
            <p className="px-4 text-[10px] font-bold tracking-widest text-slate-500 mb-2 uppercase">Empresa</p>
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <FiSettings size={20} className={isAdminOpen ? "text-white" : ""} />
                <span className={`text-sm font-medium ${isAdminOpen ? "text-white" : ""}`}>Administración</span>
              </div>
              <FiChevronDown className={`transition-transform duration-300 ${isAdminOpen ? "rotate-180 text-white" : ""}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${isAdminOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-1">
                <Link 
                  to="/admin/usuarios" 
                  onClick={() => setIsOpen(false)} 
                  className={`flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 text-sm ${isActive("/admin/usuarios") ? "text-blue-400 bg-blue-500/10 font-medium" : "text-slate-500 hover:text-white hover:bg-white/5 transition-colors"}`}
                >
                  <FiUsers size={16} /> Usuarios
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/5 space-y-2">
          
          {/* Nuevo botón: Volver al Inicio */}
          <Link 
            to="/" 
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
          >
            <FiGlobe size={20} className="group-hover:text-blue-400 transition-colors" />
            <span className="ml-3 text-sm font-medium">Sitio Web</span>
          </Link>

          {/* Botón Cerrar Sesión (Ahora redirige a / ) */}
          <button 
            onClick={handleLogout}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group focus:outline-none"
          >
            <FiLogOut size={20} className="group-hover:scale-110 transition-transform" />
            <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// Componente NavItem Mejorado Visualmente
function NavItem({ label, path, icon, active, onClick }: any) {
  return (
    <Link 
      to={path} 
      onClick={onClick} 
      className={`flex w-full items-center rounded-xl px-3 py-2.5 mb-1 transition-all ${active ? 'bg-gradient-to-r from-blue-600/10 to-transparent text-blue-400 shadow-[inset_2px_0_0_0_#2563eb]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <span className="ml-3 text-sm font-medium">{label}</span>
    </Link>
  );
}