// src/pages/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-[#020408] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <aside 
        className={`${sidebarOpen ? "w-64" : "w-20"} relative z-20 flex flex-col border-r border-white/5 bg-[#05050A] transition-all duration-300 hidden md:flex`}
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-center border-b border-white/5">
           <img src={logo} alt="Fyncol" className="h-6 w-auto object-contain opacity-90" />
           {sidebarOpen && <span className="ml-3 font-bold tracking-tight text-white">Fyncol</span>}
        </div>

        {/* Nav Links (Ejemplos) */}
        <nav className="flex-1 space-y-2 p-4">
          <NavItem icon={<HomeIcon />} label="Inicio" isOpen={sidebarOpen} active />
          <NavItem icon={<UsersIcon />} label="Pacientes" isOpen={sidebarOpen} />
          <NavItem icon={<CalendarIcon />} label="Citas" isOpen={sidebarOpen} />
          <NavItem icon={<WalletIcon />} label="Cartera" isOpen={sidebarOpen} />
        </nav>

        {/* User Profile */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/20" />
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">Dr. Bastidas</span>
                <span className="text-xs text-slate-500">Psicólogo</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        {/* Header Mobile & Title */}
        <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#020408]/50 px-6 backdrop-blur-xl z-10">
          <h2 className="text-lg font-semibold text-slate-200">Panel Principal</h2>
          <button 
            onClick={() => navigate("/")}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cerrar Sesión
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Stats Cards */}
            <StatCard title="Ingresos del Mes" value="$12.4M" change="+12%" positive />
            <StatCard title="Citas Pendientes" value="8" change="Para hoy" neutral />
            <StatCard title="Cartera Vencida" value="$2.1M" change="-5%" negative />
            <StatCard title="Nuevos Pacientes" value="14" change="+2" positive />
          </div>

          {/* Table Placeholder */}
          <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-300">Últimos Movimientos</h3>
            <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-slate-500 text-sm">
              Aquí cargaremos los datos reales desde la base de datos...
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Componentes Pequeños para mantener limpio el código ---

function NavItem({ icon, label, isOpen, active = false }: any) {
  return (
    <button className={`flex w-full items-center rounded-xl px-3 py-2.5 transition-all group ${active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      <span className="h-5 w-5">{icon}</span>
      {isOpen && <span className="ml-3 text-sm font-medium">{label}</span>}
    </button>
  );
}

function StatCard({ title, value, change, positive, negative, neutral }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0B1020]/40 p-5 hover:border-white/10 transition-colors">
      <p className="text-xs font-medium text-slate-400">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <span className={`text-xs font-medium ${positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-blue-400'}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

// Iconos SVG simples
const HomeIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const UsersIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CalendarIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const WalletIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;