import { useState, useEffect } from "react";
import { FiPlus, FiMinus, FiAlertCircle, FiLoader, FiClock, FiTrendingUp, FiTrendingDown, FiTag, FiX } from "react-icons/fi";

interface RouteData {
  id: number;
  country: string;
  city: string;
  currency: string;
  availableCapital: number;
  assignedTo?: {
    name: string;
  } | null;
}

// Nueva interfaz para el historial
interface TransactionHistory {
  id: number;
  type: string; // 'INVERSION', 'RETIRO', 'GASTO', etc.
  amount: number;
  description: string;
  createdAt: string;
}

export default function GestionCapital() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"invest" | "withdraw">("invest");
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ESTADOS PARA EL HISTORIAL ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<TransactionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- LÓGICA DE URL ---
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      fetchRoutes();
    } else {
      setLoading(false);
      setError("Acceso denegado. Este módulo es exclusivo para administradores.");
    }
  }, [isAdmin]);

  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/capital`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setRoutes(data.data);
      } else {
        setError(data.message || "Error al obtener las rutas");
      }
    } catch (err: any) {
      setError(`Error de conexión: ${err.message}. Revisa la consola.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (routeId: number) => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Endpoint que construiremos en el backend
      const res = await fetch(`${API_URL}/capital/${routeId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setHistoryData(data.data);
      } else {
        alert(data.message || "Error al obtener el historial");
      }
    } catch (err) {
      alert("Error de conexión al cargar el historial");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);
    const endpoint = transactionType === "invest" ? "/capital/invest" : "/capital/withdraw";

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          routeId: selectedRoute.id,
          amount: Number(amount),
          description: description
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchRoutes();
      } else {
        alert(data.message || "Error en la transacción");
      }
    } catch (err) {
      alert("Error de red al procesar la transacción");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionModal = (route: RouteData, type: "invest" | "withdraw") => {
    setSelectedRoute(route);
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openHistoryModal = (route: RouteData) => {
    setSelectedRoute(route);
    setHistoryData([]);
    setIsHistoryModalOpen(true);
    fetchHistory(route.id);
  };

  // Helper para renderizar los iconos y colores en el historial
  const getTransactionUI = (type: string) => {
    switch (type) {
      case 'INVERSION':
      case 'RECAUDO':
        return { icon: <FiTrendingUp />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', sign: '+' };
      case 'RETIRO':
        return { icon: <FiTrendingDown />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', sign: '-' };
      case 'GASTO':
        return { icon: <FiTag />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', sign: '-' };
      default:
        return { icon: <FiClock />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', sign: '' };
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-slate-400">
        <FiAlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 font-inter">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Capital</h1>
          <p className="text-sm text-slate-400">Administra la inversión, retiros y audita el historial de cada ruta operativa.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-blue-400">
            <FiLoader className="animate-spin" /> Cargando datos...
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0A0A0F]">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-300">
              <tr>
                <th className="px-6 py-4">ID Ruta</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Cobrador Asignado</th>
                <th className="px-6 py-4 text-right">Capital Disponible</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">#{route.id}</td>
                  <td className="px-6 py-4">{route.city}, {route.country}</td>
                  <td className="px-6 py-4">
                    {route.assignedTo ? (
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400 border border-blue-500/20">
                        {route.assignedTo.name}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-white">
                    {Number(route.availableCapital || 0).toLocaleString('es-CO')} <span className="text-slate-500 text-xs">{route.currency}</span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button 
                      onClick={() => openActionModal(route, "invest")}
                      className="flex items-center gap-1 rounded bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                      title="Asignar dinero a la ruta"
                    >
                      <FiPlus size={14} /> Invertir
                    </button>
                    <button 
                      onClick={() => openActionModal(route, "withdraw")}
                      className="flex items-center gap-1 rounded bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                      title="Retirar dinero de la ruta"
                    >
                      <FiMinus size={14} /> Retirar
                    </button>
                    <button 
                      onClick={() => openHistoryModal(route)}
                      className="flex items-center gap-1 rounded bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors border border-white/10"
                      title="Ver auditoría de movimientos"
                    >
                      <FiClock size={14} /> Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE INVERSIÓN/RETIRO */}
      {isModalOpen && selectedRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#05050A] p-7 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                {transactionType === "invest" ? "Asignar Inversión" : "Retirar Dinero"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><FiX size={20}/></button>
            </div>
            
            <p className="text-sm text-slate-400 mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
              Ruta: <span className="text-white font-semibold">{selectedRoute.city} ({selectedRoute.currency})</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Monto ({selectedRoute.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Descripción / Motivo</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Aumento de capital operativo"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${transactionType === "invest" ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20" : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"}`}
                >
                  {isSubmitting ? <FiLoader className="animate-spin" /> : "Confirmar Movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL / AUDITORÍA */}
      {isHistoryModalOpen && selectedRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#05050A] flex flex-col max-h-[85vh] shadow-2xl animate-[slideUp_0.18s_ease-out]">
            
            {/* Header del Modal */}
            <div className="p-6 border-b border-white/10 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <FiClock className="text-blue-400" /> Auditoría de Capital
                </h3>
                <p className="text-xs text-slate-400">
                  Ruta: <span className="text-slate-200 font-semibold">{selectedRoute.city}</span> | Capital Actual: <span className="text-emerald-400 font-mono">${Number(selectedRoute.availableCapital).toLocaleString('es-CO')}</span>
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors border border-white/5"><FiX size={18} /></button>
            </div>

            {/* Cuerpo del Modal (Línea de tiempo) */}
            <div className="p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <FiLoader size={24} className="animate-spin text-blue-500 mb-2" />
                  <span className="text-sm">Cargando movimientos...</span>
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <p className="text-slate-400 text-sm">No hay movimientos registrados en esta ruta.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                  {historyData.map((tx) => {
                    const ui = getTransactionUI(tx.type);
                    return (
                      <div key={tx.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icono central */}
                        <div className={`flex items-center justify-center w-11 h-11 rounded-full border-4 border-[#05050A] ${ui.bg} ${ui.color} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10`}>
                          {ui.icon}
                        </div>
                        
                        {/* Tarjeta de transacción */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-2xl bg-[#0B0B12] border border-white/5 shadow-sm group-hover:border-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${ui.color}`}>{tx.type}</span>
                            <span className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString('es-CO')} {new Date(tx.createdAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className={`text-lg font-bold font-mono mb-1 ${ui.color}`}>
                            {ui.sign}${Number(tx.amount).toLocaleString('es-CO')}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-2">{tx.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}