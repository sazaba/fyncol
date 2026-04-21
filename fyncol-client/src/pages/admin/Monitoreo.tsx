// src/pages/admin/Monitoreo.tsx
import { useState, useEffect } from 'react';
import { 
  FiDollarSign, FiTrendingUp, FiUsers, FiAlertTriangle, 
  FiPieChart, FiActivity, FiRefreshCw, FiTarget, FiLoader, FiMap,
  FiChevronRight, FiUser, FiArrowLeft
} from 'react-icons/fi';

import TodayRouteCard from "@/components/admin/TodayRouteCard";

// ==========================================
// INTERFACES
// ==========================================
interface RouteSummary {
  id: number;
  zona: string;
  cobrador: string;
  disponible: number;
  recaudado: number;
  clientesTotales: number;
  clientesCobrados: number;
  clientesMora: number;
  porcentaje: number;
}

interface DashboardData {
  cajaInicial: number;
  saldoDisponible: number;
  nuevosCreditosAmount: number;
  renovacionesAmount: number;
  recaudoDia: number;
  carteraInicial: number;
  carteraFinal: number;
  clientesQuePagaron: number;
  clientesEnMora: number;
  rendimiento: {
    proyectado: number;
    realizado: number;
    porcentaje: number;
  };
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function Monitoreo() {
  // Estados de Vista
  const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedRouteName, setSelectedRouteName] = useState<string>("");

