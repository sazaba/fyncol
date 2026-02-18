// src/components/layouts/MainLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/app/Sidebar";
import { FiMenu } from "react-icons/fi";

export default function MainLayout() {
  // En móvil arranca cerrado. En desktop el sidebar siempre se verá por CSS.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#020408] text-white font-inter overflow-hidden">
      
      {/* Sidebar: Le pasamos el estado para poder cerrarlo desde adentro en móviles */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Área principal */}
      <main className="flex-1 flex flex-col relative min-w-0">
        
        {/* Navbar MÓVIL: Visible solo en celulares (md:hidden) */}
        <header className="md:hidden flex h-16 border-b border-white/5 bg-[#05050A] items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(37,99,235,0.4)]">
               A
             </div>
             <span className="text-sm font-medium font-sora">Hola, Admin</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="text-slate-400 hover:text-white transition-colors active:scale-95 p-2"
          >
            <FiMenu size={24} />
          </button>
        </header>

        {/* Contenedor de las Páginas */}
        <div className="flex-1 overflow-y-auto bg-[#020408] custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}