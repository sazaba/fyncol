import { useState, useEffect } from 'react';
import { FiCheckCircle, FiLoader, FiMap, FiCalendar, FiUser, FiEye, FiX, FiAlertTriangle, FiClock, FiInfo} from 'react-icons/fi';

const traducirEstado = (status: string) => {
  switch (status) {
    case 'PAID': return 'PAGADO';
    case 'PARTIAL': return 'ABONO PARCIAL';
    case 'OVERDUE': return 'EN MORA';
    case 'RENEGOTIATED': return 'ACUERDO / RENEGOCIADO';
    case 'PENDING': return 'PENDIENTE (NO COBRADO)';
    default: return status;
  }
};

export default function CierresDiarios() {
  const [closures, setClosures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedClosure, setSelectedClosure] = useState<any>(null);
  const [modalTab, setModalTab] = useState<'RESUMEN' | 'DETALLES'>('RESUMEN');
  
  const [closureDetails, setClosureDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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

  const handleOpenTicket = async (closure: any) => {
    setSelectedClosure(closure);
    setModalTab('RESUMEN');
    setClosureDetails([]);
    setIsLoadingDetails(true);

    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/closure/history/${closure.id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClosureDetails(data.data);
      }
    } catch (error) {
      console.error("Error fetching closure details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-10 bg-[#0B0B12] overflow-y-auto h-[calc(100dvh-64px)] md:h-screen text-white">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Cierres Diarios</h1>
          <p className="text-slate-400 text-sm">Historial de las rutas cerradas y auditoría de la gestión de cobradores.</p>
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
                          onClick={() => handleOpenTicket(closure)}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold transition-colors border border-blue-500/20 flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <FiEye /> Auditoría
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

      {/* MODAL: DETALLE DEL CIERRE Y AUDITORÍA */}
      {selectedClosure && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left" onClick={() => setSelectedClosure(null)}>
          <div className="w-full max-w-lg bg-[#05050A] border border-white/10 rounded-[30px] shadow-2xl animate-[slideUp_0.18s_ease-out] flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>
            
            {/* Header del Modal */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                  <FiCheckCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Auditoría de Cierre</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                    {new Date(selectedClosure.closedAt).toLocaleDateString('es-CO')} • {selectedClosure.closedBy?.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedClosure(null)} className="p-2 bg-[#0B0B12] border border-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><FiX size={16} /></button>
            </div>

            {/* Pestañas */}
            <div className="flex border-b border-white/5 bg-[#0B0B12] px-6 shrink-0">
              <button onClick={() => setModalTab('RESUMEN')} className={`py-4 px-2 mr-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${modalTab === 'RESUMEN' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Resumen Financiero</button>
              <button onClick={() => setModalTab('DETALLES')} className={`py-4 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${modalTab === 'DETALLES' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Gestión de Clientes</button>
            </div>

            {/* Contenido Scrollable */}
            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
              
              {/* TAB 1: RESUMEN FINANCIERO */}
              {modalTab === 'RESUMEN' && (
                <div className="animate-[fadeIn_0.2s_ease-out]">

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* Tarjeta Principal: Recaudo */}
                    <div className="bg-[#0B0B12] border border-white/5 p-4 rounded-xl col-span-2 text-center shadow-inner">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Efectivo Entregado (Recaudo)</p>
                      <p className="text-3xl font-bold text-emerald-400">${Math.round(Number(selectedClosure.totalCollected || 0)).toLocaleString('es-CO')}</p>
                    </div>

                    {/* Tarjeta Combinada: Inversiones y Retiros Históricos */}
                    <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl col-span-2 flex justify-between items-center">
                       <div className="text-center w-1/2 border-r border-white/10">
                         <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider mb-1">Inversiones de ese día</p>
                         <p className="text-sm font-bold text-white">+${Math.round(Number(selectedClosure.totalInversiones || 0)).toLocaleString('es-CO')}</p>
                       </div>
                       <div className="text-center w-1/2">
                         <p className="text-[10px] text-red-500/80 font-bold uppercase tracking-wider mb-1">Retiros de ese día</p>
                         <p className="text-sm font-bold text-white">-${Math.round(Number(selectedClosure.totalRetiros || 0)).toLocaleString('es-CO')}</p>
                       </div>
                    </div>

                    {/* Tarjetas Secundarias */}
                    <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Disponible en ruta</p>
                      <p className="text-sm font-bold text-blue-400">${Math.round(Number(selectedClosure.availableCapital || 0)).toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cartera en la calle</p>
                      <p className="text-sm font-bold text-white">${Math.round(Number(selectedClosure.totalPortfolio || 0)).toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas (Nuevos)</p>
                      <p className="text-sm font-bold text-white">${Math.round(Number(selectedClosure.newSales || 0)).toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Renovaciones</p>
                      <p className="text-sm font-bold text-white">${Math.round(Number(selectedClosure.renewals || 0)).toLocaleString('es-CO')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400 font-medium bg-white/5 py-3 rounded-xl border border-white/5">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-0.5">Total Ruta</p>
                      <p className="text-white font-bold">{selectedClosure.totalClients}</p>
                    </div>
                    <div className="border-x border-white/10">
                      <p className="text-[9px] uppercase tracking-wider mb-0.5 text-emerald-400/80">Cobrados</p>
                      <p className="text-emerald-400 font-bold">{selectedClosure.collectedClients}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-0.5 text-red-400/80">Mora / Acuerdos</p>
                      <p className="text-red-400 font-bold">{selectedClosure.overdueClients}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETALLES DE GESTIÓN */}
              {modalTab === 'DETALLES' && (
                <div className="animate-[fadeIn_0.2s_ease-out]">
                  {isLoadingDetails ? (
                    <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <FiLoader className="animate-spin text-blue-500" size={24} />
                      <span className="text-sm">Analizando bitácora...</span>
                    </div>
                  ) : closureDetails.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-sm bg-[#0B0B12] rounded-xl border border-white/5">
                      No hay detalles de clientes para este día.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {closureDetails.map((detail) => {
                        const paid = Math.round(Number(detail.paidAmount || 0));
                        const expected = Math.round(Number(detail.expectedAmount || 0));
                        const isTotalPayoff = paid >= expected && detail.status === 'PAID';

                        return (
                          <div key={detail.id} className={`p-4 rounded-2xl border transition-colors ${detail.status === 'RENEGOTIATED' ? 'bg-orange-500/5 border-orange-500/20' : detail.status === 'OVERDUE' ? 'bg-red-500/5 border-red-500/20' : detail.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/20' : detail.status === 'PARTIAL' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-[#0B0B12] border-white/10'}`}>
                            
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-sm text-white mb-0.5">{detail.clientName}</h4>
                                {isTotalPayoff ? (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                                    <FiCheckCircle size={10}/> Pago / Liquidación Total
                                  </span>
                                ) : (
                                  <span className={`text-[9px] font-bold uppercase tracking-widest ${detail.status === 'RENEGOTIATED' ? 'text-orange-400' : detail.status === 'OVERDUE' ? 'text-red-400' : detail.status === 'PARTIAL' ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {traducirEstado(detail.status)}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`font-bold text-base ${paid > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                  +${paid.toLocaleString('es-CO')}
                                </p>
                                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                                  Esperaba: ${expected.toLocaleString('es-CO')}
                                </p>
                              </div>
                            </div>

                            {/* TEXTO DE AUDITORÍA (Descripción exacta enviada por el Cobrador) */}
                            <div className={`text-[11px] font-medium p-2.5 rounded-lg flex items-start gap-2 border ${detail.status === 'OVERDUE' ? 'bg-red-500/10 border-red-500/20 text-red-300' : detail.status === 'RENEGOTIATED' ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' : isTotalPayoff ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-blue-500/5 border-blue-500/20 text-blue-300'}`}>
                              {detail.status === 'OVERDUE' ? <FiAlertTriangle className="shrink-0 mt-0.5" /> : detail.status === 'RENEGOTIATED' ? <FiClock className="shrink-0 mt-0.5" /> : isTotalPayoff ? <FiCheckCircle className="shrink-0 mt-0.5" /> : <FiInfo className="shrink-0 mt-0.5" />}
                              <span className="leading-relaxed">{detail.observation}</span>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}