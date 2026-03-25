import { useState, useEffect } from 'react';
import { FiCheckCircle, FiLoader, FiMap, FiCalendar, FiUser, FiEye, FiX } from 'react-icons/fi';

export default function CierresDiarios() {
  const [closures, setClosures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClosure, setSelectedClosure] = useState<any>(null);

  useEffect(() => {
    const fetchClosures = async () => {
      try {
        const token = localStorage.getItem("token");
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/closure/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setClosures(data.data);
        }
      } catch (error) {
        console.error("Error fetching closures");
      } finally {
        setIsLoading(false);
      }
    };
    fetchClosures();
  }, []);

  return (
    <div className="flex-1 p-6 lg:p-10 bg-[#0B0B12] overflow-y-auto h-[calc(100dvh-64px)] md:h-screen text-white">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Cierres Diarios</h1>
          <p className="text-slate-400 text-sm">Historial de las rutas cerradas y el dinero reportado por los cobradores.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FiLoader className="animate-spin text-blue-500 mb-4" size={32} />
            <p>Cargando registros...</p>
          </div>
        ) : closures.length === 0 ? (
          <div className="bg-[#05050A] border border-white/5 rounded-2xl p-10 text-center">
            <p className="text-slate-400">No hay cierres de caja registrados en el sistema.</p>
          </div>
        ) : (
          <div className="bg-[#05050A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400">
                    <th className="p-4 font-semibold">Fecha / Hora</th>
                    <th className="p-4 font-semibold">Cobrador</th>
                    <th className="p-4 font-semibold">Ruta</th>
                    <th className="p-4 font-semibold text-right">Efectivo Entregado</th>
                    <th className="p-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {closures.map((closure) => (
                    <tr key={closure.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-slate-500" />
                          <div>
                            <p className="font-semibold text-white">{new Date(closure.closedAt).toLocaleDateString('es-CO')}</p>
                            <p className="text-xs text-slate-400">{new Date(closure.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center font-bold text-xs">
                            {closure.closedBy?.name?.charAt(0).toUpperCase() || <FiUser />}
                          </div>
                          <span className="font-medium">{closure.closedBy?.name || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <FiMap className="text-slate-500" /> {closure.route?.city || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400">
                        ${Math.round(Number(closure.totalCollected) || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setSelectedClosure(closure)}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold transition-colors border border-blue-500/20 flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <FiEye /> Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: DETALLE DEL CIERRE (Mismo diseño del recibo del cobrador) */}
      {selectedClosure && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left" onClick={() => setSelectedClosure(null)}>
          <div className="w-full max-w-md bg-[#05050A] border border-white/10 rounded-3xl p-7 shadow-2xl animate-[slideUp_0.18s_ease-out]" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <FiCheckCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Ticket de Cierre</h3>
                  <p className="text-xs text-slate-400">{new Date(selectedClosure.closedAt).toLocaleString('es-CO')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClosure(null)} className="p-2 bg-[#0B0B12] border border-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><FiX size={16} /></button>
            </div>

            <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Cobrador</p>
                <p className="text-sm font-semibold text-white">{selectedClosure.closedBy?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Ruta</p>
                <p className="text-sm font-semibold text-white">{selectedClosure.route?.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl col-span-2 text-center shadow-inner">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Efectivo Entregado (Recaudo)</p>
                <p className="text-3xl font-bold text-emerald-400">${Math.round(Number(selectedClosure.totalCollected)).toLocaleString('es-CO')}</p>
              </div>

              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Disponible en ruta</p>
                <p className="text-sm font-bold text-blue-400">${Math.round(Number(selectedClosure.availableCapital)).toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cartera en la calle</p>
                <p className="text-sm font-bold text-white">${Math.round(Number(selectedClosure.totalPortfolio)).toLocaleString('es-CO')}</p>
              </div>
              
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas (Nuevos)</p>
                <p className="text-sm font-bold text-white">${Math.round(Number(selectedClosure.newSales)).toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Renovaciones</p>
                <p className="text-sm font-bold text-white">${Math.round(Number(selectedClosure.renewals)).toLocaleString('es-CO')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400 font-medium bg-white/5 py-3 rounded-xl">
              <div>
                <p className="text-[9px] uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-white font-bold">{selectedClosure.totalClients}</p>
              </div>
              <div className="border-x border-white/10">
                <p className="text-[9px] uppercase tracking-wider mb-0.5 text-emerald-400/80">Cobrados</p>
                <p className="text-emerald-400 font-bold">{selectedClosure.collectedClients}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider mb-0.5 text-red-400/80">Mora</p>
                <p className="text-red-400 font-bold">{selectedClosure.overdueClients}</p>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}