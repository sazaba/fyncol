import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/app/Sidebar";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-[#020408] text-white font-sans">
      {/* Sidebar fijo */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Área principal */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header móvil / Toggle */}
        <header className="h-16 border-b border-white/5 bg-[#05050A] flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
            ☰
          </button>
          <div className="flex items-center gap-3">
             <span className="text-sm font-medium">Hola, Admin</span>
             <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">A</div>
          </div>
        </header>

        {/* Aquí se cargan las páginas (Dashboard, Usuarios, etc.) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#020408]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}