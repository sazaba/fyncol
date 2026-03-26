import React, { useState } from 'react';
import { FiSearch, FiLoader, FiCheckCircle, FiAlertTriangle, FiXCircle, FiUser } from 'react-icons/fi';

export default function DatacreditoConsulta() {
  const [documentId, setDocumentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/clients/datacredito/${documentId.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error de consulta");
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para determinar el color y mensaje del semáforo
  const getSemaforo = (fallas: number) => {
    if (fallas === 0) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <FiCheckCircle size={32} />, texto: 'EXCELENTE', desc: 'Cliente sin reportes negativos.' };
    if (fallas >= 1 && fallas <= 3) return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: <FiAlertTriangle size={32} />, texto: 'REGULAR', desc: 'Presenta algunos atrasos leves.' };
    return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <FiXCircle size={32} />, texto: 'ALTO RIESGO', desc: 'Cliente con múltiples reportes de mora.' };
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0B0B12] p-6 rounded-3xl border border-white/5 shadow-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Buró Interno</h2>
        <p className="text-sm text-slate-400 mt-1">Consulta el comportamiento de pago de un cliente.</p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
          <FiSearch size={20} />
        </div>
        <input 
          type="text" 
          value={documentId} 
          onChange={(e) => setDocumentId(e.target.value)} 
          placeholder="Ingrese cédula o ID..." 
          className="w-full bg-[#05050A] border border-white/10 rounded-2xl pl-12 pr-32 py-4 text-white text-lg focus:outline-none focus:border-blue-500 transition-all shadow-inner"
        />
        <button 
          type="submit" 
          disabled={isLoading || !documentId}
          className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {isLoading ? <FiLoader className="animate-spin" size={20} /> : 'Consultar'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center font-medium">
          {error}
        </div>
      )}

      {result && (
        <div className="animate-[slideUp_0.2s_ease-out]">
          {!result.exists ? (
            <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                <FiUser size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cliente Nuevo</h3>
              <p className="text-slate-400">Esta cédula no tiene historial en el sistema. Es apto para su primer crédito.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Nombre del Cliente</p>
                  <p className="text-lg font-bold text-white">{result.data.name}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Celular</p>
                   <p className="text-sm font-medium text-slate-300">{result.data.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Préstamos Activos</p>
                  <p className="text-3xl font-bold text-blue-400">{result.data.prestamosActivos}</p>
                </div>
                <div className="bg-[#05050A] border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Préstamos Cancelados</p>
                  <p className="text-3xl font-bold text-slate-300">{result.data.prestamosCancelados}</p>
                </div>
              </div>

              {(() => {
                const semaforo = getSemaforo(result.data.fallasTotales);
                return (
                  <div className={`mt-4 border ${semaforo.border} ${semaforo.bg} rounded-2xl p-6 flex items-center gap-5`}>
                    <div className={`${semaforo.color}`}>
                      {semaforo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`text-xl font-black ${semaforo.color}`}>{semaforo.texto}</h3>
                        <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-lg text-white">
                          {result.data.fallasTotales} fallas históricas
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
  );
}