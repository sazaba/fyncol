// src/components/layouts/MainLayout.tsx
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/app/Sidebar";
import { FiMenu } from "react-icons/fi";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [sidebarOpen]);

  return (
    <div className="w-full bg-[#020408] text-white font-inter md:h-screen md:overflow-hidden selection:bg-blue-500/30">
      <div className="flex w-full md:h-full">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <main className="flex-1 flex flex-col relative min-w-0">
          {/* Header móvil */}
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

          {/* Aplicamos la clase scrollbar de index.css en lugar de custom-scrollbar */}
          <div className="bg-[#020408] md:flex-1 md:overflow-y-auto scrollbar">
            <Outlet />
          </div>

        </main>
      </div>
    </div>
  );
}