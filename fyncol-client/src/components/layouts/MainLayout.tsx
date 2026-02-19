// src/components/layouts/MainLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/app/Sidebar";
import { FiMenu } from "react-icons/fi";

export default function MainLayout() {
  // En móvil arranca cerrado. En desktop el sidebar siempre se verá por CSS.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // ✅ CLAVE: en móvil NO usamos h-screen ni overflow-hidden
    // ✅ En desktop sí fijamos alto y escondemos overflow para scroll interno limpio
    <div className="w-full min-h-[100dvh] md:h-[100dvh] bg-[#020408] text-white font-inter md:overflow-hidden">
      <div className="flex min-h-[100dvh] md:h-full w-full">
        {/* Sidebar overlay en móvil + fijo en desktop (según tu componente Sidebar) */}
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        {/* Área principal */}
        <main className="flex-1 flex flex-col relative min-w-0">
          {/* Navbar MÓVIL */}
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
              aria-label="Abrir menú"
            >
              <FiMenu size={24} />
            </button>
          </header>

          {/* ✅ Contenedor de páginas:
              - móvil: overflow-visible (sin scroll interno)
              - desktop: overflow-y-auto (scroll interno del dashboard) */}
          <div className="flex-1 bg-[#020408] overflow-visible md:overflow-y-auto custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
