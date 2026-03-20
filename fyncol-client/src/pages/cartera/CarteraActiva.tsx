import { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, FiMapPin, FiSearch, 
  FiAlertTriangle, FiX, FiLoader, FiNavigation,
  FiSun, FiMoon, FiCheckCircle, FiExternalLink, FiMap, FiCalendar
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
    <div className="flex flex-col md:flex-row h-[calc(100dvh-64px)] w-full bg-[#0B0B12] overflow-hidden">
      
      {/* PANEL LATERAL IZQUIERDO: LISTADO DE CLIENTES */}
      <div className="w-full md:w-[420px] lg:w-[480px] h-[50vh] md:h-full flex flex-col bg-[#05050A] border-r border-white/10 shrink-0 z-10 shadow-2xl">
        
        {/* Cabecera del Panel */}
        <div className="p-5 border-b border-white/5 shrink-0 bg-[#0B0B12]">
          <h1 className="text-xl font-bold text-white mb-4">Sistema Logístico</h1>
          
          {routeInfo && (
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl mb-4 border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><FiMap size={12}/> Ruta Activa</span>
                <span className="text-sm font-semibold text-white">{routeInfo.city}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest">Capital</span>
                <span className="text-sm font-bold text-green-400">${Math.round(Number(routeInfo.availableCapital) || 0).toLocaleString('es-CO')}</span>
              </div>
            </div>
          )}

          {/* Buscador */}
          <div className="relative mb-3">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Buscar cliente..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#05050A] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filtros */}
          <div className="flex bg-[#05050A] p-1 rounded-xl border border-white/10">
            {[ { id: 'HOY', label: 'Ruta' }, { id: 'PENDIENTES', label: 'Mora' }, { id: 'TODOS', label: 'Todos' } ].map((btn) => (
              <button
                key={btn.id} onClick={() => setFilter(btn.id as any)}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${filter === btn.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
          {isLoading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-400">
              <FiLoader className="animate-spin text-blue-500" size={24} />
              <span className="text-sm">Sincronizando ruta...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No hay clientes que coincidan con los filtros.
            </div>
          ) : (
            filteredData.map((client, index) => {
              const loan = client.loans[0];
              const today = new Date();
              const todayLocalStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              
              const cuotaActiva = loan?.installmentDetails?.find((i: any) => {
                if (!i.dueDate) return false;
                const dbDate = i.dueDate.split('T')[0];
                return i.status !== 'PAID' && dbDate <= todayLocalStr;
              });

              const prestamoTerminado = loan?.installmentDetails?.every((i: any) => i.status === 'PAID');
              const hasPaidToday = loan?.installmentDetails?.some((i: any) => i.dueDate.startsWith(todayLocalStr) && i.status === 'PAID');

              return (
                <div 
                  key={client.id}
                  onClick={() => {
                    if (client.latitude && client.longitude) {
                      setFocusCoords([client.latitude, client.longitude]);
                    }
                  }}
                  className="flex p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="w-8 shrink-0 text-slate-500 font-bold text-sm pt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-sm text-white truncate pr-2">{client.name}</h3>
                      {hasPaidToday || prestamoTerminado ? (
                         <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} title="Pagado hoy / Terminado" />
                      ) : cuotaActiva?.status === 'OVERDUE' ? (
                         <FiAlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} title="En Mora" />
                      ) : (
                         <div className="w-4 h-4 rounded-full border-2 border-slate-600 shrink-0 mt-0.5"></div>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400 flex items-center gap-1 mb-2 truncate">
                      <FiMapPin className="shrink-0" size={10}/> {client.address}
                    </div>

                    {/* Información y Botones de Cuota */}
                    {cuotaActiva && !prestamoTerminado && (
                      <div className="mt-2 bg-[#0B0B12] rounded-lg p-2.5 border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-xs font-bold text-white">
                             ${Math.round(Number(cuotaActiva.expectedAmount) || 0).toLocaleString('es-CO')}
                           </span>
                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-blue-400 bg-blue-500/10 uppercase">
                             Cuota {cuotaActiva.installmentNumber}
                           </span>
                        </div>
                        
                        {(cuotaActiva.status === 'PENDING' || cuotaActiva.status === 'PARTIAL' || cuotaActiva.status === 'OVERDUE') && (
                          <div className="flex gap-1.5">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const faltante = Number(cuotaActiva.expectedAmount) - Number(cuotaActiva.paidAmount || 0);
                                handleUpdateStatus(cuotaActiva.id, 'PAID', faltante);
                              }} 
                              disabled={updatingInstId === cuotaActiva.id}
                              className="flex-[2] bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-white text-[10px] font-bold flex justify-center items-center transition-all"
                            >
                              {updatingInstId === cuotaActiva.id ? <FiLoader className="animate-spin" size={12} /> : 'PAGAR'}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setManualPayModal({ open: true, inst: cuotaActiva }); setManualAmount(""); }}
                              className="flex-1 bg-white/10 hover:bg-white/20 py-1.5 rounded text-white text-[10px] font-bold flex justify-center items-center transition-all"
                            >
                              ABONO
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmOverdue({ open: true, instId: cuotaActiva.id }); }}
                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded text-[10px] font-bold flex justify-center items-center transition-all"
                            >
                              MORA
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openClientModal(client); }}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                      >
                        <FiCalendar size={10} /> Historial
                      </button>
                      {client.latitude && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openNavigationApp(client.latitude, client.longitude); }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                        >
                          <FiNavigation size={10} /> GPS
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ÁREA DERECHA: MAPA */}
      <div className="flex-1 h-[50vh] md:h-full relative z-0">
        <button
          onClick={() => setMapTheme(prev => prev === 'light' ? 'dark' : 'light')}
          className="absolute top-4 right-4 z-[400] p-2.5 bg-[#05050A]/80 backdrop-blur-md text-white rounded-lg shadow-xl border border-white/10 hover:bg-white/5 transition-all"
          title="Alternar estilo de mapa"
        >
          {mapTheme === 'light' ? <FiMoon size={18} className="text-blue-400" /> : <FiSun size={18} className="text-yellow-400" />}
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
                  <div className="p-3 text-slate-800 bg-white rounded-xl shadow-lg">
                    <p className="font-bold text-sm mb-1">{client.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{client.address}</p>
                    <button 
                      onClick={() => openNavigationApp(client.latitude, client.longitude)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FiExternalLink size={12} /> Navegar
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <MapController coords={focusCoords} />
        </MapContainer>
      </div>

      {/* ==========================================================
          MODALES (Se mantienen exactamente igual para no perder funcionalidad)
          ========================================================== */}
      
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