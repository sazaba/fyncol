// src/components/app/Sidebar.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png"; 
import { FiHome, FiSettings, FiUsers, FiLogOut, FiChevronDown } from "react-icons/fi";

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      {/* ========================================== */}
      {/* VISTA DESKTOP (Sidebar Lateral)            */}
      {/* ========================================== */}
      <aside className={`${isOpen ? "w-64" : "w-20"} relative z-20 flex-col border-r border-white/5 bg-[#05050A] transition-all duration-300 hidden md:flex h-screen font-inter`}>
        
        <div className="flex h-16 items-center justify-center border-b border-white/5 shrink-0">
          <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
          {isOpen && <span className="ml-3 font-bold text-xl text-white tracking-tight font-sora">Fyncol</span>}
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto custom-scrollbar">
          <p className={`px-4 text-xs font-semibold text-slate-500 mb-2 mt-2 ${!isOpen && "hidden"}`}>OPERACIÓN</p>
          
          <NavItem label="Dashboard" path="/dashboard" icon={<FiHome size={20} />} isOpen={isOpen} active={isActive("/dashboard")} />
          
          <div className="pt-4">
            <p className={`px-4 text-xs font-semibold text-slate-500 mb-2 ${!isOpen && "hidden"}`}>EMPRESA</p>
            <button
              onClick={() => isOpen && setIsAdminOpen(!isAdminOpen)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all ${!isOpen && "justify-center"}`}
            >
              <div className="flex items-center gap-3">
                <FiSettings size={20} />
                {isOpen && <span className="text-sm font-medium">Administración</span>}
              </div>
              {isOpen && <FiChevronDown className={`transition-transform duration-300 ${isAdminOpen ? "rotate-180" : ""}`} />}
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${isAdminOpen && isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-1">
                <Link to="/admin/usuarios" className={`flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 text-sm ${isActive("/admin/usuarios") ? "text-blue-400 bg-blue-500/10" : "text-slate-500 hover:text-white"}`}>
                  <FiUsers size={16} /> Usuarios
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group ${!isOpen && "justify-center"}`}
          >
            <FiLogOut size={20} className="group-hover:scale-110 transition-transform" />
            {isOpen && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ========================================== */}
      {/* VISTA MÓVIL (Bottom Navbar Safari Optimized) */}
      {/* ========================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#05050A]/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around pb-[env(safe-area-inset-bottom)] h-16 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] font-inter">
        
        <MobileNavItem path="/dashboard" icon={<FiHome size={22} />} active={isActive("/dashboard")} label="Inicio" />
        <MobileNavItem path="/admin/usuarios" icon={<FiUsers size={22} />} active={isActive("/admin/usuarios")} label="Usuarios" />
        {/* Aquí puedes agregar más rutas para el móvil */}
        
        <button 
          onClick={handleLogout} 
          className="flex flex-col items-center justify-center w-16 h-full text-slate-500 hover:text-red-400 transition-colors active:scale-95"
        >
          <FiLogOut size={22} />
          <span className="text-[10px] mt-1 font-medium">Salir</span>
        </button>
      </nav>
    </>
  );
}

// Componente NavItem para Desktop
function NavItem({ label, path, icon, isOpen, active }: any) {
  return (
    <Link to={path} className={`flex w-full items-center rounded-xl px-3 py-2.5 mb-1 transition-all ${active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'} ${!isOpen && "justify-center"}`}>
      {icon}
      {isOpen && <span className="ml-3 text-sm font-medium">{label}</span>}
    </Link>
  );
}

// Componente NavItem optimizado para Móvil
function MobileNavItem({ path, icon, active, label }: any) {
  return (
    <Link to={path} className={`flex flex-col items-center justify-center w-16 h-full transition-colors active:scale-95 ${active ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
      <div className={`p-1 rounded-full transition-all ${active ? 'bg-blue-500/10' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </Link>
  );
}