import React, { useEffect, useState } from 'react';
import { FiCheck, FiX, FiClock, FiUser, FiDollarSign, FiMapPin, FiActivity, FiEdit3, FiPercent, FiHash } from 'react-icons/fi';

interface LoanRequest {
  id: number;
  amount: number;
  installments: number;
  interestRate: number;
  periodicity: string;
  client: { name: string; documentId: string };
  route: { id: number; city: string; availableCapital: number };
  requestedBy: { name: string };
  createdAt: string;
}

const SolicitudesCredito: React.FC = () => {
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados para el Modal de Ajuste
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, installments: 0, interest: 0 });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/loan-requests/pending');
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (req: LoanRequest) => {
    setSelectedRequest(req);
    setEditForm({
      amount: Number(req.amount),
      installments: req.installments,
      interest: Number(req.interestRate)
    });
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/loan-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustedAmount: editForm.amount,
          adjustedInstallments: editForm.installments,
          adjustedInterestRate: editForm.interest
        })
      });

      const result = await response.json();

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
        setSelectedRequest(null);
      } else {
        alert(result.error || "Error al aprobar");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("¿Estás seguro de rechazar esta solicitud?")) return;
    try {
      const response = await fetch(`/api/loan-requests/${id}/reject`, { method: 'POST' });
      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-white p-8">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Solicitudes de Crédito</h1>
          <p className="text-gray-500 mt-2 text-sm font-light">
            Aprobación manual para créditos que superan el tope de ruta.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <FiActivity className="text-blue-500" />
          <span className="text-sm font-medium">{requests.length} Pendientes</span>
        </div>
      </div>

      <hr className="border-white/5 mb-10" />

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
          <FiClock className="mx-auto text-4xl text-gray-700 mb-4" />
          <p className="text-gray-500">No hay solicitudes pendientes en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="group bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <FiUser className="text-blue-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{req.client.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                      <FiDollarSign /> {new Intl.NumberFormat().format(req.amount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMapPin /> {req.route.city}
                    </span>
                    <span className="italic text-gray-600">Por: {req.requestedBy.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleReject(req.id)}
                  className="px-5 py-2.5 rounded-xl border border-white/5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all font-medium"
                >
                  <FiX className="inline mr-2" /> Rechazar
                </button>
                <button
                  onClick={() => handleOpenModal(req)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all flex items-center gap-2"
                >
                  <FiEdit3 /> Revisar y Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Ajuste (Glassmorphism) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0A0A0F] border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-1 text-white">Ajustar Crédito</h2>
            <p className="text-gray-500 text-sm mb-8">Revisión para {selectedRequest.client.name}</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Monto a Aprobar</label>
                <div className="relative">
                  <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="number" 
                    value={editForm.amount} 
                    onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-mono text-emerald-400 text-xl" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Cuotas</label>
                  <div className="relative">
                    <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" 
                      value={editForm.installments} 
                      onChange={e => setEditForm({...editForm, installments: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-mono" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Interés %</label>
                  <div className="relative">
                    <FiPercent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" 
                      value={editForm.interest} 
                      onChange={e => setEditForm({...editForm, interest: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-mono" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-10">
              <button 
                onClick={handleConfirmApprove} 
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" /> : <><FiCheck /> Confirmar Aprobación</>}
              </button>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="w-full py-4 rounded-2xl text-gray-500 hover:text-white transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudesCredito;