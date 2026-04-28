import React, { useState } from 'react';
import { FiSearch, FiLoader, FiCheckCircle, FiAlertTriangle, FiXCircle, FiUser, FiThumbsUp } from 'react-icons/fi';

interface BuroResult {
  exists: boolean;
  data?: {
    name: string;
    prestamosActivos: number;
    prestamosCancelados: number;
    fallasTotales: number;
  };
}

export default function DatacreditoConsulta() {
  const [documentId, setDocumentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BuroResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = documentId.trim();
    if (!cleanId) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/clients/datacredito/${encodeURIComponent(cleanId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error de consulta. Verifique la conexión.");
      
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // === LÓGICA DE CALIFICACIÓN ===
  const getSemaforo = (fallas: number) => {
    if (fallas === 0) {
      return { 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20', 
        icon: <FiCheckCircle size={32} className="shrink-0" />, 
        texto: 'EXCELENTE', 
        desc: 'Cliente impecable sin reportes negativos.' 
      };
    }
    if (fallas >= 1 && fallas <= 6) {
      return { 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20', 
        icon: <FiThumbsUp size={32} className="shrink-0" />, 
        texto: 'BUENA', 
        desc: 'Cliente confiable con retrasos mínimos.' 
      };
    }
    if (fallas >= 7 && fallas <= 12) {
      return { 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/10', 
        border: 'border-yellow-500/20', 
        icon: <FiAlertTriangle size={32} className="shrink-0" />, 
        texto: 'REGULAR', 
        desc: 'Atención: Presenta moras frecuentes.' 
      };
    }
    return { 
      color: 'text-red-400', 
      bg: 'bg-red-500/10', 
      border: 'border-red-500/20', 
      icon: <FiXCircle size={32} className="shrink-0" />, 
      texto: 'ALTO RIESGO', 
      desc: 'No recomendado. Múltiples fallas de pago.' 
    };
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] w-full bg-[#0B0B12] p-4 sm:p-6 lg:p-10 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-[#05050A] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/5 shadow-2xl mt-4 sm:mt-10 transition-all">
        
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Buró Interno</h2>
          <p className="text-sm sm:text-base text-slate-400">Historial de comportamiento de pago basado en cuotas.</p>
        </div>

        {/* Buscador Responsive */}
        <form onSubmit={handleSearch} className="mb-8 flex flex-col sm:relative gap-3 sm:gap-0">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <FiSearch size={20} />
            </div>
            <input 
              type="text" 
              value={documentId} 
              onChange={(e) => setDocumentId(e.target.value)} 
              placeholder="Ingrese cédula o ID..." 
              className="w-full bg-[#0B0B12] border border-white/10 rounded-xl sm:rounded-2xl pl-12 pr-4 sm:pr-36 py-3 sm:py-4 text-white text-base sm:text-lg focus:outline-none focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || !documentId}
            className="w-full sm:w-auto sm:absolute sm:right-2 sm:top-2 sm:bottom-2 px-6 py-3 sm:py-0 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center shadow-lg"
          >
            {isLoading ? <FiLoader className="animate-spin" size={20} /> : 'Consultar'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl text-red-400 text-sm sm:text-base text-center font-medium mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="animate-[slideUp_0.2s_ease-out]">
            {!result.exists || !result.data ? (
              <div className="p-6 sm:p-8 bg-blue-500/5 border border-blue-500/10 rounded-xl sm:rounded-2xl text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                  <FiUser size={28} className="sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Cliente Nuevo</h3>
                <p className="text-sm sm:text-base text-slate-400">Sin historial registrado. Apto para primer crédito.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cabecera del Cliente */}
                <div className="bg-[#0B0B12] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 shadow-sm">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Nombre</p>
                    <p className="text-base sm:text-lg font-bold text-white">{result.data.name}</p>
                  </div>
                  <div className="sm:text-right w-full sm:w-auto border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Cédula Consultada</p>
                    <p className="text-sm font-medium text-slate-300">{documentId}</p>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-[#0B0B12] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center flex flex-row sm:flex-col items-center justify-between sm:justify-center">
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest sm:mb-2">Créditos Activos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-400">{result.data.prestamosActivos}</p>
                  </div>
                  <div className="bg-[#0B0B12] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center flex flex-row sm:flex-col items-center justify-between sm:justify-center">
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest sm:mb-2">Créditos Finalizados</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-300">{result.data.prestamosCancelados}</p>
                  </div>
                </div>

                {/* Semáforo */}
                {(() => {
                  const semaforo = getSemaforo(result.data.fallasTotales);
                  return (
                    <div className={`mt-4 border ${semaforo.border} ${semaforo.bg} rounded-xl sm:rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 transition-all`}>
                      <div className={`${semaforo.color}`}>
                        {semaforo.icon}
                      </div>
                      <div className="w-full">
                        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                          <h3 className={`text-lg sm:text-xl font-black ${semaforo.color}`}>{semaforo.texto}</h3>
                          <span className="text-xs font-bold bg-white/10 px-3 py-1.5 sm:px-2 sm:py-1 rounded-lg text-white">
                            {result.data.fallasTotales} moras registradas
                          </span>
                        </div>
                        <p className={`text-sm ${semaforo.color} opacity-80 font-medium`}>{semaforo.desc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}