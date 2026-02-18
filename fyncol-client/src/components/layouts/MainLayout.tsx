// src/components/layouts/MainLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/app/Sidebar";
import { FiMenu } from "react-icons/fi";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-[#020408] text-white font-inter overflow-hidden">
      {/* Sidebar: Maneja automáticamente su vista Desktop (Lateral) o Móvil (Inferior) */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Área principal */}
      <main className="flex-1 flex flex-col relative min-w-0">
        
        {/* Header Superior: OCULTO EN MÓVILES (hidden md:flex) para maximizar la pantalla */}
        <header className="hidden md:flex h-16 border-b border-white/5 bg-[#05050A] items-center justify-between px-6 shrink-0 transition-all">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-slate-400 hover:text-white transition-colors active:scale-95"
          >
            <FiMenu size={24} />
          </button>
          
          <div className="flex items-center gap-3">
             <span className="text-sm font-medium font-sora">Hola, Admin</span>
             <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(37,99,235,0.4)]">
               A
             </div>
          </div>
        </header>

        {/* Contenedor de las Páginas (Dashboard, Usuarios, etc.) */}
        {/* El padding se lo dejamos a cada página para mayor control en móviles */}
        <div className="flex-1 overflow-y-auto bg-[#020408] custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}