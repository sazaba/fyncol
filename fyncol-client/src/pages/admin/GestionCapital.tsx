import { useState, useEffect } from "react";
import { FiPlus, FiMinus, FiAlertCircle } from "react-icons/fi";

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
  
  // Estado para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"invest" | "withdraw">("invest");
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  
  // Estado del formulario
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificación de rol en el frontend
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
      const res = await fetch("http://localhost:3000/api/capital", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setRoutes(data.data);
      } else {
        setError(data.message || "Error al obtener las rutas");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (route: RouteData, type: "invest" | "withdraw") => {
    setSelectedRoute(route);
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint = transactionType === "invest" ? "/api/capital/invest" : "/api/capital/withdraw";
      
      const res = await fetch(`http://localhost:3000${endpoint}`, {
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
        fetchRoutes(); // Recargar datos actualizados
      } else {
        alert(data.message || "Error al procesar la transacción");
      }
    } catch (err) {
      alert("Error de conexión al procesar la transacción");
    } finally {
      setIsSubmitting(false);
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
          <p className="text-sm text-slate-400">Administra la inversión y retiros de cada ruta operativa.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-white">Cargando datos...</div>
      ) : error ? (
        <div className="text-red-400 bg-red-500/10 p-4 rounded-lg">{error}</div>
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
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400">
                        {route.assignedTo.name}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-white">
                    {Number(route.availableCapital).toLocaleString('es-CO')} <span className="text-slate-500 text-xs">{route.currency}</span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button 
                      onClick={() => openModal(route, "invest")}
                      className="flex items-center gap-1 rounded bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <FiPlus size={14} /> Invertir
                    </button>
                    <button 
                      onClick={() => openModal(route, "withdraw")}
                      className="flex items-center gap-1 rounded bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <FiMinus size={14} /> Retirar
                    </button>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No hay rutas creadas en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Inversión/Retiro */}
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
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Monto a {transactionType === "invest" ? "invertir" : "retirar"} ({selectedRoute.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ej: 150000"
                />
                {transactionType === "withdraw" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Disponible máximo: {Number(selectedRoute.availableCapital).toLocaleString('es-CO')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Descripción / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={transactionType === "invest" ? "Ej: Inyección de capital enero" : "Ej: Retiro de utilidades"}
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    transactionType === "invest" 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isSubmitting ? "Procesando..." : "Confirmar Operación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}