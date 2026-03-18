import { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, FiMapPin, FiSearch, 
  FiAlertTriangle, FiX, FiLoader, FiNavigation, FiCalendar, FiFilter, FiSlash 
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
  
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  const [isUpdating, setIsUpdating] = useState(false);
  const [manualPayModal, setManualPayModal] = useState<{open: boolean, inst: any}>({ open: false, inst: null });
  const [manualAmount, setManualAmount] = useState("");

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
        await fetchCartera();
        if (selectedClient) setSelectedClient(null); // Cierra modal para refrescar datos limpiamente
      }
    } catch (error) {
      console.error("Error updating status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-white p-4 md:p-8 pb-24">
      
      {/* HEADER: Adaptable a móvil */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic">SISTEMA LOGÍSTICO</h1>
          <p className="text-sm text-slate-500">Gestión de ruta y cobros en tiempo real.</p>
        </div>

        {routeInfo && (
          <div className="flex w-full md:w-auto gap-3">
            <div className="flex-1 md:flex-none bg-[#0B0B12] border border-white/10 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] text-emerald-500 uppercase font-black block mb-1">Caja Ruta</span>
              <p className="text-lg md:text-xl font-black">${Number(routeInfo.availableCapital).toLocaleString('es-CO')}</p>
            </div>
          </div>
        )}
      </header>

      {/* MAPA: Proporción dinámica */}
      <div className="w-full aspect-square md:aspect-[21/9] lg:h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-0 mb-6 bg-slate-900">
        <MapContainer center={[6.2442, -75.5812]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {filteredData.map(client => {
            const todayStr = new Date().toISOString().split('T')[0];
            const hasPaidToday = client.loans[0]?.installmentDetails?.some((i: any) => i.dueDate.startsWith(todayStr) && i.status === 'PAID');
            
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

      {/* CONTROLES: Buscador y Filtros */}
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
          {[ { id: 'HOY', label: 'Hoy', icon: <FiNavigation /> }, { id: 'PENDIENTES', label: 'Mora', icon: <FiAlertTriangle /> }, { id: 'TODOS', label: 'Todos', icon: <FiFilter /> } ].map((btn) => (
            <button
              key={btn.id} onClick={() => setFilter(btn.id as any)}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all ${filter === btn.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {btn.icon} <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLIENTES (Grid Responsivo) */}
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
          const todayStr = new Date().toISOString().split('T')[0];
          const cuotaHoy = loan?.installmentDetails?.find((i: any) => i.dueDate.startsWith(todayStr));

          return (
            <div key={client.id} className="bg-[#0B0B12] border border-white/10 rounded-3xl p-5 flex flex-col justify-between">
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
                <button onClick={() => setSelectedClient(client)} className="shrink-0 p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
                  <FiCalendar size={18} />
                </button>
              </div>

              {cuotaHoy ? (
                <div className={`p-4 rounded-2xl border ${cuotaHoy.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#05050A] border-white/5'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-slate-500 uppercase font-black">Cuota de Hoy</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${cuotaHoy.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {cuotaHoy.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white mb-4">${Number(cuotaHoy.expectedAmount).toLocaleString('es-CO')}</p>
                  
                  {cuotaHoy.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(cuotaHoy.id, 'PAID', Number(cuotaHoy.expectedAmount))} disabled={isUpdating} className="flex-[2] bg-blue-600 active:bg-blue-700 py-3 rounded-xl text-white text-xs font-black transition-all">
                        PAGO TOTAL
                      </button>
                      <button onClick={() => setManualPayModal({ open: true, inst: cuotaHoy })} className="flex-1 bg-white/10 active:bg-white/20 py-3 rounded-xl text-white flex items-center justify-center transition-all">
                        <FiDollarSign size={16} />
                      </button>
                      <button onClick={() => handleUpdateStatus(cuotaHoy.id, 'OVERDUE', 0)} className="flex-1 bg-red-500/20 active:bg-red-500/30 py-3 rounded-xl text-red-400 flex items-center justify-center transition-all">
                        <FiSlash size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                 <div className="p-4 bg-white/5 rounded-2xl text-center"><p className="text-xs text-slate-500 italic">Sin cuota programada hoy</p></div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: ABONO MANUAL (Protegido con z-index alto) */}
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

      {/* MODAL: HISTORIAL DEL CLIENTE */}
      {selectedClient && (
        <div className="fixed inset-0 z-[9998] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4" onClick={() => setSelectedClient(null)}>
          <div className="w-full max-w-lg bg-[#12121A] border border-white/10 rounded-[35px] shadow-2xl flex flex-col h-[85vh] md:h-[600px] overflow-hidden animate-[slideUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0B0B12]">
              <div><h3 className="text-xl font-black text-white">{selectedClient.name}</h3><p className="text-xs text-blue-500 font-black uppercase">Plan de pagos</p></div>
              <button onClick={() => setSelectedClient(null)} className="p-3 bg-white/5 rounded-full text-slate-400"><FiX size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedClient.loans[0]?.installmentDetails?.map((inst: any) => (
                <div key={inst.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#05050A] border border-white/5">
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">Cuota #{inst.installmentNumber}</p>
                    <p className="text-sm text-white">{new Date(inst.dueDate).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div className="text-right">
                     <p className={`font-black ${inst.status === 'PAID' ? 'text-emerald-400' : inst.status === 'OVERDUE' ? 'text-red-400' : 'text-blue-400'}`}>${Number(inst.expectedAmount).toLocaleString('es-CO')}</p>
                     <p className="text-[10px] text-slate-500 uppercase">{inst.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}