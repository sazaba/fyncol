// src/pages/dashboard/Dashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Variable de entorno
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Cargando...");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
          setUserName(data.user.name);
          setStats(data.stats);
        } else {
            // Si falla el token, limpiar y salir
            localStorage.removeItem("token");
            navigate("/login");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchUserData();
  }, [navigate]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* 1. Header de Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold text-white">Hola, {userName} 👋</h1>
        <p className="text-slate-400">Aquí tienes el resumen de tu operación hoy.</p>
      </div>

      {/* 2. Tarjetas KPIs (Stats) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ingresos Hoy" 
          value={stats ? stats.ingresos : "$0"} 
          change="+12%" 
          positive 
          icon="💰"
        />
        <StatCard 
          title="Citas Pendientes" 
          value={stats ? stats.citas : "0"} 
          change="Para hoy" 
          icon="📅"
        />
        <StatCard 
          title="Cartera Vencida" 
          value={stats ? stats.cartera : "$0"} 
          change="-5%" 
          negative 
          icon="📉"
        />
        <StatCard 
          title="Clientes Activos" 
          value={stats ? stats.pacientes : "0"} 
          change="+2" 
          positive 
          icon="👥"
        />
      </div>

      {/* 3. Sección Gráficas Dummy y Actividad */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Gráfica de Barras Simulada (CSS puro) */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0B1020]/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Comportamiento de Recaudos</h3>
            <select className="bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 px-2 py-1 outline-none">
              <option>Últimos 6 meses</option>
            </select>
          </div>
          
          {/* Contenedor de las barras */}
          <div className="flex items-end justify-between h-48 gap-2 pt-4">
            <Bar height="40%" label="Ago" />
            <Bar height="65%" label="Sep" />
            <Bar height="50%" label="Oct" />
            <Bar height="85%" label="Nov" active />
            <Bar height="70%" label="Dic" />
            <Bar height="60%" label="Ene" />
          </div>
        </div>

        {/* Lista de Actividad Reciente */}
        <div className="rounded-2xl border border-white/5 bg-[#0B1020]/40 p-6 backdrop-blur-sm">
          <h3 className="font-semibold text-white mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            <ActivityItem 
              title="Pago Recibido" 
              desc="Juan Pérez abonó $50.000" 
              time="Hace 10 min" 
              type="payment" 
            />
            <ActivityItem 
              title="Nuevo Cliente" 
              desc="Registro de María Gómez" 
              time="Hace 1h" 
              type="user" 
            />
            <ActivityItem 
              title="Ruta Finalizada" 
              desc="Cobrador Carlos terminó ruta Norte" 
              time="Hace 2h" 
              type="route" 
            />
          </div>
          <button className="w-full mt-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors border border-white/5 rounded-lg hover:bg-white/5">
            Ver todo
          </button>
        </div>

      </div>
    </div>
  );
}

// --- Componentes Pequeños Visuales ---

function StatCard({ title, value, change, positive, negative, icon }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0B1020]/40 p-5 hover:border-white/10 transition-colors group">
      <div className="flex justify-between items-start">
        <div>
           <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
           <h3 className="mt-2 text-2xl font-bold text-white">{value}</h3>
        </div>
        <span className="text-2xl opacity-50 grayscale group-hover:grayscale-0 transition-all">{icon}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${positive ? 'bg-emerald-500/10 text-emerald-400' : negative ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
          {change}
        </span>
        <span className="text-xs text-slate-500">vs mes anterior</span>
      </div>
    </div>
  );
}

// Componente de Barra para la gráfica
function Bar({ height, label, active }: any) {
  return (
    <div className="flex flex-col items-center flex-1 group cursor-pointer">
      <div className="relative w-full max-w-[40px] bg-white/5 rounded-t-sm h-full flex items-end overflow-hidden">
        <div 
          style={{ height: height }} 
          className={`w-full transition-all duration-500 ${active ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-700 group-hover:bg-slate-600'}`}
        />
      </div>
      <span className="mt-2 text-xs text-slate-500">{label}</span>
    </div>
  );
}

// Item de Actividad
function ActivityItem({ title, desc, time, type }: any) {
  const colors: any = {
    payment: "bg-emerald-500",
    user: "bg-blue-500",
    route: "bg-purple-500"
  };

  return (
    <div className="flex gap-3 items-start">
      <div className={`mt-1.5 h-2 w-2 rounded-full ${colors[type] || "bg-slate-500"} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
        <p className="text-[10px] text-slate-600 mt-1">{time}</p>
      </div>
    </div>
  );
}