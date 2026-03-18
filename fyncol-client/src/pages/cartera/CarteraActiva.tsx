import { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, FiMapPin, FiSearch, 
  FiAlertTriangle, FiX, FiLoader, FiNavigation, FiCalendar, FiFilter, FiSlash,
  FiSun, FiMoon, FiCheckCircle
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (coords[0] && coords[1]) {
      map.flyTo(coords, 14, { animate: true, duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

export default function CarteraActiva() {
  const [clients, setClients] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'TODOS' | 'HOY' | 'PENDIENTES'>('HOY');
  
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');
  
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  const [modalTab, setModalTab] = useState<'PLAN' | 'RECIBOS'>('PLAN');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [manualPayModal, setManualPayModal] = useState<{open: boolean, inst: any}>({ open: false, inst: null });
  const [manualAmount, setManualAmount] = useState("");

  // NUEVO: Estado para el modal de seguridad "OVERDUE"
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

  // FILTRO INTELIGENTE: ARRASTRE DE MORA Y RUTA DE HOY
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

      // LA MAGIA: Buscar la primera cuota que NO esté pagada y que sea de HOY o ANTES de hoy.
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
        setConfirmOverdue({ open: false, instId: null }); // Cierra alerta de seguridad si estaba abierta
        setManualAmount("");
        await fetchCartera();
        if (selectedClient) {
          // Si el modal del cliente está abierto, refresca sus datos sin cerrarlo
           const resData = await fetch(`${baseUrl}/api/clients/cartera`, { headers: { 'Authorization': `Bearer ${token}` } });
           const updatedData = await resData.json();
           const refreshedClient = updatedData.clients.find((c: any) => c.id === selectedClient.id);
           setSelectedClient(refreshedClient);
        }
      }
    } catch (error) {
      console.error("Error updating status");
    } finally {
      setIsUpdating(false);
    }
  };

  const openClientModal = (client: any) => {
    setSelectedClient(client);
    setModalTab('PLAN');
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-white p-4 md:p-8 pb-24">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic">SISTEMA LOGÍSTICO</h1>
          <p className="text-sm text-slate-500">Gestión de ruta y cobros en tiempo real.</p>
        </div>

        {routeInfo && (
          <div className="flex w-full md:w-auto gap-3">
            <div className="flex-1 md:flex-none bg-[#0B0B12] border border-white/10 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] text-emerald-500 uppercase font-black block mb-1">Caja Ruta</span>
              <p className="text-lg md:text-xl font-black">${Math.round(Number(routeInfo.availableCapital) || 0).toLocaleString('es-CO')}</p>
            </div>
          </div>
        )}
      </header>

      {/* MAPA */}
      <div className="w-full aspect-square md:aspect-[21/9] lg:h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-0 mb-6 bg-[#0B0B12]">
        <button
          onClick={() => setMapTheme(prev => prev === 'light' ? 'dark' : 'light')}
          className="absolute top-4 right-4 z-[400] p-3 bg-[#0B0B12]/80 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 hover:scale-105 transition-all active:scale-95"
          title="Alternar estilo de mapa"
        >
          {mapTheme === 'light' ? <FiMoon size={22} className="text-blue-400" /> : <FiSun size={22} className="text-yellow-400" />}
        </button>

        <MapContainer center={[6.2442, -75.5812]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer 
            key={mapTheme}
            url={
              mapTheme === 'light' 
                ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            } 
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          />
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
                  <div className="p-2">
                    <p className="font-bold text-slate-900">{client.name}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {filteredData[0]?.latitude && <RecenterMap coords={[filteredData[0].latitude, filteredData[0].longitude]} />}
        </MapContainer>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8 relative z-10">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" placeholder="Buscar cliente..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B0B12] border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:border-blue-500 transition-all text-sm outline-none"
          />
        </div>

        <div className="flex bg-[#0B0B12] p-1.5 rounded-2xl border border-white/10 overflow-x-auto [scrollbar-width:none]">
          {[ { id: 'HOY', label: 'Ruta Activa', icon: <FiNavigation /> }, { id: 'PENDIENTES', label: 'Mora', icon: <FiAlertTriangle /> }, { id: 'TODOS', label: 'Todos', icon: <FiFilter /> } ].map((btn) => (
            <button
              key={btn.id} onClick={() => setFilter(btn.id as any)}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all ${filter === btn.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {btn.icon} <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 relative z-10">
        {isLoading ? (
          <div className="col-span-full py-10 flex flex-col items-center text-slate-500">
            <FiLoader className="animate-spin mb-2" size={32} />
            <p className="text-sm font-bold">Cargando datos...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full py-10 text-center border border-dashed border-white/10 rounded-3xl">
            <p className="text-slate-500 italic">No hay clientes que coincidan con la búsqueda.</p>
          </div>
        ) : filteredData.map(client => {
          const loan = client.loans[0];
          
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const todayLocalStr = `${yyyy}-${mm}-${dd}`;

          // Buscamos la cuota que le toca hoy o la que debe del pasado
          const cuotaActiva = loan?.installmentDetails?.find((i: any) => {
            if (!i.dueDate) return false;
            const dbDate = i.dueDate.split('T')[0];
            return i.status !== 'PAID' && dbDate <= todayLocalStr;
          });

          return (
            <div key={client.id} className="bg-[#0B0B12] border border-white/10 rounded-3xl p-5 flex flex-col justify-between hover:border-blue-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 overflow-hidden">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-blue-600/20 text-blue-500 flex items-center justify-center font-black text-xl">
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-black text-base md:text-lg truncate">{client.name}</h3>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1"><FiMapPin size={10} className="shrink-0"/> {client.address}</p>
                  </div>
                </div>
                <button onClick={() => openClientModal(client)} className="shrink-0 p-3 bg-white/5 rounded-xl text-slate-400 hover:bg-blue-600/20 hover:text-blue-400 transition-all">
                  <FiCalendar size={18} />
                </button>
              </div>

              {cuotaActiva ? (
                <div className={`p-4 rounded-2xl border ${cuotaActiva.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20' : cuotaActiva.status === 'PARTIAL' ? 'bg-blue-500/10 border-blue-500/20' : cuotaActiva.status === 'OVERDUE' ? 'bg-red-500/10 border-red-500/20' : 'bg-[#05050A] border-white/5'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-slate-500 uppercase font-black">
                      {cuotaActiva.status === 'OVERDUE' ? 'Cuota Atrasada' : 'Cuota Activa'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${cuotaActiva.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : cuotaActiva.status === 'PARTIAL' ? 'bg-blue-500/20 text-blue-400' : cuotaActiva.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {cuotaActiva.status === 'PAID' ? 'PAGADO' : cuotaActiva.status === 'PARTIAL' ? 'ABONO PARCIAL' : cuotaActiva.status === 'OVERDUE' ? 'EN MORA' : 'PENDIENTE'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-2xl font-black text-white">
                      ${Math.round(Number(cuotaActiva.expectedAmount) || 0).toLocaleString('es-CO')}
                    </p>
                    {cuotaActiva.status === 'PARTIAL' && (
                      <p className="text-xs font-bold text-blue-400 mt-1">
                        Abonado: ${Math.round(Number(cuotaActiva.paidAmount) || 0).toLocaleString('es-CO')} 
                        <span className="text-slate-500 ml-2 font-normal">
                          (Faltan: ${Math.round(Number(cuotaActiva.expectedAmount) - Number(cuotaActiva.paidAmount)).toLocaleString('es-CO')})
                        </span>
                      </p>
                    )}
                  </div>
                  
                  {(cuotaActiva.status === 'PENDING' || cuotaActiva.status === 'PARTIAL' || cuotaActiva.status === 'OVERDUE') && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const faltante = Number(cuotaActiva.expectedAmount) - Number(cuotaActiva.paidAmount || 0);
                          handleUpdateStatus(cuotaActiva.id, 'PAID', faltante);
                        }} 
                        disabled={isUpdating} 
                        className="flex-[2] bg-blue-600 hover:bg-blue-500 active:scale-95 py-3 rounded-xl text-white text-xs font-black transition-all"
                      >
                        PAGO TOTAL
                      </button>
                      
                      <button 
                        onClick={() => {
                          setManualPayModal({ open: true, inst: cuotaActiva });
                          setManualAmount(""); 
                        }} 
                        className="flex-1 bg-white/10 hover:bg-white/20 active:scale-95 py-3 rounded-xl text-white flex items-center justify-center transition-all"
                      >
                        <FiDollarSign size={16} />
                      </button>
                      
                      {/* Botón OVERDUE modificado para disparar la alerta de seguridad */}
                      <button 
                        onClick={() => setConfirmOverdue({ open: true, instId: cuotaActiva.id })} 
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 active:scale-95 py-3 rounded-xl text-red-400 flex items-center justify-center transition-all"
                      >
                        <FiSlash size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                 <div className="p-4 bg-white/5 rounded-2xl text-center"><p className="text-xs text-slate-500 italic">Cliente al día.</p></div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE SEGURIDAD: CONFIRMAR MORA (OVERDUE) */}
      {confirmOverdue.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-[#12121A] border border-red-500/30 rounded-[35px] p-8 shadow-2xl text-center animate-[scaleIn_0.2s_ease-out]">
            <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <FiAlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">¿Reportar Mora?</h3>
            <p className="text-sm text-slate-400 mb-8">Esta acción marcará al cliente como moroso y afectará su historial. ¿Estás seguro?</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmOverdue({ open: false, instId: null })} 
                className="flex-1 py-4 bg-white/5 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmOverdue.instId && handleUpdateStatus(confirmOverdue.instId, 'OVERDUE', 0)}
                disabled={isUpdating}
                className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-500 transition-all disabled:opacity-50"
              >
                Sí, Reportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ABONO MANUAL */}
      {manualPayModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#12121A] border border-white/10 rounded-[35px] p-6 pb-10 md:pb-6 shadow-2xl animate-[slideUp_0.2s_ease-out]">
            <h3 className="text-xl font-black text-white mb-4">Monto Recibido</h3>
            <input 
              type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} 
              className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-2xl text-white text-center font-black focus:border-emerald-500 outline-none mb-6" 
              placeholder="0" autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setManualPayModal({ open: false, inst: null })} className="flex-1 py-4 text-slate-400 font-bold text-sm bg-white/5 rounded-xl">Cancelar</button>
              <button 
                onClick={() => handleUpdateStatus(manualPayModal.inst.id, 'PARTIAL', parseFloat(manualAmount))}
                disabled={isUpdating || !manualAmount}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black text-sm disabled:opacity-50"
              >
                REGISTRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DEL CLIENTE (PLAN Y RECIBOS) */}
      {selectedClient && (
        <div className="fixed inset-0 z-[9998] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4" onClick={() => setSelectedClient(null)}>
          <div className="w-full max-w-lg bg-[#12121A] border border-white/10 rounded-[35px] shadow-2xl flex flex-col h-[85vh] md:h-[650px] overflow-hidden animate-[slideUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            
            {/* Cabecera */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0B0B12]">
              <div>
                <h3 className="text-xl font-black text-white">{selectedClient.name}</h3>
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">Auditoría Financiera</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-3 bg-white/5 rounded-full text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all">
                <FiX size={20} />
              </button>
            </div>

            {/* Pestañas */}
            <div className="flex border-b border-white/5 bg-[#0B0B12] px-4">
              <button 
                onClick={() => setModalTab('PLAN')} 
                className={`flex-1 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${modalTab === 'PLAN' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Plan de Cuotas
              </button>
              <button 
                onClick={() => setModalTab('RECIBOS')} 
                className={`flex-1 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${modalTab === 'RECIBOS' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Recibos de Pago
              </button>
            </div>
            
            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#05050A]">
              
              {/* PESTAÑA 1: PLAN (CON COBROS ADELANTADOS) */}
              {modalTab === 'PLAN' && (
                selectedClient.loans[0]?.installmentDetails?.map((inst: any) => (
                  <div key={inst.id} className={`flex flex-col gap-3 p-4 rounded-2xl border ${inst.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/10' : inst.status === 'PARTIAL' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-[#0B0B12] border-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">Cuota #{inst.installmentNumber}</p>
                        <p className="text-sm text-white">{new Date(inst.dueDate).toLocaleDateString('es-CO')}</p>
                      </div>
                      <div className="text-right">
                         <p className={`font-black ${inst.status === 'PAID' ? 'text-emerald-400' : inst.status === 'OVERDUE' ? 'text-red-400' : 'text-white'}`}>
                           ${Math.round(Number(inst.expectedAmount) || 0).toLocaleString('es-CO')}
                         </p>
                         <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                           {inst.status === 'PARTIAL' ? `Faltan $${Math.round(Number(inst.expectedAmount) - Number(inst.paidAmount)).toLocaleString('es-CO')}` : inst.status}
                         </p>
                      </div>
                    </div>

                    {/* Controles para pagos adelantados */}
                    {inst.status !== 'PAID' && (
                      <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                        <button 
                          onClick={() => {
                            const faltante = Number(inst.expectedAmount) - Number(inst.paidAmount || 0);
                            handleUpdateStatus(inst.id, 'PAID', faltante);
                          }} 
                          disabled={isUpdating} 
                          className="flex-[2] bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-white text-[10px] font-black transition-all"
                        >
                          LIQUIDAR CUOTA
                        </button>
                        <button 
                          onClick={() => {
                            setManualPayModal({ open: true, inst: inst });
                            setManualAmount(""); 
                          }} 
                          className="flex-1 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-white flex items-center justify-center transition-all"
                        >
                          <FiDollarSign size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* PESTAÑA 2: RECIBOS (AUDITORÍA DE PAGOS) */}
              {modalTab === 'RECIBOS' && (
                selectedClient.loans[0]?.payments?.length > 0 ? (
                  selectedClient.loans[0].payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                          <FiCheckCircle size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold mb-0.5">Recibo #{payment.id}</p>
                          <p className="text-xs text-white">
                            {new Date(payment.createdAt).toLocaleDateString('es-CO')} a las {new Date(payment.createdAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <p className="font-black text-emerald-400 text-lg tracking-tighter">
                        +${Math.round(Number(payment.amount) || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                     <FiAlertTriangle className="mx-auto text-slate-600 mb-3" size={24} />
                     <p className="text-slate-500 text-sm font-bold">Sin ingresos registrados.</p>
                     <p className="text-xs text-slate-600 mt-1">Los pagos aparecerán aquí automáticamente.</p>
                  </div>
                )
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}