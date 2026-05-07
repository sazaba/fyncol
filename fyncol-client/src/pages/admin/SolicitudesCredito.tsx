import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiClock, FiUser, FiDollarSign, FiMapPin, FiActivity, FiEdit3, FiPercent, FiHash, FiLoader, FiAlertCircle, FiAlertTriangle } from 'react-icons/fi';

interface LoanRequest {
  id: number;
  amount: number;
  installments: number;
  interestRate: number;
  periodicity: string;
  client: { name: string; documentId: string };
  route: { id: number; city: string; availableCapital: number | string; maxLoanPerClient: number | string };
  requestedBy: { name: string };
  createdAt: string;
}

// --- TIPOS PARA LA ALERTA PREMIUM ---
type AlertVariant = "info" | "success" | "danger";

type PremiumAlertState = {
  open: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (() => void) | null;
};

export default function SolicitudesCredito() {
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", installments: "", interest: "" });

  // ESTADO DE LA ALERTA PREMIUM
  const [alertState, setAlertState] = useState<PremiumAlertState>({ open: false, variant: "info", title: "", message: "" });

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

  const openAlert = (payload: Partial<PremiumAlertState>) => setAlertState((prev) => ({ ...prev, open: true, ...payload }));
  const closeAlert = () => setAlertState((prev) => ({ ...prev, open: false, onConfirm: null }));

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/loan-requests/pending`, {
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
      console.error("Error al cargar solicitudes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (req: LoanRequest) => {
    setSelectedRequest(req);
    setEditForm({
      amount: String(Number(req.amount)),
      installments: String(Number(req.installments)),
      interest: String(Number(req.interestRate))
    });
  };

  const handleNumberChange = (field: string, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    setEditForm({ ...editForm, [field]: cleanValue });
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/loan-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adjustedAmount: editForm.amount ? Number(editForm.amount) : 0,
          adjustedInstallments: editForm.installments ? Number(editForm.installments) : 0,
          adjustedInterestRate: editForm.interest ? Number(editForm.interest) : 0
        })
      });

      const result = await response.json();

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
        setSelectedRequest(null);
        openAlert({ variant: "success", title: "Aprobado", message: "El crédito ha sido aprobado y creado con éxito." });
      } else {
        openAlert({ variant: "danger", title: "Error de Aprobación", message: result.error || "Ocurrió un error al procesar el crédito en la base de datos." });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error de Red", message: "No se pudo conectar con el servidor." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reemplazo del window.confirm por la alerta premium
  const handleReject = (id: number) => {
    openAlert({
      variant: "danger",
      title: "Rechazar Solicitud",
      message: "¿Estás seguro de que deseas rechazar y eliminar esta solicitud de crédito?",
      confirmText: "Sí, Rechazar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        closeAlert();
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_URL}/loan-requests/${id}/reject`, { 
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            }
          });
          
          if (response.ok) {
            setRequests(prev => prev.filter(r => r.id !== id));
            openAlert({ variant: "success", title: "Rechazado", message: "La solicitud fue rechazada correctamente." });
          } else {
            const result = await response.json();
            openAlert({ variant: "danger", title: "Error", message: result.error || "Error al rechazar" });
          }
        } catch (error) {
          openAlert({ variant: "danger", title: "Error", message: "Error de conexión." });
        }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 pb-20 relative">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-display">Solicitudes de Crédito</h1>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            Aprobación manual para créditos que superan el tope de ruta.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <FiActivity className="text-blue-500" />
          <span className="text-sm font-medium text-white">{requests.length} Pendientes</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0B1020]/20 rounded-[32px] border border-white/5">
          <FiLoader className="animate-spin text-blue-500 h-10 w-10 mb-4" />
          <p className="text-slate-400">Buscando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
          <FiClock className="mx-auto text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">No hay solicitudes pendientes en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="group bg-[#0B1020]/40 backdrop-blur-md border border-white/10 rounded-[32px] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/[0.05] transition-all shadow-xl hover:border-white/20">
              <div className="flex items-start lg:items-center gap-5">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center border border-blue-500/30">
                  <FiUser className="text-blue-400 text-2xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-display mb-1">{req.client.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <FiDollarSign /> {new Intl.NumberFormat('es-CO').format(req.amount)}
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      <FiMapPin /> 
                      Ruta {req.route.id} ({req.route.city}) 
                      <span className="opacity-50">|</span> 
                      Tope: ${new Intl.NumberFormat('es-CO').format(Number(req.route.maxLoanPerClient))}
                    </span>
                    <span className="italic bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      Cobrador: {req.requestedBy.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                <button onClick={() => handleReject(req.id)} className="flex-1 lg:flex-none px-6 py-3 rounded-xl border border-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold uppercase tracking-wider text-[10px]">
                  <FiX className="inline mr-1 text-base -mt-0.5" /> Rechazar
                </button>
                <button onClick={() => handleOpenModal(req)} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-[10px]">
                  <FiEdit3 className="text-base" /> Aprobar / Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="bg-[#05050A] border border-white/10 w-full max-w-md rounded-[40px] p-8 shadow-2xl relative animate-[slideUp_0.2s_ease-out]">
            <button onClick={() => setSelectedRequest(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
              <FiX size={24} />
            </button>
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FiAlertCircle className="text-blue-500" /> Ajustar Crédito
              </h2>
              <p className="text-slate-400 text-sm mt-1">Revisión para <strong className="text-white">{selectedRequest.client.name}</strong></p>
            </div>

            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-2">
                <p className="text-xs text-amber-400 font-medium">
                  El cobrador solicitó <strong>${new Intl.NumberFormat('es-CO').format(selectedRequest.amount)}</strong>. Límite de Ruta {selectedRequest.route.id}: <strong>${new Intl.NumberFormat('es-CO').format(Number(selectedRequest.route.maxLoanPerClient))}</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Monto Final a Aprobar</label>
                <div className="relative">
                  <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={editForm.amount ? new Intl.NumberFormat('es-CO').format(Number(editForm.amount)) : ""} 
                    onChange={e => handleNumberChange("amount", e.target.value)}
                    className="w-full bg-[#0B1020]/50 border border-blue-500/30 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-mono text-blue-400 text-xl font-bold shadow-[inset_0_0_15px_rgba(37,99,235,0.1)]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Cuotas</label>
                  <div className="relative">
                    <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={editForm.installments} 
                      onChange={e => handleNumberChange("installments", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-mono text-white" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Interés %</label>
                  <div className="relative">
                    <FiPercent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={editForm.interest} 
                      onChange={e => handleNumberChange("interest", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-mono text-white" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setSelectedRequest(null)} className="w-1/3 py-4 rounded-2xl border border-white/10 text-slate-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[10px]">
                Cancelar
              </button>
              <button onClick={handleConfirmApprove} disabled={isProcessing || !editForm.amount || Number(editForm.amount) <= 0} className="w-2/3 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] disabled:opacity-50">
                {isProcessing ? <FiLoader className="animate-spin h-5 w-5" /> : <><FiCheck size={16} /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA PREMIUM INCRUSTADA */}
      {alertState.open && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-[440px] rounded-[40px] border border-white/10 bg-[#05050A] shadow-2xl overflow-hidden p-10 animate-[slideUp_0.2s_ease-out]">
            <div className={`h-16 w-16 rounded-3xl flex items-center justify-center mb-6 border ${alertState.variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-400" : alertState.variant === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
              <FiAlertTriangle size={32} />
            </div>
            <h3 className="text-white font-bold text-xl font-display">{alertState.title}</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{alertState.message}</p>
            <div className="mt-8 flex gap-3 justify-end">
              {alertState.cancelText && (
                <button onClick={closeAlert} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">
                  {alertState.cancelText}
                </button>
              )}
              <button onClick={() => alertState.onConfirm ? alertState.onConfirm() : closeAlert()} className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg ${alertState.variant === "danger" ? "bg-red-600 text-white shadow-red-600/20" : alertState.variant === "success" ? "bg-emerald-600 text-white shadow-emerald-600/20" : "bg-blue-600 text-white shadow-blue-600/20"}`}>
                {alertState.confirmText || "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}