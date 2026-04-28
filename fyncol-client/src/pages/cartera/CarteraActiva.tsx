import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiDollarSign, FiMapPin, FiSearch, 
  FiAlertTriangle, FiX, FiLoader, FiNavigation,
  FiSun, FiMoon, FiCheckCircle, FiExternalLink, FiMap, FiCalendar, FiLock, FiClock, FiInfo,
  FiList
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const traducirEstado = (status: string) => {
  switch (status) {
    case 'PAID': return 'PAGADO';
    case 'PARTIAL': return 'ABONO PARCIAL';
    case 'OVERDUE': return 'EN MORA';
    case 'RENEGOTIATED': return 'MORA RENEGOCIADA';
    case 'PENDING': return 'PENDIENTE';
    default: return status;
  }
};

function MapController({ coords, zoom }: { coords: [number, number] | null, zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] !== 0 && coords[1] !== 0) {
      map.flyTo(coords, zoom || 15, { animate: true, duration: 1.5 });
    }
  }, [coords, map, zoom]);
  return null;
}

const getDeviceTodayStr = () => {
    const today = new Date(); 
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export default function CarteraActiva() {
  const [clients, setClients] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'TODOS' | 'HOY' | 'PENDIENTES'>('HOY');
  
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  
  const [mobileView, setMobileView] = useState<'LIST' | 'MAP'>('LIST');

  const [selectedClient, setSelectedClient] = useState<any>(null); 
  const [modalTab, setModalTab] = useState<'PLAN' | 'RECIBOS'>('PLAN');
  
  const [updatingInstId, setUpdatingInstId] = useState<number | null>(null);
  
  const [confirmPayModal, setConfirmPayModal] = useState<{open: boolean, inst: any, faltante: number}>({ open: false, inst: null, faltante: 0 });
  const [manualPayModal, setManualPayModal] = useState<{open: boolean, inst: any, loan: any}>({ open: false, inst: null, loan: null });
  const [manualAmount, setManualAmount] = useState("");
  
  const [saldoAction, setSaldoAction] = useState<'MANTENER' | 'PROXIMA_CUOTA' | 'DIFERIR' | 'CUOTA_ESPECIFICA'>('MANTENER');
  const [overpaymentAction, setOverpaymentAction] = useState<'NEXT_QUOTA' | 'REDUCE_TIME' | 'REDUCE_QUOTA' | 'ABONO_CUOTA_ESPECIFICA'>('NEXT_QUOTA');
  const [targetInstallmentNum, setTargetInstallmentNum] = useState<number>(0);

  const [overdueModal, setOverdueModal] = useState<{open: boolean, inst: any, loan: any}>({ open: false, inst: null, loan: null });
  const [overdueAction, setOverdueAction] = useState<'SOLO_MORA' | 'PROXIMA_CUOTA' | 'DIFERIR' | 'CUOTA_ESPECIFICA' | 'CUOTA_EXTRA'>('SOLO_MORA');
  const [overdueTargetInst, setOverdueTargetInst] = useState<number>(0);
  
  const [promiseDate, setPromiseDate] = useState('');

  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureSummary, setClosureSummary] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isRouteClosed, setIsRouteClosed] = useState(false); 

  const latestCoords = useRef<{lat: number, lng: number} | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'SEARCHING' | 'ACTIVE' | 'ERROR'>('SEARCHING');

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        latestCoords.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setGpsStatus(prev => prev !== 'ACTIVE' ? 'ACTIVE' : prev);
      },
      (error) => {
        console.error("Error al obtener GPS:", error);
        setGpsStatus('ERROR');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    const syncInterval = setInterval(() => {
      if (!latestCoords.current) return;

      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      fetch(`${baseUrl}/api/users/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: latestCoords.current.lat,
          longitude: latestCoords.current.lng
        })
      }).catch(() => console.warn("Fallo de sincronización GPS silencioso"));
      
    }, 15000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(syncInterval);
    };
  }, []);

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
      }
    } catch (error) {
      console.error("Error fetching data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCartera(); }, []);

  useEffect(() => {
    if (routeInfo) {
      const deviceTodayStr = getDeviceTodayStr();
      const storageKey = `closed_route_${routeInfo.id}_${deviceTodayStr}`;
      const isClosed = localStorage.getItem(storageKey);
      setIsRouteClosed(isClosed === 'true');
    }
  }, [routeInfo]);

  const filteredData = useMemo(() => {
    const deviceTodayStr = getDeviceTodayStr();

    return clients.filter(client => {
      const loan = client.loans[0];
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const cuotaActiva = loan?.installmentDetails?.find((i: any) => {
        if (i.status === 'PAID') return false;
        const dbDate = i.dueDate.split('T')[0];
        const promiseDateStr = i.promiseDate ? i.promiseDate.split('T')[0] : null;

        const isDueToday = dbDate <= deviceTodayStr;
        const isPromisedToday = promiseDateStr && promiseDateStr <= deviceTodayStr;
        const isFuturePromise = promiseDateStr && promiseDateStr > deviceTodayStr;
        
        if (filter === 'HOY') {
            if (isFuturePromise) return false;
            if (i.status === 'RENEGOTIATED') return isPromisedToday;
            return isDueToday || isPromisedToday;
        }
        return true; 
      });

      if (filter === 'HOY') return !!cuotaActiva;
      
      if (filter === 'PENDIENTES') {
         return loan?.installmentDetails?.some((i: any) => 
           i.status === 'OVERDUE' || 
           (i.status === 'RENEGOTIATED' && i.promiseDate && i.promiseDate.split('T')[0] <= deviceTodayStr) || 
           (i.status === 'PENDING' && i.dueDate.split('T')[0] < deviceTodayStr)
         );
      }
      return true;
    });
  }, [clients, searchTerm, filter]);

  const routePolylineCoords = useMemo(() => {
    return filteredData.filter(c => c.latitude && c.longitude).map(c => [c.latitude, c.longitude] as [number, number]);
  }, [filteredData]);

  useEffect(() => {
    if (routePolylineCoords.length > 0 && !focusCoords) {
      setFocusCoords(routePolylineCoords[0]);
    }
  }, [routePolylineCoords]);

  const handleUpdateStatus = async (instId: number, status: string, amount: number, actionData?: any) => {
    if(isRouteClosed) return; 
    setUpdatingInstId(instId);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const payload: any = { status, paidAmount: amount };
      if(actionData) payload.actionParams = actionData;

      const res = await fetch(`${baseUrl}/api/clients/installment/${instId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setConfirmPayModal({ open: false, inst: null, faltante: 0 });
        setManualPayModal({ open: false, inst: null, loan: null });
        setOverdueModal({ open: false, inst: null, loan: null });
        setManualAmount("");
        setSaldoAction('MANTENER');
        setOverpaymentAction('NEXT_QUOTA');
        setOverdueAction('SOLO_MORA');
        setPromiseDate(''); 
        await fetchCartera();
        
        if (selectedClient) {
           const resData = await fetch(`${baseUrl}/api/clients/cartera`, { headers: { 'Authorization': `Bearer ${token}` } });
           const updatedData = await resData.json();
           const refreshedClient = updatedData.clients.find((c: any) => c.id === selectedClient.id);
           setSelectedClient(refreshedClient);
        }
      }
    } catch (error) {
      console.error("Error updating status");
    } finally {
      setUpdatingInstId(null);
    }
  };

  const openClientModal = (client: any) => {
    setSelectedClient(client);
    setModalTab('PLAN');
  };

  const openNavigationApp = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenClosure = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/closure/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClosureSummary(data.summary);
        setClosureModalOpen(true);
      } else {
        alert("Error al calcular el arqueo: " + (data.error || "Desconocido"));
      }
    } catch (error) {
      alert("Hubo un problema de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmClosure = async () => {
    setIsClosing(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/closure/confirm`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ summary: closureSummary })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setClosureModalOpen(false);
        const deviceTodayStr = getDeviceTodayStr();
        const storageKey = `closed_route_${routeInfo.id}_${deviceTodayStr}`;
        localStorage.setItem(storageKey, 'true');
        setIsRouteClosed(true);
        window.location.href = '/dashboard'; 
      } else {
        alert("Error del Backend al intentar cerrar: " + (data.error || "Revisa la consola."));
      }
    } catch (error) {
      alert("Error crítico de conexión al confirmar el cierre.");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full bg-[#0B0B12] overflow-hidden">
      <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] flex bg-[#05050A]/95 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-[85%] max-w-[320px]">
        <button onClick={() => setMobileView('LIST')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${mobileView === 'LIST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><FiList size={16} /> Lista</button>
        <button onClick={() => setMobileView('MAP')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${mobileView === 'MAP' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><FiMapPin size={16} /> Mapa</button>
      </div>

      <div className={`absolute md:relative inset-0 md:inset-auto w-full md:w-[420px] lg:w-[480px] h-full flex flex-col bg-[#05050A] border-r border-white/10 shrink-0 shadow-2xl transition-transform duration-300 ease-in-out z-[100] md:z-10 ${mobileView === 'MAP' ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <div className="p-5 border-b border-white/5 shrink-0 bg-[#0B0B12]">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-bold text-white">Sistema Logístico</h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${gpsStatus === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : gpsStatus === 'ERROR' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              {gpsStatus === 'ACTIVE' && <FiNavigation size={10} className="animate-pulse" />}
              {gpsStatus === 'ERROR' && <FiAlertTriangle size={10} />}
              {gpsStatus === 'SEARCHING' && <FiLoader size={10} className="animate-spin" />}
              {gpsStatus === 'ACTIVE' ? 'GPS Activo' : gpsStatus === 'ERROR' ? 'Sin Señal' : 'Buscando...'}
            </div>
          </div>
          
          {routeInfo && (
            <div className="mb-4">
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl mb-2 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><FiMap size={12}/> Ruta Activa</span>
                  <span className="text-sm font-semibold text-white">{routeInfo.city}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest">Capital</span>
                  <span className="text-sm font-bold text-green-400">${Math.round(Number(routeInfo.availableCapital) || 0).toLocaleString('es-CO')}</span>
                </div>
              </div>
              {isRouteClosed ? (
                <button disabled className="w-full bg-[#0B0B12] text-slate-500 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-white/5 cursor-not-allowed"><FiLock size={16} /> Ruta Cerrada por Hoy</button>
              ) : (
                <button onClick={handleOpenClosure} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 border border-emerald-500/30"><FiCheckCircle size={16} /> Cerrar Ruta de Hoy</button>
              )}
            </div>
          )}

          <div className="relative mb-3">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#05050A] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"/>
          </div>

          <div className="flex bg-[#05050A] p-1 rounded-xl border border-white/10">
            {[ { id: 'HOY', label: 'Ruta' }, { id: 'PENDIENTES', label: 'Mora' }, { id: 'TODOS', label: 'Todos' } ].map((btn) => (
              <button key={btn.id} onClick={() => setFilter(btn.id as any)} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${filter === btn.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{btn.label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
          {isLoading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-400"><FiLoader className="animate-spin text-blue-500" size={24} /><span className="text-sm">Sincronizando ruta...</span></div>
          ) : filteredData.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">No hay clientes que coincidan con los filtros.</div>
          ) : (
            filteredData.map((client, index) => {
              const loan = client.loans?.[0];
              if (!loan) return null;
              
              const deviceTodayStr = getDeviceTodayStr();
              
              const cuotaActiva = loan.installmentDetails?.find((i: any) => {
                if (i.status === 'PAID') return false;
                const dbDate = i.dueDate.split('T')[0];
                const promiseDateStr = i.promiseDate ? i.promiseDate.split('T')[0] : null;
                const isDueToday = dbDate <= deviceTodayStr;
                const isPromisedToday = promiseDateStr && promiseDateStr <= deviceTodayStr;
                const isFuturePromise = promiseDateStr && promiseDateStr > deviceTodayStr;

                if (filter === 'HOY' && isFuturePromise) return false;
                return isDueToday || isPromisedToday || i.status === 'RENEGOTIATED' || i.status === 'OVERDUE' || i.status === 'PENDING' || i.status === 'PARTIAL';
              });

              const prestamoTerminado = loan.installmentDetails ? loan.installmentDetails.every((i: any) => i.status === 'PAID') : false;
              const hasPaidToday = loan.installmentDetails ? loan.installmentDetails.some((i: any) => i.dueDate.startsWith(deviceTodayStr) && i.status === 'PAID') : false;

              const dbDateActiva = cuotaActiva ? cuotaActiva.dueDate.split('T')[0] : null;
              
              // BLINDAJE: Solo requiere renegociar si debe plata (faltante > 0)
              const faltanteActual = cuotaActiva ? Math.round(Number(cuotaActiva.expectedAmount) - Number(cuotaActiva.paidAmount || 0)) : 0;
              const requiereRenegociar = cuotaActiva && dbDateActiva && dbDateActiva < deviceTodayStr && cuotaActiva.status !== 'PAID' && cuotaActiva.status !== 'RENEGOTIATED' && faltanteActual > 0;
              const isRenegociadaFutura = cuotaActiva && cuotaActiva.status === 'RENEGOTIATED' && cuotaActiva.promiseDate && cuotaActiva.promiseDate.split('T')[0] > deviceTodayStr;
              const mostrarBotones = cuotaActiva && (cuotaActiva.status === 'PENDING' || cuotaActiva.status === 'PARTIAL' || cuotaActiva.status === 'OVERDUE' || (cuotaActiva.status === 'RENEGOTIATED' && faltanteActual > 0)) && !isRenegociadaFutura;

              return (
                <div 
                  key={client.id}
                  onClick={() => {
                    if (client.latitude && client.longitude) {
                      setFocusCoords([client.latitude, client.longitude]);
                      if (window.innerWidth < 768) setMobileView('MAP'); 
                    }
                  }}
                  className={`flex p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group ${cuotaActiva?.status === 'RENEGOTIATED' ? 'bg-orange-500/5' : ''}`}
                >
                  <div className="w-8 shrink-0 text-slate-500 font-bold text-sm pt-0.5">{String(index + 1).padStart(2, '0')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-sm text-white truncate pr-2">{client.name}</h3>
                      {hasPaidToday || prestamoTerminado ? (
                         <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} title="Pagado hoy / Terminado" />
                      ) : cuotaActiva?.status === 'OVERDUE' ? (
                         <FiAlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} title="En Mora" />
                      ) : cuotaActiva?.status === 'RENEGOTIATED' ? (
                         <FiClock className="text-orange-400 shrink-0 mt-0.5" size={16} title="Mora Renegociada" />
                      ) : (
                         <div className="w-4 h-4 rounded-full border-2 border-slate-600 shrink-0 mt-0.5"></div>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400 flex items-center gap-1 mb-2 truncate"><FiMapPin className="shrink-0" size={10}/> {client.address}</div>

                    {cuotaActiva && !prestamoTerminado && (
                      <div className={`mt-2 rounded-lg p-2.5 border ${cuotaActiva.status === 'RENEGOTIATED' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#0B0B12] border-white/5'}`}>
                        <div className="flex justify-between items-center mb-2">
                           <span className={`text-xs font-bold ${cuotaActiva.status === 'RENEGOTIATED' ? 'text-orange-400' : 'text-white'}`}>${Math.round(Number(cuotaActiva.expectedAmount) || 0).toLocaleString('es-CO')}</span>
                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-blue-400 bg-blue-500/10 uppercase">Cuota {cuotaActiva.installmentNumber}</span>
                        </div>

                        {requiereRenegociar && (
                          <div className="mb-2 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded inline-flex items-center gap-1 uppercase border border-red-500/20"><FiAlertTriangle size={10} /> RENEGOCIAR</div>
                        )}

                        {cuotaActiva.status === 'RENEGOTIATED' && (
                          <div className="mb-2 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded inline-block uppercase">MORA RENEGOCIADA</div>
                        )}
                        {cuotaActiva.promiseDate && (
                          <div className="mb-2 text-[10px] font-medium text-slate-400 flex items-center gap-1"><FiCalendar size={10} /> Visita agendada: {new Date(cuotaActiva.promiseDate).toLocaleDateString('es-CO')}</div>
                        )}

                        {cuotaActiva.actionDescription && (
                          <div className="mb-2 text-[10px] font-medium text-slate-400 bg-black/20 p-1.5 rounded flex items-center gap-1.5 italic border border-white/5">
                            <FiInfo className="shrink-0 text-blue-400" size={12} />
                            <span className="truncate">{cuotaActiva.actionDescription}</span>
                          </div>
                        )}
                        
                        {mostrarBotones && (
                          isRouteClosed ? (
                            <div className="py-2 text-center border border-white/5 bg-white/5 rounded-lg text-slate-500 text-xs font-semibold flex items-center justify-center gap-1.5 mt-1"><FiLock size={12} /> Pagos bloqueados por cierre</div>
                          ) : (
                            <div className="flex gap-1.5 mt-2">
                              {cuotaActiva.status !== 'RENEGOTIATED' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmPayModal({ open: true, inst: cuotaActiva, faltante: faltanteActual });
                                  }} 
                                  className="flex-[2] bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-white text-[10px] font-bold flex justify-center items-center transition-all"
                                >
                                  PAGAR
                                </button>
                              )}
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setManualPayModal({ open: true, inst: cuotaActiva, loan }); 
                                  setManualAmount(""); 
                                  setSaldoAction('MANTENER'); 
                                  setOverpaymentAction('NEXT_QUOTA'); 
                                }}
                                className="flex-1 bg-white/10 hover:bg-white/20 py-1.5 rounded text-white text-[10px] font-bold flex justify-center items-center transition-all"
                              >
                                ABONO
                              </button>
                              {cuotaActiva.status !== 'RENEGOTIATED' && (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setOverdueModal({ open: true, inst: cuotaActiva, loan: loan }); 
                                    const isDiario = loan.periodicity === 'DIARIO';
                                    setOverdueAction(isDiario ? 'PROXIMA_CUOTA' : 'SOLO_MORA'); 
                                  }}
                                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded text-[10px] font-bold flex justify-center items-center transition-all"
                                >
                                  MORA
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); openClientModal(client); }} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><FiCalendar size={10} /> Historial</button>
                      {client.latitude && (
                        <button onClick={(e) => { e.stopPropagation(); openNavigationApp(client.latitude, client.longitude); }} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"><FiNavigation size={10} /> GPS</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 h-full relative z-0">
        <button onClick={() => setMapTheme(prev => prev === 'light' ? 'dark' : 'light')} className="absolute top-4 right-4 z-[400] p-2.5 bg-[#05050A]/80 backdrop-blur-md text-white rounded-lg shadow-xl border border-white/10 hover:bg-white/5 transition-all" title="Alternar estilo de mapa">
          {mapTheme === 'light' ? <FiMoon size={18} className="text-blue-400" /> : <FiSun size={18} className="text-yellow-400" />}
        </button>
        <MapContainer center={[6.2442, -75.5812]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer key={mapTheme} url={mapTheme === 'light' ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"} />
          {filter !== 'TODOS' && routePolylineCoords.length > 1 && (<Polyline positions={routePolylineCoords} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '10, 10' }} />)}
          {filteredData.map(client => {
            const deviceTodayStr = getDeviceTodayStr();
            const loan = client.loans?.[0];
            const hasPaidToday = loan?.installmentDetails ? loan.installmentDetails.some((i: any) => i.dueDate.startsWith(deviceTodayStr) && i.status === 'PAID') : false;
            return client.latitude && (
              <Marker key={client.id} position={[client.latitude, client.longitude]} icon={hasPaidToday ? greenIcon : redIcon}>
                <Popup className="custom-popup">
                  <div className="p-3 text-slate-800 bg-white rounded-xl shadow-lg">
                    <p className="font-bold text-sm mb-1">{client.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{client.address}</p>
                    <button onClick={() => openNavigationApp(client.latitude, client.longitude)} className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"><FiExternalLink size={12} /> Navegar</button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <MapController coords={focusCoords} />
        </MapContainer>
      </div>

      {confirmPayModal.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#05050A] border border-white/10 rounded-3xl p-7 shadow-2xl text-center animate-[slideUp_0.18s_ease-out]">
            <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400"><FiCheckCircle size={24} /></div>
            <h3 className="text-lg font-bold text-white mb-1">Confirmar Pago</h3>
            <p className="text-sm text-slate-400 mb-4">¿Registrar pago total de la cuota por:</p>
            <p className="text-3xl font-bold text-white mb-6">${confirmPayModal.faltante.toLocaleString('es-CO')}?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPayModal({ open: false, inst: null, faltante: 0 })} className="flex-1 py-3 bg-white/5 border border-white/5 text-slate-300 rounded-xl font-medium text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={() => confirmPayModal.inst && handleUpdateStatus(confirmPayModal.inst.id, 'PAID', confirmPayModal.faltante, { action: 'NONE', description: 'Pago completo de la cuota.' })} disabled={updatingInstId === confirmPayModal.inst?.id} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">{updatingInstId === confirmPayModal.inst?.id ? <FiLoader className="animate-spin" /> : 'Sí, registrar pago'}</button>
            </div>
          </div>
        </div>
      )}

      {overdueModal.open && (() => {
        const inst = overdueModal.inst;
        const faltante = Math.round(Number(inst.expectedAmount) - Number(inst.paidAmount || 0));
        const isDiario = overdueModal.loan?.periodicity === 'DIARIO';
        const futureInstallmentsUI = overdueModal.loan?.installmentDetails?.filter((i: any) => i.installmentNumber > inst.installmentNumber && i.status !== 'PAID') || [];

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#05050A] border border-white/10 rounded-3xl shadow-2xl animate-[slideUp_0.18s_ease-out] overflow-y-auto max-h-[95vh] [&::-webkit-scrollbar]:hidden">
              <div className="p-6 border-b border-white/5 text-center">
                <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400"><FiAlertTriangle size={24} /></div>
                <h3 className="text-lg font-bold text-white mb-2">Gestión de Mora</h3>
                <p className="text-sm font-semibold text-red-400">El cliente tiene un saldo pendiente de <span className="text-white">${faltante.toLocaleString('es-CO')}</span></p>
                <p className="text-xs text-slate-400 mt-1">Selecciona cómo gestionar esta deuda:</p>
              </div>

              <div className="p-6 bg-red-500/5 border-b border-white/5 space-y-2">
                {!isDiario && (
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overdueAction === 'SOLO_MORA' ? 'bg-red-600/20 border-red-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                    <input type="radio" name="overdueAction" checked={overdueAction === 'SOLO_MORA'} onChange={() => setOverdueAction('SOLO_MORA')} className="mt-1 shrink-0 accent-red-500" />
                    <div className="w-full">
                      <p className="text-sm font-semibold text-white">Solo reportar en mora</p>
                      <p className="text-xs text-slate-400 mt-0.5">Deja el saldo pendiente y no reestructura la deuda.</p>
                      {overdueAction === 'SOLO_MORA' && (
                        <div className="mt-3 p-3 bg-black/20 rounded-xl border border-white/5">
                          <label className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Agendar nueva visita (Opcional)</label>
                          <input type="date" value={promiseDate} onChange={e => setPromiseDate(e.target.value)} min={getDeviceTodayStr()} className="w-full mt-1 bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                          <p className="text-[10px] text-slate-500 mt-1">El cliente volverá a aparecer en la ruta principal en esta fecha.</p>
                        </div>
                      )}
                    </div>
                  </label>
                )}

                {futureInstallmentsUI.length > 0 && (
                  <>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overdueAction === 'PROXIMA_CUOTA' ? 'bg-red-600/20 border-red-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="overdueAction" checked={overdueAction === 'PROXIMA_CUOTA'} onChange={() => setOverdueAction('PROXIMA_CUOTA')} className="mt-1 shrink-0 accent-red-500" />
                      <div>
                        <p className="text-sm font-semibold text-white">Pasar deuda a la siguiente cuota</p>
                        <p className="text-xs text-slate-400 mt-0.5">La cuota actual se etiqueta como Mora Renegociada y la de mañana cobrará el doble.</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overdueAction === 'DIFERIR' ? 'bg-red-600/20 border-red-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="overdueAction" checked={overdueAction === 'DIFERIR'} onChange={() => setOverdueAction('DIFERIR')} className="mt-1 shrink-0 accent-red-500" />
                      <div>
                        <p className="text-sm font-semibold text-white">Diferir en cuotas restantes</p>
                        <p className="text-xs text-slate-400 mt-0.5">Reparte la deuda entre todas las cuotas que le faltan.</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overdueAction === 'CUOTA_ESPECIFICA' ? 'bg-red-600/20 border-red-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="overdueAction" checked={overdueAction === 'CUOTA_ESPECIFICA'} onChange={() => { setOverdueAction('CUOTA_ESPECIFICA'); setOverdueTargetInst(futureInstallmentsUI[0]?.installmentNumber); }} className="mt-1 shrink-0 accent-red-500" />
                      <div className="w-full">
                        <p className="text-sm font-semibold text-white">Sumar a una cuota específica</p>
                        <p className="text-xs text-slate-400 mt-0.5 mb-2">Elige a qué cuota futura cargarle esta deuda.</p>
                        {overdueAction === 'CUOTA_ESPECIFICA' && (
                          <select value={overdueTargetInst} onChange={e => setOverdueTargetInst(Number(e.target.value))} className="w-full bg-[#05050A] border border-white/20 rounded-lg p-2 text-white text-sm focus:border-red-500 outline-none">
                            {futureInstallmentsUI.map((fInst: any) => (
                              <option key={fInst.id} value={fInst.installmentNumber}>Cuota #{fInst.installmentNumber} - ({new Date(fInst.dueDate).toLocaleDateString('es-CO')})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>
                  </>
                )}

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overdueAction === 'CUOTA_EXTRA' ? 'bg-red-600/20 border-red-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                  <input type="radio" name="overdueAction" checked={overdueAction === 'CUOTA_EXTRA'} onChange={() => setOverdueAction('CUOTA_EXTRA')} className="mt-1 shrink-0 accent-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-white">Agregar una cuota extra al final</p>
                    <p className="text-xs text-slate-400 mt-0.5">Alarga el plazo del crédito creando una nueva cuota al final.</p>
                  </div>
                </label>
              </div>
              
              <div className="p-6 flex gap-3 shrink-0">
                <button onClick={() => { setOverdueModal({ open: false, inst: null, loan: null }); setOverdueAction(isDiario ? 'PROXIMA_CUOTA' : 'SOLO_MORA'); setPromiseDate(''); }} className="flex-1 py-3.5 border border-white/5 text-slate-300 font-medium text-sm bg-[#0B0B12] hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button 
                  onClick={() => {
                    let finalStatus = 'OVERDUE';
                    let actionData: any = { action: 'NONE', amount: 0, targetInstallment: 0, description: '' };

                    if (overdueAction === 'SOLO_MORA') {
                      if (promiseDate) {
                        actionData.promiseDate = promiseDate;
                        finalStatus = 'RENEGOTIATED'; 
                        actionData.description = `Mora renegociada. Visita reagendada para el ${new Date(promiseDate + 'T12:00:00').toLocaleDateString('es-CO')}`;
                      } else {
                        actionData.description = "Reportado en mora sin reagendamiento.";
                      }
                    } else {
                      finalStatus = 'RENEGOTIATED'; 
                      actionData.action = overdueAction;
                      actionData.amount = faltante;
                      actionData.targetInstallment = overdueTargetInst;

                      if (overdueAction === 'PROXIMA_CUOTA') actionData.description = "Deuda sumada a la siguiente cuota.";
                      if (overdueAction === 'DIFERIR') actionData.description = "Deuda diferida en cuotas restantes.";
                      if (overdueAction === 'CUOTA_ESPECIFICA') actionData.description = `Deuda sumada a la cuota #${overdueTargetInst}.`;
                      if (overdueAction === 'CUOTA_EXTRA') actionData.description = "Se agregó una nueva cuota extra al final del crédito.";
                    }

                    handleUpdateStatus(inst.id, finalStatus, 0, actionData);
                  }}
                  disabled={updatingInstId === inst.id}
                  className="flex-[2] py-3.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center transition-all shadow-lg bg-red-600 hover:bg-red-500"
                >
                  {updatingInstId === inst.id ? <FiLoader className="animate-spin" /> : 'Confirmar Gestión'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPUP INTELIGENTE DE ABONOS */}
      {manualPayModal.open && (() => {
        const inst = manualPayModal.inst;
        const faltante = Math.round(Number(inst.expectedAmount) - Number(inst.paidAmount || 0));
        const abonoValue = parseFloat(manualAmount) || 0;
        
        const diferencia = Math.abs(faltante - abonoValue);
        const esParcial = abonoValue > 0 && abonoValue < faltante;
        const esExacto = abonoValue === faltante;
        const esExcedente = abonoValue > faltante;

        const futureInstallmentsUI = manualPayModal.loan?.installmentDetails?.filter(
          (i: any) => i.installmentNumber > inst.installmentNumber && i.status !== 'PAID' && i.status !== 'RENEGOTIATED'
        ) || [];

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#05050A] border border-white/10 rounded-3xl shadow-2xl animate-[slideUp_0.18s_ease-out] overflow-y-auto max-h-[95vh] [&::-webkit-scrollbar]:hidden">
              <div className="p-6 border-b border-white/5">
                <div className="flex justify-between items-center mb-5">
                   <h3 className="text-lg font-bold text-white">Registrar Abono</h3>
                   <span className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded">Cuota Actual: ${faltante.toLocaleString('es-CO')}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  <input type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className={`w-full bg-[#0B0B12] border ${esExcedente ? 'border-emerald-500 focus:border-emerald-400 text-emerald-400' : 'border-white/10 focus:border-blue-500 text-white'} rounded-2xl pl-8 pr-4 py-4 text-2xl font-bold outline-none shadow-inner transition-colors text-center`} placeholder="0.00" autoFocus />
                </div>
              </div>

              {esParcial && (
                <div className="p-6 bg-blue-500/5 border-b border-white/5">
                  <p className="text-sm font-semibold text-blue-400 mb-3 text-center">Falta un saldo de <span className="text-white">${diferencia.toLocaleString('es-CO')}</span>. ¿Qué hacer con él?</p>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${saldoAction === 'MANTENER' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="saldoAction" checked={saldoAction === 'MANTENER'} onChange={() => setSaldoAction('MANTENER')} className="mt-1 shrink-0 accent-blue-500" />
                      <div>
                        <p className="text-sm font-semibold text-white">Mantener en esta misma cuota</p>
                        <p className="text-xs text-slate-400 mt-0.5">La cuota quedará como Abono Parcial y seguirá debiendo el resto.</p>
                      </div>
                    </label>

                    {futureInstallmentsUI.length > 0 && (
                      <>
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${saldoAction === 'PROXIMA_CUOTA' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                          <input type="radio" name="saldoAction" checked={saldoAction === 'PROXIMA_CUOTA'} onChange={() => setSaldoAction('PROXIMA_CUOTA')} className="mt-1 shrink-0 accent-blue-500" />
                          <div>
                            <p className="text-sm font-semibold text-white">Moverlo a la próxima cuota</p>
                            <p className="text-xs text-slate-400 mt-0.5">Liquida la cuota de hoy. La próxima será más costosa.</p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${saldoAction === 'DIFERIR' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                          <input type="radio" name="saldoAction" checked={saldoAction === 'DIFERIR'} onChange={() => setSaldoAction('DIFERIR')} className="mt-1 shrink-0 accent-blue-500" />
                          <div>
                            <p className="text-sm font-semibold text-white">Diferir en cuotas restantes</p>
                            <p className="text-xs text-slate-400 mt-0.5">Reparte la deuda restante equitativamente.</p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${saldoAction === 'CUOTA_ESPECIFICA' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                          <input type="radio" name="saldoAction" checked={saldoAction === 'CUOTA_ESPECIFICA'} onChange={() => { setSaldoAction('CUOTA_ESPECIFICA'); setTargetInstallmentNum(futureInstallmentsUI[0]?.installmentNumber); }} className="mt-1 shrink-0 accent-blue-500" />
                          <div className="w-full">
                            <p className="text-sm font-semibold text-white">Cargar a una cuota específica</p>
                            <p className="text-xs text-slate-400 mt-0.5 mb-2">Mueve la deuda a otra cuota futura elegida a mano.</p>
                            {saldoAction === 'CUOTA_ESPECIFICA' && (
                              <select value={targetInstallmentNum} onChange={e => setTargetInstallmentNum(Number(e.target.value))} className="w-full bg-[#05050A] border border-white/20 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none">
                                {futureInstallmentsUI.map((fInst: any) => (
                                  <option key={fInst.id} value={fInst.installmentNumber}>Cuota #{fInst.installmentNumber} - ({new Date(fInst.dueDate).toLocaleDateString('es-CO')})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {esExcedente && (
                <div className="p-6 bg-emerald-500/5 border-b border-white/5">
                  <p className="text-sm font-semibold text-emerald-400 mb-3 text-center">¡Hay un excedente de <span className="text-white">${diferencia.toLocaleString('es-CO')}</span>! ¿Dónde lo aplicamos?</p>
                  
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overpaymentAction === 'NEXT_QUOTA' ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="overpaymentAction" checked={overpaymentAction === 'NEXT_QUOTA'} onChange={() => setOverpaymentAction('NEXT_QUOTA')} className="mt-1 shrink-0 accent-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-white">Abonar a la próxima cuota</p>
                        <p className="text-xs text-slate-400 mt-0.5">La cuota de mañana será más económica.</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overpaymentAction === 'REDUCE_TIME' ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="overpaymentAction" checked={overpaymentAction === 'REDUCE_TIME'} onChange={() => setOverpaymentAction('REDUCE_TIME')} className="mt-1 shrink-0 accent-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-white">Reducir tiempo (De atrás hacia adelante)</p>
                        <p className="text-xs text-slate-400 mt-0.5">Aplica el dinero a las últimas cuotas del préstamo.</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overpaymentAction === 'REDUCE_QUOTA' ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                      <input type="radio" name="overpaymentAction" checked={overpaymentAction === 'REDUCE_QUOTA'} onChange={() => setOverpaymentAction('REDUCE_QUOTA')} className="mt-1 shrink-0 accent-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-white">Reducción simétrica</p>
                        <p className="text-xs text-slate-400 mt-0.5">Baja el valor de todas las cuotas restantes por igual.</p>
                      </div>
                    </label>

                    {/* ESTA ES LA OPCIÓN QUE NO TE SALÍA PORQUE FALTABA EN EL ARCHIVO QUE TENÍAS */}
                    {futureInstallmentsUI.length > 0 && (
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${overpaymentAction === 'ABONO_CUOTA_ESPECIFICA' ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-[#0B0B12] border-white/10 hover:border-white/20'}`}>
                          <input type="radio" name="overpaymentAction" checked={overpaymentAction === 'ABONO_CUOTA_ESPECIFICA'} onChange={() => { setOverpaymentAction('ABONO_CUOTA_ESPECIFICA'); setTargetInstallmentNum(futureInstallmentsUI[0]?.installmentNumber); }} className="mt-1 shrink-0 accent-emerald-500" />
                          <div className="w-full">
                            <p className="text-sm font-semibold text-white">Descontar a una cuota específica</p>
                            <p className="text-xs text-slate-400 mt-0.5 mb-2">Elige a qué cuota futura restarle este saldo a favor.</p>
                            
                            {overpaymentAction === 'ABONO_CUOTA_ESPECIFICA' && (
                              <select value={targetInstallmentNum} onChange={e => setTargetInstallmentNum(Number(e.target.value))} className="w-full bg-[#05050A] border border-white/20 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none">
                                {futureInstallmentsUI.map((fInst: any) => (
                                  <option key={fInst.id} value={fInst.installmentNumber}>Cuota #{fInst.installmentNumber} - ({new Date(fInst.dueDate).toLocaleDateString('es-CO')})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </label>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-6 flex gap-3 shrink-0">
                <button onClick={() => { setManualPayModal({ open: false, inst: null, loan: null }); setSaldoAction('MANTENER'); setOverpaymentAction('NEXT_QUOTA'); }} className="flex-1 py-3.5 border border-white/5 text-slate-300 font-medium text-sm bg-[#0B0B12] hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button 
                  onClick={() => {
                    let finalStatus = 'PAID'; 
                    let actionData: any = { action: 'NONE', amount: 0, targetInstallment: 0, description: '' };

                    if (esParcial) {
                       if (saldoAction === 'MANTENER') {
                           finalStatus = 'PARTIAL';
                           actionData.description = `Abono parcial de $${abonoValue.toLocaleString('es-CO')}. Queda un saldo de $${diferencia.toLocaleString('es-CO')}.`;
                       } else if (futureInstallmentsUI.length > 0) {
                           actionData = { action: saldoAction, amount: diferencia, targetInstallment: targetInstallmentNum };
                           if (saldoAction === 'PROXIMA_CUOTA') actionData.description = `Faltante de $${diferencia.toLocaleString('es-CO')} sumado a la siguiente cuota.`;
                           if (saldoAction === 'DIFERIR') actionData.description = `Faltante de $${diferencia.toLocaleString('es-CO')} diferido en cuotas restantes.`;
                           if (saldoAction === 'CUOTA_ESPECIFICA') actionData.description = `Faltante de $${diferencia.toLocaleString('es-CO')} sumado a cuota #${targetInstallmentNum}.`;
                       }
                    } else if (esExcedente) {
                       actionData = { action: overpaymentAction, amount: diferencia, targetInstallment: overpaymentAction === 'ABONO_CUOTA_ESPECIFICA' ? targetInstallmentNum : 0 };
                       if (overpaymentAction === 'NEXT_QUOTA') actionData.description = `Excedente de $${diferencia.toLocaleString('es-CO')} abonado a la siguiente cuota.`;
                       if (overpaymentAction === 'REDUCE_TIME') actionData.description = `Excedente de $${diferencia.toLocaleString('es-CO')} usado para reducir tiempo (atrás hacia adelante).`;
                       if (overpaymentAction === 'REDUCE_QUOTA') actionData.description = `Excedente de $${diferencia.toLocaleString('es-CO')} usado para reducir cuotas restantes.`;
                       if (overpaymentAction === 'ABONO_CUOTA_ESPECIFICA') actionData.description = `Excedente de $${diferencia.toLocaleString('es-CO')} descontado de la cuota #${targetInstallmentNum}.`;
                    } else {
                       actionData.description = "Pago liquidado exactamente.";
                    }

                    handleUpdateStatus(inst.id, finalStatus, abonoValue, actionData);
                  }}
                  disabled={updatingInstId === inst.id || abonoValue <= 0}
                  className={`flex-[2] py-3.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center transition-all shadow-lg ${esExcedente ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  {updatingInstId === inst.id ? <FiLoader className="animate-spin" /> : (esExacto ? 'Liquidar Total' : 'Confirmar Abono')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: HISTORIAL DEL CLIENTE */}
      {selectedClient && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedClient(null)}>
          <div className="w-full max-w-2xl bg-[#05050A] border border-white/10 rounded-[30px] shadow-2xl flex flex-col max-h-[85dvh] animate-[slideUp_0.18s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center font-bold text-lg border border-blue-500/20">{selectedClient.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{selectedClient.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Auditoría Financiera</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-2 bg-[#0B0B12] border border-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><FiX size={18} /></button>
            </div>
            
            <div className="flex border-b border-white/5 bg-[#0B0B12] px-6 shrink-0">
              <button onClick={() => setModalTab('PLAN')} className={`py-4 px-2 mr-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${modalTab === 'PLAN' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Plan de Cuotas</button>
              <button onClick={() => setModalTab('RECIBOS')} className={`py-4 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${modalTab === 'RECIBOS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Historial de Pagos</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {modalTab === 'PLAN' && (
                selectedClient.loans[0]?.installmentDetails?.map((inst: any) => {
                  
                  const instDbDate = inst.dueDate.split('T')[0];
                  const deviceTodayStr = getDeviceTodayStr();
                  const faltanteActual = Math.round(Number(inst.expectedAmount) - Number(inst.paidAmount || 0));
                  
                  const requiereRenegociarModal = instDbDate < deviceTodayStr && inst.status !== 'PAID' && inst.status !== 'RENEGOTIATED' && faltanteActual > 0;
                  const isRenegociadaFutura = inst.status === 'RENEGOTIATED' && inst.promiseDate && inst.promiseDate.split('T')[0] > deviceTodayStr;
                  const mostrarBotones = (inst.status === 'PENDING' || inst.status === 'PARTIAL' || inst.status === 'OVERDUE' || (inst.status === 'RENEGOTIATED' && faltanteActual > 0)) && !isRenegociadaFutura;

                  return (
                    <div key={inst.id} className={`flex flex-col gap-3 p-4 rounded-2xl border transition-colors ${inst.status === 'RENEGOTIATED' ? 'bg-orange-500/5 border-orange-500/10' : inst.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/10' : inst.status === 'PARTIAL' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-[#0B0B12] border-white/5 hover:border-white/10'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 font-medium mb-0.5">Cuota #{inst.installmentNumber}</p>
                          <div className="flex flex-col">
                             <p className={`text-sm font-semibold ${inst.promiseDate ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                               {new Date(inst.dueDate).toLocaleDateString('es-CO')}
                             </p>
                             {inst.promiseDate && (
                                <p className="text-sm font-bold text-orange-400">
                                  {new Date(inst.promiseDate).toLocaleDateString('es-CO')}
                                </p>
                             )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                           <p className={`font-bold text-base ${inst.status === 'RENEGOTIATED' ? 'text-orange-400' : inst.status === 'PAID' ? 'text-emerald-400' : inst.status === 'OVERDUE' ? 'text-red-400' : 'text-white'}`}>
                             ${Math.round(Number(inst.expectedAmount) || 0).toLocaleString('es-CO')}
                           </p>
                           <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${inst.status === 'RENEGOTIATED' ? 'text-orange-400' : inst.status === 'PARTIAL' ? 'text-blue-400' : 'text-slate-500'}`}>
                             {inst.status === 'PARTIAL' ? `Faltan $${faltanteActual.toLocaleString('es-CO')}` : traducirEstado(inst.status)}
                           </p>
                           {requiereRenegociarModal && (
                             <div className="mt-1.5 text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded flex items-center gap-1 uppercase border border-red-500/20">
                               <FiAlertTriangle size={10} /> RENEGOCIAR
                             </div>
                           )}
                        </div>
                      </div>

                      {inst.actionDescription && (
                        <div className="mt-1 text-[10px] font-medium text-slate-400 bg-white/5 p-2 rounded flex items-start gap-1.5 border border-white/5 italic">
                          <FiClock className="shrink-0 mt-0.5 text-blue-400" />
                          <span>{inst.actionDescription}</span>
                        </div>
                      )}
                      
                      {mostrarBotones && (
                        isRouteClosed ? (
                          <div className="mt-2 pt-3 border-t border-white/5 text-center">
                            <span className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1"><FiLock size={12} /> Caja cerrada hoy</span>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                            {inst.status !== 'RENEGOTIATED' && (
                              <button 
                                onClick={() => setConfirmPayModal({ open: true, inst: inst, faltante: faltanteActual })} 
                                disabled={updatingInstId === inst.id} 
                                className="flex-[2] bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 py-2.5 rounded-xl text-blue-400 text-xs font-semibold transition-all flex items-center justify-center"
                              >
                                {updatingInstId === inst.id ? <FiLoader className="animate-spin" /> : 'Liquidar Cuota'}
                              </button>
                            )}
                            <button 
                              onClick={() => { setManualPayModal({ open: true, inst: inst, loan: selectedClient.loans[0] }); setManualAmount(""); setSaldoAction('MANTENER'); setOverpaymentAction('NEXT_QUOTA'); }} 
                              className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-slate-300 flex items-center justify-center transition-colors border border-white/5"
                            >
                              <FiDollarSign size={14} /> Abono Especial
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
              {modalTab === 'RECIBOS' && (
                selectedClient.loans[0]?.payments?.length > 0 ? (
                  selectedClient.loans[0].payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#0B0B12] border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 shrink-0"><FiCheckCircle size={16} /></div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium mb-0.5">Recibo #{payment.id}</p>
                          <p className="text-xs font-semibold text-slate-200">{new Date(payment.createdAt).toLocaleDateString('es-CO')} - {new Date(payment.createdAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                      <p className="font-bold text-emerald-400 text-base">+${Math.round(Number(payment.amount) || 0).toLocaleString('es-CO')}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                     <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center text-slate-500 mb-3"><FiDollarSign size={20} /></div>
                     <p className="text-slate-300 text-sm font-medium">No hay pagos registrados</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ARQUEO DE CAJA (CIERRE DIARIO) */}
      {closureModalOpen && closureSummary && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#05050A] border border-white/10 rounded-3xl p-7 shadow-2xl animate-[slideUp_0.18s_ease-out]">
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400"><FiCheckCircle size={24} /></div>
              <h3 className="text-xl font-bold text-white mb-1">Arqueo de Caja</h3>
              <p className="text-sm text-slate-400">Verifica los valores antes de entregar el efectivo.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl col-span-2 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Efectivo a entregar (Recaudo)</p>
                <p className="text-3xl font-bold text-emerald-400">${closureSummary.totalCollected.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Disponible en ruta</p>
                <p className="text-sm font-bold text-blue-400">${closureSummary.availableCapital.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cartera en la calle</p>
                <p className="text-sm font-bold text-white">${closureSummary.totalPortfolio.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas (Nuevos)</p>
                <p className="text-sm font-bold text-white">${closureSummary.newSales.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-[#0B0B12] border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Renovaciones</p>
                <p className="text-sm font-bold text-white">${closureSummary.renewals.toLocaleString('es-CO')}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-6 px-3 text-[10px] sm:text-xs text-slate-400 font-medium bg-white/5 py-2.5 rounded-lg">
              <span className="flex flex-col items-center gap-1"><FiMapPin size={14} /> Total: {closureSummary.totalClients}</span>
              <span className="flex flex-col items-center gap-1 text-emerald-400/80"><FiCheckCircle size={14} /> Pagos: {closureSummary.collectedClients}</span>
              <span className="flex flex-col items-center gap-1 text-orange-400/80"><FiClock size={14} /> Acuerdos: {closureSummary.renegotiatedClients || 0}</span>
              <span className="flex flex-col items-center gap-1 text-red-400/80"><FiAlertTriangle size={14} /> Mora: {closureSummary.overdueClients || 0}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setClosureModalOpen(false)} className="flex-1 py-3 bg-white/5 border border-white/5 text-slate-300 rounded-xl font-medium text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={handleConfirmClosure} disabled={isClosing} className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">{isClosing ? <FiLoader className="animate-spin" /> : 'Confirmar Cierre'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}