import  { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, FiMapPin, FiCheckCircle, FiSearch, 
  FiAlertTriangle, FiX, FiLoader, FiNavigation, FiCalendar, FiFilter, FiSlash 
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- CONFIGURACIÓN DE ICONOS PARA EL MAPA (Evita errores de carga de imagen) ---
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para centrar el mapa cuando cambian los filtros
function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (coords[0] !== 0 && coords[1] !== 0) {
      map.flyTo(coords, 14, { animate: true, duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

// TIPOS
type AlertVariant = "info" | "success" | "danger";

interface PremiumAlertState {
  open: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: (() => void) | null;
}

export default function CarteraActiva() {
  const [clients, setClients] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'TODOS' | 'HOY' | 'PENDIENTES'>('HOY');
  
  // Estados de gestión
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  const [isUpdating, setIsUpdating] = useState(false);
  const [manualPayModal, setManualPayModal] = useState<{open: boolean, inst: any}>({ open: false, inst: null });
  const [manualAmount, setManualAmount] = useState("");

  const [alertState, setAlertState] = useState<PremiumAlertState>({
    open: false, variant: "info", title: "", message: "", confirmText: "Entendido", onConfirm: null,
  });

  const openAlert = (payload: Partial<PremiumAlertState>) => setAlertState(prev => ({ ...prev, open: true, ...payload }));
  const closeAlert = () => setAlertState(prev => ({ ...prev, open: false, onConfirm: null }));

  // Bloquear scroll
  useEffect(() => {
    document.body.style.overflow = (alertState.open || selectedClient || manualPayModal.open) ? "hidden" : "auto";
  }, [alertState.open, selectedClient, manualPayModal.open]);

  // FETCH DATA
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
        openAlert({ variant: "danger", title: "Error", message: data.error || "No se pudo cargar la información." });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error de red", message: "No hay conexión con el servidor." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCartera(); }, []);

  // FILTRADO Y RUTA
  const filteredData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return clients.filter(client => {
      const loan = client.loans[0];
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const cuotaHoy = loan?.installmentDetails?.find((i: any) => i.dueDate.startsWith(todayStr));
      if (filter === 'HOY') return !!cuotaHoy;
      if (filter === 'PENDIENTES') return cuotaHoy?.status === 'PENDING';
      return true;
    });
  }, [clients, searchTerm, filter]);

  // Generar línea de ruta
  const routePath = useMemo(() => {
    return filteredData
      .filter(c => c.latitude && c.longitude)
      .map(c => [c.latitude, c.longitude] as [number, number]);
  }, [filteredData]);

  // HANDLERS DE PAGO
  const handleUpdateStatus = async (instId: number, status: string, amount: number) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/clients/installment/${instId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, paidAmount: amount })
      });

      if (res.ok) {
        setManualPayModal({ open: false, inst: null });
        setManualAmount("");
        fetchCartera();
        if (selectedClient) {
          // Actualizar datos del modal si está abierto
          const updatedRes = await fetch(`${baseUrl}/api/clients/cartera`, { headers: { 'Authorization': `Bearer ${token}` } });
          const updatedData = await updatedRes.json();
          const updatedClient = updatedData.clients.find((c: any) => c.id === selectedClient.id);
          setSelectedClient(updatedClient);
        }
        openAlert({ variant: "success", title: "Operación Exitosa", message: "El registro se actualizó correctamente." });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error", message: "No se pudo actualizar el estado." });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20 space-y-6 md:h-[calc(100dvh-90px)] md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter italic">SISTEMA DE RECAUDO</h1>
          <p className="text-sm text-slate-500 font-medium">Gestión logística de cartera y trazado de rutas GPS.</p>
        </div>

        {routeInfo && (
          <div className="flex flex-wrap gap-4 w-full xl:w-auto">
            <div className="bg-[#0B0B12] border border-white/5 rounded-3xl p-4 flex-1 xl:flex-none xl:min-w-[200px] shadow-xl">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Ruta Activa</span>
              <p className="text-sm font-bold text-white truncate">{routeInfo.city}, {routeInfo.country}</p>
            </div>
            <div className="bg-[#0B0B12] border border-emerald-500/20 rounded-3xl p-4 flex-1 xl:flex-none xl:min-w-[200px] shadow-[0_0_20px_rgba(16,185,129,0.05)]">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Capital Disponible</span>
              <p className="text-xl font-black text-white">${Number(routeInfo.availableCapital).toLocaleString('es-CO')}</p>
            </div>
          </div>
        )}
      </div>

      {/* 1. MAPA PROFESIONAL */}
      <div className="h-[380px] md:h-[480px] w-full rounded-[45px] overflow-hidden border border-white/5 shadow-2xl relative z-10">
        <MapContainer 
          center={[6.2442, -75.5812]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          
          <Polyline 
            positions={routePath} 
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.5, dashArray: '12, 12' }} 
          />

          {filteredData.map(client => {
            const todayStr = new Date().toISOString().split('T')[0];
            const hasPaidToday = client.loans[0]?.installmentDetails?.some((i: any) => 
              i.dueDate.startsWith(todayStr) && i.status === 'PAID'
            );
            
            return client.latitude && (
              <Marker 
                key={client.id} 
                position={[client.latitude, client.longitude]} 
                icon={hasPaidToday ? greenIcon : redIcon}
              >
                <Popup className="custom-popup">
                  <div className="p-3 text-slate-800">
                    <p className="font-black text-sm mb-1">{client.name}</p>
                    <p className="text-[10px] leading-tight text-slate-500 mb-3">{client.address}</p>
                    <button 
                      onClick={() => setSelectedClient(client)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-2 rounded-xl font-black transition-all"
                    >
                      GESTIONAR CLIENTE
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {filteredData[0]?.latitude && <RecenterMap coords={[filteredData[0].latitude, filteredData[0].longitude]} />}
        </MapContainer>
      </div>

      {/* 2. FILTROS Y BUSCADOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 relative">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar cliente en ruta..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B0B12] border border-white/5 rounded-[24px] pl-12 pr-6 py-4.5 text-sm text-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-600"
          />
        </div>

        <div className="lg:col-span-7 flex bg-[#0B0B12] p-1.5 rounded-[24px] border border-white/5">
          {[
            { id: 'HOY', label: 'Mi Ruta de Hoy', icon: <FiNavigation /> },
            { id: 'PENDIENTES', label: 'Sin Cobrar', icon: <FiAlertTriangle /> },
            { id: 'TODOS', label: 'Toda la Cartera', icon: <FiFilter /> }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-tighter transition-all ${filter === btn.id ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              {btn.icon} <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. TARJETAS DE CARTERA */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center text-slate-600 italic">
            <FiLoader className="animate-spin mb-4" size={48} />
            <p className="text-lg font-bold">Sincronizando con la nube...</p>
          </div>
        ) : filteredData.map(client => {
          const loan = client.loans[0];
          const todayStr = new Date().toISOString().split('T')[0];
          const cuotaHoy = loan?.installmentDetails?.find((i: any) => i.dueDate.startsWith(todayStr));

          return (
            <div key={client.id} className="bg-[#0B0B12]/90 backdrop-blur-md border border-white/5 rounded-[45px] p-7 space-y-6 hover:border-blue-600/40 transition-all group relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-black text-2xl shadow-2xl group-hover:scale-105 transition-transform">
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-black text-lg truncate pr-2 tracking-tight">{client.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                      <FiMapPin size={12} className="shrink-0 text-blue-500" />
                      <p className="text-[10px] uppercase font-black tracking-tighter truncate">{client.address}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClient(client)}
                  className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 transition-all active:scale-90"
                >
                  <FiCalendar size={22} />
                </button>
              </div>

              {cuotaHoy ? (
                <div className={`p-6 rounded-[35px] border ${cuotaHoy.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cuota #{cuotaHoy.installmentNumber} de Hoy</span>
                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest ${cuotaHoy.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {cuotaHoy.status === 'PAID' ? 'LIQUIDADO' : 'PENDIENTE'}
                    </div>
                  </div>
                  <p className="text-4xl font-black text-white mb-6 tracking-tighter">${Number(cuotaHoy.expectedAmount).toLocaleString('es-CO')}</p>
                  
                  {cuotaHoy.status === 'PENDING' && (
                    <div className="grid grid-cols-4 gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(cuotaHoy.id, 'PAID', Number(cuotaHoy.expectedAmount))}
                        disabled={isUpdating}
                        className="col-span-2 bg-blue-600 hover:bg-blue-500 py-4 rounded-[20px] text-white text-[11px] font-black uppercase tracking-tighter transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        PAGO TOTAL
                      </button>
                      <button 
                        onClick={() => setManualPayModal({ open: true, inst: cuotaHoy })}
                        className="bg-white/5 hover:bg-white/10 rounded-[20px] text-slate-300 flex items-center justify-center transition-all"
                      >
                        <FiDollarSign size={20} />
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(cuotaHoy.id, 'OVERDUE', 0)}
                        className="bg-red-500/10 hover:bg-red-500/20 rounded-[20px] text-red-400 flex items-center justify-center transition-all"
                      >
                        <FiSlash size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 bg-white/[0.02] rounded-[35px] text-center border border-dashed border-white/5">
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Sin compromisos para esta fecha</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. MODAL: ABONO MANUAL */}
      {manualPayModal.open && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#0B0B12] border border-white/10 rounded-[45px] p-10 shadow-3xl animate-[slideUp_0.2s_ease-out]">
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Registro de Abono</h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">Ingresa el monto parcial recibido del cliente.</p>
            
            <div className="relative mb-10">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-2xl">$</span>
              <input 
                type="number" 
                value={manualAmount} 
                onChange={(e) => setManualAmount(e.target.value)} 
                autoFocus
                className="w-full bg-[#05050A] border border-white/10 rounded-3xl pl-12 pr-6 py-5 text-2xl text-white font-black focus:border-emerald-500 transition-all shadow-inner" 
                placeholder="0" 
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setManualPayModal({ open: false, inst: null })} 
                className="flex-1 py-4 text-slate-500 font-bold text-sm hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleUpdateStatus(manualPayModal.inst.id, 'PARTIAL', parseFloat(manualAmount))}
                disabled={isUpdating || !manualAmount}
                className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-2xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-30"
              >
                CONFIRMAR ABONO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: HISTORIAL DINÁMICO */}
      {selectedClient && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md px-4 py-6" onClick={() => setSelectedClient(null)}>
          <div className="w-full max-w-2xl bg-[#0B0B12] border border-white/10 rounded-[50px] shadow-3xl flex flex-col max-h-[90dvh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter italic">{selectedClient.name}</h3>
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">Plan de Amortización Operativo</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="h-14 w-14 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 transition-all active:scale-90">
                <FiX size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {selectedClient.loans[0]?.installmentDetails?.map((inst: any) => (
                <div 
                  key={inst.id} 
                  className={`flex items-center justify-between p-6 rounded-[32px] border transition-all ${inst.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/10 opacity-50' : inst.status === 'OVERDUE' ? 'bg-red-500/5 border-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'bg-white/[0.03] border-white/5 hover:border-blue-600/30'}`}
                >
                  <div className="flex gap-6 items-center">
                    <div className="text-center min-w-[50px]">
                      <p className="text-[10px] font-black text-slate-600 uppercase mb-0.5">Cuota</p>
                      <p className="text-2xl font-black text-white">#{inst.installmentNumber}</p>
                    </div>
                    <div className="w-[1.5px] h-10 bg-white/5" />
                    <div>
                      <p className="text-[10px] font-black text-slate-600 uppercase mb-0.5">Vencimiento</p>
                      <p className="text-sm font-bold text-slate-300">{new Date(inst.dueDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-600 uppercase mb-0.5">Estado / Valor</p>
                      <p className={`text-lg font-black ${inst.status === 'PAID' ? 'text-emerald-400' : inst.status === 'OVERDUE' ? 'text-red-400' : 'text-blue-400'}`}>
                        ${Number(inst.expectedAmount).toLocaleString('es-CO')}
                      </p>
                    </div>
                    {inst.status === 'PENDING' ? (
                      <button 
                        onClick={() => handleUpdateStatus(inst.id, 'PAID', Number(inst.expectedAmount))}
                        className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform active:scale-90"
                      >
                        <FiCheckCircle size={22} />
                      </button>
                    ) : (
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white ${inst.status === 'PAID' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                        {inst.status === 'PAID' ? <FiCheckCircle size={22} /> : <FiAlertTriangle size={22} />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-10 border-t border-white/5 bg-[#05050A]/80 rounded-b-[50px]">
              <button 
                onClick={() => setSelectedClient(null)} 
                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-sm transition-all active:scale-95 border border-white/5"
              >
                CERRAR EXPEDIENTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTAS PREMIUM */}
      {alertState.open && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-xl px-4">
          <div className="w-full max-w-[420px] rounded-[50px] border border-white/10 bg-[#0B0B12] shadow-3xl p-10 animate-[slideUp_0.15s_ease-out]">
            <div className="flex flex-col items-center text-center">
              <div className={`h-20 w-20 rounded-[30px] flex items-center justify-center mb-8 border-2 ${alertState.variant === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]" : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]"}`}>
                <FiAlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 italic tracking-tight uppercase">{alertState.title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">{alertState.message}</p>
              <button 
                onClick={closeAlert} 
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-sm shadow-2xl shadow-blue-600/30 transition-all active:scale-95"
              >
                {alertState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}