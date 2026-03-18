import React, { useState, useEffect } from 'react';
import { 
  FiMap, FiDollarSign, FiMapPin, 
  FiCheckCircle, FiSearch, FiAlertTriangle, FiX, FiLoader 
} from 'react-icons/fi';

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

export default function CarteraActiva() {
  const [clients, setClients] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [alertState, setAlertState] = useState<PremiumAlertState>({
    open: false, variant: "info", title: "", message: "",
    confirmText: "Confirmar", cancelText: "", onConfirm: null,
  });

  const openAlert = (payload: Partial<PremiumAlertState>) => {
    setAlertState((prev) => ({ ...prev, open: true, ...payload }));
  };

  const closeAlert = () => setAlertState((prev) => ({ ...prev, open: false, onConfirm: null }));

  useEffect(() => {
    document.body.style.overflow = (alertState.open || showPaymentModal) ? "hidden" : "auto";
  }, [alertState.open, showPaymentModal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (alertState.open) closeAlert();
        if (showPaymentModal) setShowPaymentModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alertState.open, showPaymentModal]);

  const fetchCartera = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/clients/cartera`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setRouteInfo(data.route);
        setClients(data.clients);
      } else {
        openAlert({ variant: "danger", title: "Error", message: data.error || "No se pudo cargar la cartera." });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error de conexión", message: "Verifica tu internet o el servidor." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCartera();
  }, []);

  const handleOpenPayment = (client: any, loan: any) => {
    setSelectedLoan({ ...loan, clientName: client.name });
    setPaymentAmount("");
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsProcessingPayment(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${baseUrl}/api/clients/pago`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ loanId: selectedLoan.id, amount: paymentAmount })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowPaymentModal(false);
        const isFinished = data.data.isFullyPaid;
        
        openAlert({
          variant: "success",
          title: isFinished ? "¡Crédito Cancelado!" : "Abono Registrado",
          message: isFinished 
            ? "El cliente ha terminado de pagar este crédito. El capital retornó a la ruta." 
            : `Se registró el abono de $${parseFloat(paymentAmount).toLocaleString('es-CO')} correctamente.`,
          confirmText: "Listo",
          onConfirm: () => {
            closeAlert();
            fetchCartera(); // Recargamos para actualizar las barras de progreso
          }
        });
      } else {
        throw new Error(data.error || "Error al procesar el pago");
      }
    } catch (error: any) {
      openAlert({ variant: "danger", title: "Error", message: error.message });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 md:h-[calc(100dvh-90px)] md:overflow-y-auto md:[&::-webkit-scrollbar]:hidden md:[-ms-overflow-style:none] md:[scrollbar-width:none] pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Recaudos</h1>
          <p className="text-sm text-slate-400 mt-1">Gestiona y registra los abonos de tus clientes activos.</p>
        </div>

        {routeInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
            <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <FiMap size={14} />
                <span className="text-[10px] font-bold tracking-widest uppercase">Mi Ruta</span>
              </div>
              <p className="text-sm font-semibold text-white">{routeInfo.city}, {routeInfo.country}</p>
            </div>
            
            <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center border-b-2 border-b-green-500/50 shadow-[0_4px_20px_-10px_rgba(34,197,94,0.3)]">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <FiDollarSign size={14} />
                <span className="text-[10px] font-bold tracking-widest uppercase text-green-400/80">Capital Actual</span>
              </div>
              <p className="text-lg font-bold text-white">${Number(routeInfo.availableCapital).toLocaleString('es-CO')}</p>
            </div>
          </div>
        )}
      </div>

      {/* BUSCADOR */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
          <FiSearch size={18} />
        </div>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0B0B12]/80 border border-white/5 rounded-2xl pl-11 pr-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner" 
          placeholder="Buscar cliente por nombre..." 
        />
      </div>

      {/* LISTADO DE CLIENTES */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <FiLoader className="animate-spin text-blue-500 mb-4" size={32} />
          <p>Cargando cartera activa...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-[#0B0B12]/50 border border-white/5 rounded-3xl p-12 text-center">
          <p className="text-slate-400">No hay clientes activos en esta ruta o no coinciden con la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const loan = client.loans[0]; 
            if (!loan) return null;

            const totalPaid = loan.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            const totalProjected = Number(loan.projectedTotal);
            const balance = totalProjected - totalPaid;
            const progress = Math.min(100, Math.max(0, Math.round((totalPaid / totalProjected) * 100)));

            return (
              <div key={client.id} className="bg-[#0B0B12]/80 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-colors rounded-3xl p-6 flex flex-col shadow-xl">
                <div className="flex items-start gap-4 mb-5">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl font-bold uppercase">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base truncate">{client.name}</h3>
                    <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 truncate">
                      <FiMapPin size={12} className="shrink-0 text-slate-500" /> {client.address}
                    </p>
                  </div>
                </div>

                <div className="bg-[#05050A]/50 rounded-2xl p-4 border border-white/5 space-y-3 flex-1 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Total a Pagar</span>
                    <span className="text-sm font-bold text-white">${totalProjected.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-semibold">Recaudado</span>
                    <span className="text-sm font-bold text-emerald-400">${totalPaid.toLocaleString('es-CO')}</span>
                  </div>
                  
                  <div className="pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[10px] font-bold mb-2">
                      <span className="text-blue-400">{progress}%</span>
                      <span className="text-red-400/90">Saldo: ${balance.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleOpenPayment(client, loan)}
                  className="w-full py-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-600 active:scale-[0.98] text-blue-400 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <FiDollarSign size={16} />
                  Ingresar Abono
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL REGISTRAR ABONO */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}>
          <div className="w-full max-w-sm bg-[#0B0B12] border border-white/10 rounded-[30px] shadow-2xl p-6 md:p-8 animate-[slideUp_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Registrar Abono</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><FiX size={20} /></button>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Cliente</p>
              <p className="text-white font-semibold truncate">{selectedLoan.clientName}</p>
            </div>

            <form onSubmit={handleProcessPayment}>
              <label className="block text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">Monto Recibido</label>
              <div className="relative mb-8">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">$</span>
                <input 
                  autoFocus
                  required 
                  type="number" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-[#05050A]/80 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-xl text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 shadow-inner" 
                  placeholder="0" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isProcessingPayment}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {isProcessingPayment ? <FiLoader className="animate-spin" size={20} /> : <><FiCheckCircle size={20} /> Confirmar Abono</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ALERTA PREMIUM */}
      {alertState.open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-[520px] rounded-3xl border border-white/10 bg-[#05050A]/90 shadow-2xl overflow-hidden animate-[slideUp_0.18s_ease-out]">
            <div className="p-6 md:p-7 flex items-start gap-4">
              <div className={`shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center border ${alertState.variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-300" : alertState.variant === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-blue-500/10 border-blue-500/20 text-blue-300"}`}>
                <FiAlertTriangle size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{alertState.title}</h3>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">{alertState.message}</p>
              </div>
              <button onClick={closeAlert} className="text-slate-500 hover:text-white p-2 -m-2"><FiX size={18} /></button>
            </div>
            <div className="px-6 md:px-7 pb-6 flex gap-3 justify-end">
              {alertState.cancelText && <button onClick={closeAlert} className="px-4 py-2.5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium">{alertState.cancelText}</button>}
              <button onClick={() => { if (alertState.onConfirm) alertState.onConfirm(); else closeAlert(); }} className={`px-5 py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.98] ${alertState.variant === "danger" ? "bg-red-600 text-white" : alertState.variant === "success" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                {alertState.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}