  // Estados de Datos
  const [routesSummary, setRoutesSummary] = useState<RouteSummary[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Estados de Carga
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => `$${Math.round(value || 0).toLocaleString('es-CO')}`;

  // ==========================================
  // FETCH 1: LISTA GENERAL DE RUTAS
  // ==========================================
  const fetchRoutesSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/rutas/summary/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        setRoutesSummary(result.data || []);
      } else {
        setError(result.error || "Error al cargar el resumen de rutas.");
      }
    } catch (err) {
      setError("Error de conexión al servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // FETCH 2: DASHBOARD DETALLADO DE UNA RUTA
  // ==========================================
  const fetchDashboardData = async (routeId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/monitoring/dashboard?routeId=${routeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error || "Error al cargar los datos del monitoreo");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  // Efectos para cargar datos según la vista
  useEffect(() => {
    if (view === 'LIST') {
      fetchRoutesSummary();
      const interval = setInterval(fetchRoutesSummary, 60000); // Refresca lista cada 1 min
      return () => clearInterval(interval);
    } else if (view === 'DETAIL' && selectedRouteId) {
      fetchDashboardData(selectedRouteId);
      const interval = setInterval(() => fetchDashboardData(selectedRouteId), 60000); // Refresca detalle cada 1 min
      return () => clearInterval(interval);
    }
  }, [view, selectedRouteId]);

  // Manejadores de navegación
  const handleSelectRoute = (routeId: number, routeName: string) => {
    setSelectedRouteId(routeId);
    setSelectedRouteName(routeName);
    setView('DETAIL');
  };

  const handleBackToList = () => {
    setView('LIST');
    setSelectedRouteId(null);
    setDashboardData(null);
  };

  // Tarjeta reutilizable para el Dashboard
  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle = "" }: any) => (
    <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${colorClass.split('-')[1]}-500/10 rounded-full blur-2xl group-hover:bg-${colorClass.split('-')[1]}-500/20 transition-all`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl bg-${colorClass.split('-')[1]}-500/10 border border-${colorClass.split('-')[1]}-500/20 text-${colorClass.split('-')[1]}-400`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
        {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100dvh-64px)] w-full bg-[#0B0B12] p-4 md:p-6 lg:p-8 overflow-y-auto">
      
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          {view === 'DETAIL' && (
            <button 
              onClick={handleBackToList}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-95"
            >
              <FiArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {view === 'LIST' ? 'Resumen de Rutas' : `Monitoreo: ${selectedRouteName}`}
            </h1>
            <p className="text-sm text-slate-400">
              {view === 'LIST' ? 'Estado de la operación general' : 'Métricas en tiempo real y geolocalización'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => view === 'LIST' ? fetchRoutesSummary() : fetchDashboardData(selectedRouteId!)}
          disabled={isLoading}
          className="p-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
        >
          <FiRefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* MANEJO DE ERRORES / LOADING GLOBAL */}
      {isLoading && view === 'LIST' && routesSummary.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <FiLoader className="animate-spin mb-3 text-blue-500" size={32} />
          <p className="font-medium tracking-wide">Cargando rutas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <FiAlertTriangle className="mx-auto text-red-400 mb-2" size={32} />
          <h3 className="text-red-400 font-bold mb-1">Error de conexión</h3>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : (
        <>
          {/* ========================================== */}
          {/* VISTA 1: LISTA DE RUTAS (Estilo de la foto) */}
          {/* ========================================== */}
          {view === 'LIST' && (
            <div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
              {routesSummary.length === 0 ? (
                <div className="text-center py-12 bg-[#05050A] rounded-2xl border border-white/5">
                  <p className="text-slate-400">No hay rutas activas en este momento.</p>
                </div>
              ) : (
                routesSummary.map((route) => {
                  const circleRadius = 18;
                  const circleCircumference = 2 * Math.PI * circleRadius;
                  const dashOffset = circleCircumference - (route.porcentaje / 100) * circleCircumference;
                  const isCompleted = route.porcentaje === 100;

                  return (
                    <div 
                      key={route.id}
                      onClick={() => handleSelectRoute(route.id, route.zona)}
                      className="bg-[#05050A] hover:bg-[#0A0F1C] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition-all shadow-sm group"
                    >
                      {/* 1. Zona y Ruta */}
                      <div className="flex flex-row md:flex-col md:w-[200px] shrink-0 gap-3 md:gap-1 w-full items-center md:items-start border-b md:border-b-0 border-white/5 pb-3 md:pb-0">
                         <div className="h-10 w-10 md:hidden bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                           <FiMap size={20} />
                         </div>
                         <div>
                           <p className="text-sm font-bold text-white flex items-center gap-2">
                             <span className="hidden md:inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                             {route.zona}
                           </p>
                           <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Ruta #{route.id}</p>
                         </div>
                      </div>

                      {/* 2. Cobrador */}
                      <div className="flex items-center gap-3 md:w-[220px] shrink-0 w-full">
                        <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                          <FiUser size={14} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-200 truncate">{route.cobrador}</p>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded w-max mt-0.5">
                            Cobrador
                          </p>
                        </div>
                      </div>

                      {/* 3. Círculo de Cumplimiento y Stats Textuales */}
                      <div className="flex items-center gap-4 flex-1 w-full">
                        {/* Círculo SVG */}
                        <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                          <svg className="transform -rotate-90 w-12 h-12">
                            <circle cx="24" cy="24" r={circleRadius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
                            <circle cx="24" cy="24" r={circleRadius} stroke="currentColor" strokeWidth="3" fill="transparent" 
                              strokeDasharray={circleCircumference} strokeDashoffset={dashOffset} strokeLinecap="round" 
                              className={`transition-all duration-1000 ${isCompleted ? 'text-emerald-500' : 'text-blue-500'}`} 
                            />
                          </svg>
                          <span className={`absolute text-[10px] font-bold ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                            {route.porcentaje}%
                          </span>
                        </div>
                        
                        {/* Stats en Texto */}
                        <div>
                          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Progreso</p>
                          <p className="text-xs text-slate-300 font-medium flex gap-2 mt-0.5">
                            <span><span className="text-white font-bold">{route.clientesTotales}</span> Total</span>
                            <span className="text-slate-600">•</span>
                            <span><span className="text-emerald-400 font-bold">{route.clientesCobrados}</span> Cobrados</span>
                            <span className="text-slate-600">•</span>
                            <span><span className="text-red-400 font-bold">{route.clientesMora}</span> Mora</span>
                          </p>
                        </div>
                      </div>

                      {/* 4. Valores Económicos */}
                      <div className="flex md:flex-col gap-6 md:gap-1 items-center md:items-end w-full md:w-[150px] shrink-0 justify-between md:justify-center border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1"><FiDollarSign size={10}/> Recaudado</p>
                          <p className="text-sm font-bold text-emerald-400">{formatCurrency(route.recaudado)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center justify-end gap-1"><FiPieChart size={10}/> Disponible</p>
                          <p className="text-sm font-semibold text-slate-300">{formatCurrency(route.disponible)}</p>
                        </div>
                      </div>

                      {/* 5. Icono entrar */}
                      <div className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                        <FiChevronRight size={18} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* VISTA 2: DASHBOARD DETALLADO DE UNA RUTA */}
          {/* ========================================== */}
          {view === 'DETAIL' && dashboardData && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              
              {/* SECCIÓN 1: MAPA Y LISTA DE HOY (Ocupa el tope ahora para mayor relevancia) */}
              <TodayRouteCard routeId={selectedRouteId!} />

              {/* SECCIÓN 2: RENDIMIENTO Y PROYECCIÓN */}
              <div className="bg-[#05050A] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                   <div 
                     className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                     style={{ width: `${Math.min(dashboardData.rendimiento.porcentaje, 100)}%` }}
                   ></div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-white">
                      <FiTarget size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Rendimiento de Recaudo</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Meta proyectada: <span className="font-semibold text-slate-300">{formatCurrency(dashboardData.rendimiento.proyectado)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-end gap-2 justify-end">
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        {dashboardData.rendimiento.porcentaje}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Cumplimiento hoy</p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: CAJA Y LIQUIDEZ */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Caja Inicial" value={formatCurrency(dashboardData.cajaInicial)} icon={FiDollarSign} colorClass="text-white" />
                <StatCard title="Saldo Disponible" value={formatCurrency(dashboardData.saldoDisponible)} icon={FiPieChart} colorClass="text-blue-400" subtitle="Capital actual en la calle" />
                <StatCard title="Recaudo del Día" value={formatCurrency(dashboardData.recaudoDia)} icon={FiTrendingUp} colorClass="text-emerald-400" />
              </div>

              {/* SECCIÓN 4: VENTAS Y CARTERA */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ventas (Nuevos)" value={formatCurrency(dashboardData.nuevosCreditosAmount)} icon={FiActivity} colorClass="text-purple-400" />
                <StatCard title="Renovaciones" value={formatCurrency(dashboardData.renovacionesAmount)} icon={FiRefreshCw} colorClass="text-indigo-400" />
                <StatCard title="Cartera Inicial" value={formatCurrency(dashboardData.carteraInicial)} icon={FiPieChart} colorClass="text-slate-300" />
                <StatCard title="Cartera Final" value={formatCurrency(dashboardData.carteraFinal)} icon={FiPieChart} colorClass="text-white" />
              </div>

              {/* SECCIÓN 5: CLIENTES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><FiUsers size={20} /></div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Clientes que Pagaron</p>
                      <p className="text-sm text-slate-500">Han hecho abonos hoy</p>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-emerald-400">{dashboardData.clientesQuePagaron}</h3>
                </div>

                <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20"><FiAlertTriangle size={20} /></div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Clientes en Mora</p>
                      <p className="text-sm text-slate-500">Con cuotas vencidas</p>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-red-400">{dashboardData.clientesEnMora}</h3>
                </div>
              </div>

            </div>
          )}

          {view === 'DETAIL' && isLoading && !dashboardData && (
             <div className="flex justify-center items-center h-64 text-slate-400">
               <FiLoader className="animate-spin" size={32} />
             </div>
          )}
        </>
      )}
    </div>
  );
}