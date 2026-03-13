import { useState, useEffect } from "react";
import { FiPlus, FiMinus, FiAlertCircle, FiLoader } from "react-icons/fi";

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

  // --- LÓGICA DE URL ALINEADA A PRODUCCIÓN ---
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
    console.log("DEBUG: Intentando fetch a:", `${API_URL}/capital`);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/capital`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("DEBUG: Status Respuesta:", res.status);
      const data = await res.json();
      
      if (data.success) {
        setRoutes(data.data);
      } else {
        setError(data.message || "Error al obtener las rutas");
      }
    } catch (err: any) {
      console.error("DEBUG: Error de conexión:", err);
      setError(`Error de conexión: ${err.message}. Revisa la consola.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);
    const endpoint = transactionType === "invest" ? "/capital/invest" : "/capital/withdraw";
    console.log("DEBUG: Enviando POST a:", `${API_URL}${endpoint}`);

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

  const openModal = (route: RouteData, type: "invest" | "withdraw") => {
    setSelectedRoute(route);
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setIsModalOpen(true);
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
          <p className="text-sm text-slate-400">Administra la inversión y retiros de cada ruta operativa.</p>
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
                      onClick={() => openModal(route, "invest")}
                      className="flex items-center gap-1 rounded bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20"
                    >
                      <FiPlus size={14} /> Invertir
                    </button>
                    <button 
                      onClick={() => openModal(route, "withdraw")}
                      className="flex items-center gap-1 rounded bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                    >
                      <FiMinus size={14} /> Retirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL (Mismo código de antes) */}
      {isModalOpen && selectedRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0A0F] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {transactionType === "invest" ? "Asignar Inversión" : "Retirar Dinero"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Ruta: <span className="text-white">{selectedRoute.city} ({selectedRoute.currency})</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Monto ({selectedRoute.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descripción</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-sm font-bold text-white ${transactionType === "invest" ? "bg-blue-600" : "bg-red-600"}`}
                >
                  {isSubmitting ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}