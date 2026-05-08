import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiClock, FiUser, FiDollarSign, FiMapPin, FiActivity, FiTrendingDown, FiLoader } from 'react-icons/fi';

interface ExpenseRequest {
  id: number;
  amount: number | string;
  description: string;
  status: string;
  createdAt: string;
  route: { id: number; city: string; availableCapital: number | string };
  requestedBy: { name: string };
}

export default function SolicitudesGastos() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/capital/expense/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error("Error al cargar solicitudes de gastos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm("¿Aprobar este gasto? El dinero se descontará inmediatamente de la caja de la ruta.")) return;
    
    setProcessingId(id);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/capital/expense/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setRequests(prev => prev.filter(r => r.id !== id));
      } else {
        alert(result.message || result.error || "Error al aprobar la solicitud");
      }
    } catch (error) {
      alert("Error de conexión al aprobar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("¿Estás seguro de rechazar este gasto?")) return;
    
    setProcessingId(id);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/capital/expense/${id}/reject`, { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      const result = await response.json();

      if (response.ok && result.success) {
        setRequests(prev => prev.filter(r => r.id !== id));
      } else {
         alert(result.message || result.error || "Error al rechazar");
      }
    } catch (error) {
      alert("Error de conexión al rechazar.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 pb-20 relative">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-display">Solicitudes de Gastos</h1>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            Aprueba o rechaza los gastos operativos reportados por los cobradores.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <FiActivity className="text-red-400" />
          <span className="text-sm font-medium text-white">{requests.length} Pendientes</span>
        </div>
      </div>

      {/* Lista de Solicitudes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0B1020]/20 rounded-[32px] border border-white/5">
          <FiLoader className="animate-spin text-red-500 h-10 w-10 mb-4" />
          <p className="text-slate-400">Buscando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
          <FiClock className="mx-auto text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">No hay gastos pendientes por aprobar en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="group bg-[#0B1020]/40 backdrop-blur-md border border-white/10 rounded-[32px] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/[0.05] transition-all shadow-xl hover:border-white/20"
            >
              <div className="flex items-start lg:items-center gap-5">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-600/20 flex items-center justify-center border border-red-500/30">
                  <FiTrendingDown className="text-red-400 text-2xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-display mb-1">{req.description}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                    
                    {/* Monto del Gasto */}
                    <span className="flex items-center gap-1 text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                      <FiDollarSign /> {new Intl.NumberFormat('es-CO').format(Number(req.amount))}
                    </span>
                    
                    {/* Información de la Ruta y Capital */}
                    <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      <FiMapPin /> 
                      Ruta {req.route.id} ({req.route.city}) 
                      <span className="opacity-50">|</span> 
                      Caja: ${new Intl.NumberFormat('es-CO').format(Number(req.route.availableCapital))}
                    </span>

                    <span className="flex items-center gap-1 text-slate-300 italic bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      <FiUser /> {req.requestedBy.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={processingId === req.id}
                  className="flex-1 lg:flex-none px-6 py-3 rounded-xl border border-white/5 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all font-bold uppercase tracking-wider text-[10px] disabled:opacity-50"
                >
                  {processingId === req.id ? <FiLoader className="animate-spin inline" /> : <><FiX className="inline mr-1 text-base -mt-0.5" /> Rechazar</>}
                </button>
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                  className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-[10px] disabled:opacity-50"
                >
                  {processingId === req.id ? <FiLoader className="animate-spin" /> : <><FiCheck className="text-base" /> Aprobar Gasto</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}