import { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, FiMapPin, FiSearch, 
  FiAlertTriangle, FiX, FiLoader, FiNavigation, FiCalendar, FiFilter, FiSlash,
  FiSun, FiMoon, FiCheckCircle, FiExternalLink, FiMap,
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuración de pines de mapa
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

// Utilidad para traducir estados
const traducirEstado = (status: string) => {
  switch (status) {
    case 'PAID': return 'PAGADO';
    case 'PARTIAL': return 'ABONO PARCIAL';
    case 'OVERDUE': return 'EN MORA';
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

export default function CarteraActiva() {
  const [clients, setClients] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'TODOS' | 'HOY' | 'PENDIENTES'>('HOY');
  
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  const [modalTab, setModalTab] = useState<'PLAN' | 'RECIBOS'>('PLAN');
  
  const [updatingInstId, setUpdatingInstId] = useState<number | null>(null);
  
  const [manualPayModal, setManualPayModal] = useState<{open: boolean, inst: any}>({ open: false, inst: null });
  const [manualAmount, setManualAmount] = useState("");
  const [confirmOverdue, setConfirmOverdue] = useState<{open: boolean, instId: number | null}>({ open: false, instId: null });

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

  const filteredData = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayLocalStr = `${yyyy}-${mm}-${dd}`; 

    return clients.filter(client => {
      const loan = client.loans[0];
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const cuotaActiva = loan?.installmentDetails?.find((i: any) => {
        if (!i.dueDate) return false;
        const dbDate = i.dueDate.split('T')[0];
        return i.status !== 'PAID' && dbDate <= todayLocalStr;
      });

      if (filter === 'HOY') return !!cuotaActiva;
      if (filter === 'PENDIENTES') return cuotaActiva?.status === 'PENDING' || cuotaActiva?.status === 'PARTIAL' || cuotaActiva?.status === 'OVERDUE';
      return true;
    });
  }, [clients, searchTerm, filter]);

  const routePolylineCoords = useMemo(() => {
    return filteredData
      .filter(c => c.latitude && c.longitude)
      .map(c => [c.latitude, c.longitude] as [number, number]);
  }, [filteredData]);

  useEffect(() => {
    if (routePolylineCoords.length > 0 && !focusCoords) {
      setFocusCoords(routePolylineCoords[0]);
    }
  }, [routePolylineCoords]);

  const handleUpdateStatus = async (instId: number, status: string, amount: number) => {
    setUpdatingInstId(instId);
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
        setConfirmOverdue({ open: false, instId: null }); 
        setManualAmount("");
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

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 md:h-[calc(100dvh-90px)] md:overflow-y-auto md:[&::-webkit-scrollbar]:hidden md:[-ms-overflow-style:none] md:[scrollbar-width:none] pb-10">
      
      {/* HEADER ALINEADO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Sistema Logístico</h1>
          <p className="text-sm text-slate-400 mt-1">Gestión de ruta, mapa GPS y cobros en tiempo real.</p>
        </div>

        {routeInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
            <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <FiMap size={14} />
                <span className="text-[10px] font-bold tracking-widest uppercase">Ruta Operativa</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {routeInfo.city}, {routeInfo.country} <span className="text-slate-500 text-xs ml-1">(ID: {routeInfo.id})</span>
              </p>
            </div>

            <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center border-b-2 border-b-green-500/50 shadow-[0_4px_20px_-10px_rgba(34,197,94,0.3)]">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <FiDollarSign size={14} className="text-green-400" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-green-400/80">Capital Disponible</span>
              </div>
              <p className="text-lg font-bold text-white">
                ${Math.round(Number(routeInfo.availableCapital) || 0).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MAPA */}
      <div className="w-full aspect-square md:aspect-[21/9] lg:h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-0 mb-6 bg-[#0B0B12]">
        <button
          onClick={() => setMapTheme(prev => prev === 'light' ? 'dark' : 'light')}
          className="absolute top-4 right-4 z-[400] p-3 bg-[#05050A]/80 backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/10 hover:bg-white/5 transition-all active:scale-95"
          title="Alternar estilo de mapa"
        >
          {mapTheme === 'light' ? <FiMoon size={20} className="text-blue-400" /> : <FiSun size={20} className="text-yellow-400" />}
        </button>

        <MapContainer center={[6.2442, -75.5812]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer 
            key={mapTheme}
            url={
              mapTheme === 'light' 
                ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            } 
            attribution='© <a href="https://carto.com/">CartoDB</a>'
          />

          {filter !== 'TODOS' && routePolylineCoords.length > 1 && (
             <Polyline 
               positions={routePolylineCoords} 
               pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '10, 10' }} 
             />
          )}

          {filteredData.map(client => {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayLocalStr = `${yyyy}-${mm}-${dd}`;

            const hasPaidToday = client.loans[0]?.installmentDetails?.some((i: any) => i.dueDate.startsWith(todayLocalStr) && i.status === 'PAID');
            
            return client.latitude && (
              <Marker key={client.id} position={[client.latitude, client.longitude]} icon={hasPaidToday ? greenIcon : redIcon}>
                <Popup className="custom-popup">
                  <div className="p-3 text-slate-800 bg-white rounded-xl">
                    <p className="font-bold text-sm mb-1">{client.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{client.address}</p>
                    <button 
                      onClick={() => openNavigationApp(client.latitude, client.longitude)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FiExternalLink size={14} /> Navegar
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <MapController coords={focusCoords} />
        </MapContainer>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8 relative z-10">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" placeholder="Buscar cliente..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
          />
        </div>

        <div className="flex bg-[#05050A]/50 p-1.5 rounded-2xl border border-white/10 overflow-x-auto [scrollbar-width:none]">
          {[ { id: 'HOY', label: 'Ruta Activa', icon: <FiNavigation /> }, { id: 'PENDIENTES', label: 'Mora', icon: <FiAlertTriangle /> }, { id: 'TODOS', label: 'Todos', icon: <FiFilter /> } ].map((btn) => (
            <button
              key={btn.id} onClick={() => setFilter(btn.id as any)}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filter === btn.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              {btn.icon} <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        {isLoading ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 text-slate-400 bg-[#0B0B12]/80 backdrop-blur-sm rounded-3xl border border-white/5">
            <FiLoader className="animate-spin text-blue-500" size={24} />
            <span className="text-sm font-semibold">Sincronizando ruta...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-[#0B0B12]/80 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl">
            <p className="text-slate-400 font-medium">No hay clientes que coincidan con los filtros.</p>
          </div>
        ) : filteredData.map(client => {
          const loan = client.loans[0];
          
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const todayLocalStr = `${yyyy}-${mm}-${dd}`;

          const cuotaActiva = loan?.installmentDetails?.find((i: any) => {
            if (!i.dueDate) return false;
            const dbDate = i.dueDate.split('T')[0];
            return i.status !== 'PAID' && dbDate <= todayLocalStr;
          });

          const prestamoTerminado = loan?.installmentDetails?.every((i: any) => i.status === 'PAID');

          return (
            <div 
              key={client.id} 
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                if (client.latitude && client.longitude) {
                  setFocusCoords([client.latitude, client.longitude]);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="bg-[#0B0B12]/80 backdrop-blur-sm border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-blue-500/30 transition-all cursor-pointer group shadow-xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 overflow-hidden items-center">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-base truncate">{client.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                      <FiMapPin className="shrink-0"/>
                      <span className="truncate">{client.address}</span>
                      {client.latitude && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openNavigationApp(client.latitude, client.longitude); }}
                          className="shrink-0 p-1 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500 hover:text-white transition-all"
                          title="Abrir GPS"
                        >
                          <FiExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); openClientModal(client); }} 
                  className="shrink-0 p-2.5 bg-[#05050A] border border-white/5 rounded-xl text-slate-400 hover:bg-blue-600/10 hover:text-blue-400 hover:border-blue-500/30 transition-all"
                >
                  <FiCalendar size={18} />
                </button>
              </div>

              {prestamoTerminado ? (
                 <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                   <FiCheckCircle className="mx-auto text-emerald-400 mb-2" size={20} />
                   <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest">Préstamo Finalizado</p>
                 </div>
              ) : cuotaActiva ? (
                <div className="bg-[#05050A]/50 border border-white/5 rounded-2xl p-5 shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
                      {cuotaActiva.status === 'OVERDUE' ? 'Cuota Atrasada' : 'Cuota Activa'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${cuotaActiva.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : cuotaActiva.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400' : cuotaActiva.status === 'OVERDUE' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {traducirEstado(cuotaActiva.status)}
                    </span>
                  </div>
                  
                  <div className="mb-5">
                    <p className="text-3xl font-bold text-white tracking-tight">
                      ${Math.round(Number(cuotaActiva.expectedAmount) || 0).toLocaleString('es-CO')}
                    </p>
                    {cuotaActiva.status === 'PARTIAL' && (
                      <p className="text-xs font-medium text-blue-400 mt-1.5">
                        Abonado: ${Math.round(Number(cuotaActiva.paidAmount) || 0).toLocaleString('es-CO')} 
                        <span className="text-slate-500 ml-1">
                          (Faltan: ${Math.round(Number(cuotaActiva.expectedAmount) - Number(cuotaActiva.paidAmount)).toLocaleString('es-CO')})
                        </span>
                      </p>
                    )}
                  </div>
                  
                  {(cuotaActiva.status === 'PENDING' || cuotaActiva.status === 'PARTIAL' || cuotaActiva.status === 'OVERDUE') && (
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const faltante = Number(cuotaActiva.expectedAmount) - Number(cuotaActiva.paidAmount || 0);
                          handleUpdateStatus(cuotaActiva.id, 'PAID', faltante);
                        }} 
                        disabled={updatingInstId === cuotaActiva.id} 
                        className="flex-[2] bg-blue-600 hover:bg-blue-500 active:scale-[0.98] py-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                      >
                        {updatingInstId === cuotaActiva.id ? <FiLoader className="animate-spin" /> : 'PAGO TOTAL'}
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setManualPayModal({ open: true, inst: cuotaActiva });
                          setManualAmount(""); 
                        }} 
                        className="flex-1 bg-white/5 hover:bg-white/10 active:scale-95 py-3 rounded-xl text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/5"
                      >
                        <FiDollarSign size={16} />
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmOverdue({ open: true, instId: cuotaActiva.id });
                        }} 
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 active:scale-95 py-3 rounded-xl text-red-400 border border-red-500/10 flex items-center justify-center transition-all"
                      >
                        <FiSlash size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                 <div className="p-5 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-center"><p className="text-xs text-slate-500 font-medium">Cliente al día.</p></div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODALES MANTIENEN SU ESTILO PERO CON BORDES REDONDEADOS ALINEADOS */}
      {/* MODAL DE SEGURIDAD: CONFIRMAR MORA */}
      {confirmOverdue.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#05050A] border border-white/10 rounded-3xl p-7 shadow-2xl text-center animate-[slideUp_0.18s_ease-out]">
            <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
              <FiAlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¿Reportar en Mora?</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Esta acción marcará la cuota del cliente como atrasada. ¿Estás seguro de continuar?</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmOverdue({ open: false, instId: null })} 
                className="flex-1 py-3 bg-white/5 border border-white/5 text-slate-300 rounded-xl font-medium text-sm hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmOverdue.instId && handleUpdateStatus(confirmOverdue.instId, 'OVERDUE', 0)}
                disabled={updatingInstId === confirmOverdue.instId}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                {updatingInstId === confirmOverdue.instId ? <FiLoader className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ABONO MANUAL */}
      {manualPayModal.open && (() => {
        const inst = manualPayModal.inst;
        const faltante = Math.round(Number(inst.expectedAmount) - Number(inst.paidAmount || 0));
        const excedido = parseFloat(manualAmount) > faltante;

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#05050A] border border-white/10 rounded-3xl p-7 shadow-2xl animate-[slideUp_0.18s_ease-out]">
              <div className="flex justify-between items-center mb-5">
                 <h3 className="text-lg font-bold text-white">Registrar Abono</h3>
                 <span className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded">Máx: ${faltante.toLocaleString('es-CO')}</span>
              </div>
              <div className="relative mb-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input 
                  type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} 
                  className={`w-full bg-[#0B0B12] border ${excedido ? 'border-red-500 focus:border-red-500 text-red-400' : 'border-white/10 focus:border-emerald-500 text-white'} rounded-2xl pl-8 pr-4 py-4 text-xl font-bold outline-none shadow-inner transition-colors`} 
                  placeholder="0.00" autoFocus
                />
              </div>
              {excedido && <p className="text-xs text-red-400 mb-4 font-medium">El abono supera el saldo pendiente.</p>}
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => setManualPayModal({ open: false, inst: null })} className="flex-1 py-3.5 border border-white/5 text-slate-300 font-medium text-sm bg-[#0B0B12] hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button 
                  onClick={() => handleUpdateStatus(inst.id, 'PARTIAL', parseFloat(manualAmount))}
                  disabled={updatingInstId === inst.id || !manualAmount || excedido}
                  className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                >
                  {updatingInstId === inst.id ? <FiLoader className="animate-spin" /> : 'Confirmar Abono'}
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
                <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center font-bold text-lg border border-blue-500/20">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{selectedClient.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Auditoría Financiera</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-2 bg-[#0B0B12] border border-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                <FiX size={18} />
              </button>
            </div>

            <div className="flex border-b border-white/5 bg-[#0B0B12] px-6 shrink-0">
              <button 
                onClick={() => setModalTab('PLAN')} 
                className={`py-4 px-2 mr-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${modalTab === 'PLAN' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Plan de Cuotas
              </button>
              <button 
                onClick={() => setModalTab('RECIBOS')} 
                className={`py-4 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${modalTab === 'RECIBOS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Historial de Pagos
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              {modalTab === 'PLAN' && (
                selectedClient.loans[0]?.installmentDetails?.map((inst: any) => (
                  <div key={inst.id} className={`flex flex-col gap-3 p-4 rounded-2xl border transition-colors ${inst.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/10' : inst.status === 'PARTIAL' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-[#0B0B12] border-white/5 hover:border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-0.5">Cuota #{inst.installmentNumber}</p>
                        <p className="text-sm font-semibold text-slate-200">{new Date(inst.dueDate).toLocaleDateString('es-CO')}</p>
                      </div>
                      <div className="text-right">
                         <p className={`font-bold text-base ${inst.status === 'PAID' ? 'text-emerald-400' : inst.status === 'OVERDUE' ? 'text-red-400' : 'text-white'}`}>
                           ${Math.round(Number(inst.expectedAmount) || 0).toLocaleString('es-CO')}
                         </p>
                         <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${inst.status === 'PARTIAL' ? 'text-blue-400' : 'text-slate-500'}`}>
                           {inst.status === 'PARTIAL' ? `Faltan $${Math.round(Number(inst.expectedAmount) - Number(inst.paidAmount)).toLocaleString('es-CO')}` : traducirEstado(inst.status)}
                         </p>
                      </div>
                    </div>

                    {inst.status !== 'PAID' && (
                      <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                        <button 
                          onClick={() => {
                            const faltante = Number(inst.expectedAmount) - Number(inst.paidAmount || 0);
                            handleUpdateStatus(inst.id, 'PAID', faltante);
                          }} 
                          disabled={updatingInstId === inst.id} 
                          className="flex-[2] bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 py-2.5 rounded-xl text-blue-400 text-xs font-semibold transition-all flex items-center justify-center"
                        >
                          {updatingInstId === inst.id ? <FiLoader className="animate-spin" /> : 'Liquidar Cuota'}
                        </button>
                        <button 
                          onClick={() => {
                            setManualPayModal({ open: true, inst: inst });
                            setManualAmount(""); 
                          }} 
                          className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-slate-300 flex items-center justify-center transition-colors border border-white/5"
                        >
                          <FiDollarSign size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {modalTab === 'RECIBOS' && (
                selectedClient.loans[0]?.payments?.length > 0 ? (
                  selectedClient.loans[0].payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#0B0B12] border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
                          <FiCheckCircle size={16} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium mb-0.5">Recibo #{payment.id}</p>
                          <p className="text-xs font-semibold text-slate-200">
                            {new Date(payment.createdAt).toLocaleDateString('es-CO')} - {new Date(payment.createdAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-emerald-400 text-base">
                        +${Math.round(Number(payment.amount) || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                     <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center text-slate-500 mb-3">
                       <FiDollarSign size={20} />
                     </div>
                     <p className="text-slate-300 text-sm font-medium">No hay pagos registrados</p>
                     <p className="text-xs text-slate-500 mt-1 text-center px-6">Los recibos de abonos y liquidaciones aparecerán aquí automáticamente.</p>
                  </div>
                )
              )}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-[#0B0B12] rounded-b-[30px] shrink-0 text-center">
               <p className="text-xs text-slate-500 font-medium">Auditoría en tiempo real conectada a la base de datos.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}