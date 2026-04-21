import { useState, useEffect } from 'react';
import { 
  FiDollarSign, FiTrendingUp, FiUsers, FiAlertTriangle, 
  FiPieChart, FiActivity, FiRefreshCw, FiTarget, FiLoader, FiMap 
} from 'react-icons/fi';

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

export default function Monitoreo() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [routesList, setRoutesList] = useState<any[]>([]); // Para guardar las rutas reales
  const [isLoading, setIsLoading] = useState(true);
  const [routeId, setRouteId] = useState<number | null>(null); // Inicia nulo
  const [error, setError] = useState<string | null>(null);

  // 1. OBTENER LAS RUTAS REALES DE LA EMPRESA
  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Apuntamos al endpoint que maneja la información del capital y las rutas
      const res = await fetch(`${baseUrl}/api/capital`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        // Asumimos que la data viene en result.data según tu controlador de capital
        const rutasArray = result.data || [];
        
        if (rutasArray.length > 0) {
          setRoutesList(rutasArray);
          setRouteId(rutasArray[0].id); // Auto-selecciona la primera ruta real
        } else {
          setError("No tienes rutas creadas en tu empresa.");
          setIsLoading(false);
        }
      } else {
        setError("Error al obtener la lista de rutas.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Error de conexión al cargar rutas.");
      setIsLoading(false);
    }
  };

  // 2. CARGAR RUTAS AL INICIAR
  useEffect(() => {
    fetchRoutes();
  }, []);

  // 3. CARGAR DATOS DEL DASHBOARD CADA VEZ QUE CAMBIE LA RUTA SELECCIONADA
  const fetchDashboardData = async () => {
    if (!routeId) return; // Si no hay ruta seleccionada, no hace nada
    
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
        setData(result.data);
      } else {
        setError(result.error || "Error al cargar los datos del monitoreo");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Actualizar automáticamente cada 5 minutos
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [routeId]);

  const formatCurrency = (value: number) => {
    return `$${Math.round(value || 0).toLocaleString('es-CO')}`;
  };

  // Componente de Tarjeta Premium
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
    <div className="min-h-[calc(100dvh-64px)] w-full bg-[#0B0B12] p-6 lg:p-8 overflow-y-auto">
      
      {/* HEADER Y CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Monitoreo en Tiempo Real</h1>
          <p className="text-sm text-slate-400">Panel de control y métricas de rendimiento</p>
        </div>
        
        <div className="flex items-center gap-3">
          {routesList.length > 0 && (
            <div className="bg-[#05050A] border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <FiMap className="text-slate-400" size={16} />
              <select 
                value={routeId || ''}
                onChange={(e) => setRouteId(Number(e.target.value))}
                className="bg-transparent text-white text-sm font-semibold outline-none appearance-none pr-4 cursor-pointer"
              >
                {/* MAPEO DINÁMICO DE TUS RUTAS REALES */}
                {routesList.map(ruta => (
                  <option key={ruta.id} value={ruta.id} className="bg-[#0B0B12]">
                    {ruta.city || ruta.name || `Ruta ${ruta.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            onClick={fetchDashboardData}
            disabled={!routeId || isLoading}
            className="p-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50"
            title="Actualizar datos"
          >
            <FiRefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <FiLoader className="animate-spin mb-3 text-blue-500" size={32} />
          <p className="font-medium tracking-wide">Sincronizando métricas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <FiAlertTriangle className="mx-auto text-red-400 mb-2" size={32} />
          <h3 className="text-red-400 font-bold mb-1">Error de conexión</h3>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : data && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          
          {/* SECCIÓN 1: CAJA Y LIQUIDEZ */}
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Liquidez y Recaudo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="Caja Inicial" 
              value={formatCurrency(data.cajaInicial)} 
              icon={FiDollarSign} 
              colorClass="text-white" 
            />
            <StatCard 
              title="Saldo Disponible" 
              value={formatCurrency(data.saldoDisponible)} 
              icon={FiPieChart} 
              colorClass="text-blue-400" 
              subtitle="Capital actual en la calle"
            />
            <StatCard 
              title="Recaudo del Día" 
              value={formatCurrency(data.recaudoDia)} 
              icon={FiTrendingUp} 
              colorClass="text-emerald-400" 
            />
          </div>

          {/* SECCIÓN 2: RENDIMIENTO Y PROYECCIÓN */}
          <div className="bg-[#05050A] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                 style={{ width: `${Math.min(data.rendimiento.porcentaje, 100)}%` }}
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
                    Meta proyectada: <span className="font-semibold text-slate-300">{formatCurrency(data.rendimiento.proyectado)}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-end gap-2 justify-end">
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                    {data.rendimiento.porcentaje}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Cumplimiento hoy</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: VENTAS Y CARTERA */}
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mt-8">Estado de Cartera y Ventas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Ventas (Nuevos)" 
              value={formatCurrency(data.nuevosCreditosAmount)} 
              icon={FiActivity} 
              colorClass="text-purple-400" 
            />
            <StatCard 
              title="Renovaciones" 
              value={formatCurrency(data.renovacionesAmount)} 
              icon={FiRefreshCw} 
              colorClass="text-indigo-400" 
            />
            <StatCard 
              title="Cartera Inicial" 
              value={formatCurrency(data.carteraInicial)} 
              icon={FiPieChart} 
              colorClass="text-slate-300" 
            />
            <StatCard 
              title="Cartera Final" 
              value={formatCurrency(data.carteraFinal)} 
              icon={FiPieChart} 
              colorClass="text-white" 
            />
          </div>

          {/* SECCIÓN 4: CLIENTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <FiUsers size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Clientes que Pagaron</p>
                  <p className="text-sm text-slate-500">Han hecho abonos hoy</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-emerald-400">{data.clientesQuePagaron}</h3>
            </div>

            <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                  <FiAlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Clientes en Mora</p>
                  <p className="text-sm text-slate-500">Con cuotas vencidas</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-red-400">{data.clientesEnMora}</h3>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}