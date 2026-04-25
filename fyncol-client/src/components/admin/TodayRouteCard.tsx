// src/components/admin/TodayRouteCard.tsx
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FiMapPin, FiUser, FiNavigation, FiLoader } from "react-icons/fi";

// Iconos personalizados de Leaflet
const clientIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const cobradorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para animar la cámara del mapa
function MapFocusController({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] !== 0 && coords[1] !== 0) {
      map.flyTo(coords, 16, { animate: true, duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

// CORRECCIÓN DEFINITIVA: Observador de redimensionamiento nativo
function MapResizer() {
  const map = useMap();
  
  useEffect(() => {
    // 1. Forzar un redibujado inicial de seguridad
    map.invalidateSize();

    // 2. Crear un observador que escuche cambios físicos en el contenedor
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    const container = map.getContainer();
    if (container) {
      observer.observe(container);
    }

    // Limpieza al desmontar
    return () => {
      if (container) observer.unobserve(container);
      observer.disconnect();
    };
  }, [map]);
  
  return null;
}

export default function TodayRouteCard({ routeId }: { routeId: number }) {
  const [clients, setClients] = useState<any[]>([]);
  const [cobradorData, setCobradorData] = useState<any>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Control de vista móvil para alternar entre lista y mapa
  const [mobileView, setMobileView] = useState<'LIST' | 'MAP'>('LIST');

  const fetchRealTimeData = async () => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/rutas/${routeId}/monitoreo-hoy`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setClients(data.clientes || []);
        
        // Verificamos si el backend envió datos válidos del cobrador
        if (data.cobrador && data.cobrador.latitude && data.cobrador.longitude) {
            setCobradorData(data.cobrador);
        } else {
            setCobradorData(null);
        }

        // Auto-enfoque inicial
        setFocusCoords(prev => {
          if (!prev) {
            if (data.cobrador?.latitude && data.cobrador?.longitude) {
              return [data.cobrador.latitude, data.cobrador.longitude];
            } else if (data.clientes?.length > 0 && data.clientes[0].latitude) {
              return [data.clientes[0].latitude, data.clientes[0].longitude];
            }
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error al obtener datos de monitoreo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;

    // En lugar de setInterval, usamos un polling recursivo para evitar que las llamadas se acumulen
    const pollData = async () => {
      if (!isMounted) return;
      await fetchRealTimeData();
      
      if (isMounted) {
        timer = setTimeout(pollData, 15000);
      }
    };

    pollData();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [routeId]);

  const mapCenter: [number, number] = focusCoords || [4.5709, -74.2973];

  return (
    <div className="bg-[#0B1020]/60 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col mb-8 overflow-hidden w-full">
      
      {/* TABS PARA MÓVIL */}
      <div className="flex lg:hidden bg-white/5 border-b border-white/10 w-full">
        <button 
          onClick={() => setMobileView('LIST')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mobileView === 'LIST' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
        >
          Lista de Clientes
        </button>
        <button 
          onClick={() => setMobileView('MAP')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mobileView === 'MAP' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}
        >
          Ver en Mapa
        </button>
      </div>

      <div className="flex flex-col lg:flex-row h-[70vh] min-h-[400px] lg:h-[500px] w-full">
        
        {/* SECCIÓN IZQUIERDA: LISTA */}
        <div className={`w-full lg:w-1/3 flex-col border-r border-white/10 p-5 ${mobileView === 'MAP' ? 'hidden lg:flex' : 'flex'} h-full`}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 shrink-0">
            <FiMapPin className="text-blue-400" />
            Ruta de Hoy
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
            {isLoading && clients.length === 0 ? (
               <div className="flex justify-center items-center py-10 text-slate-400">
                 <FiLoader className="animate-spin" size={24} />
               </div>
            ) : clients.length === 0 ? (
              <p className="text-slate-400 text-sm text-center mt-10">No hay cobros pendientes para hoy.</p>
            ) : (
              clients.map((client) => (
                <div 
                  key={client.id} 
                  onClick={() => {
                    if (client.latitude && client.longitude) {
                      setFocusCoords([client.latitude, client.longitude]);
                      setMobileView('MAP'); 
                    }
                  }}
                  className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-semibold text-sm text-white flex items-center gap-2 overflow-hidden">
                      <FiUser className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0" size={14} />
                      <span className="truncate">{client.name}</span>
                    </p>
                    {!client.latitude && (
                      <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 shrink-0">Sin GPS</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{client.address}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECCIÓN DERECHA: MAPA */}
        <div className={`w-full lg:w-2/3 h-full relative z-0 ${mobileView === 'LIST' ? 'hidden lg:block' : 'block'}`}>
          
          {cobradorData && (
            <div className="absolute top-4 right-4 z-[400] bg-[#05050A]/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl flex items-center gap-2 max-w-[calc(100%-2rem)] overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white leading-none truncate">
                  {cobradorData.name}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5 truncate">
                  Actualizado: {new Date(cobradorData.lastUpdate).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          )}

          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            style={{ height: "100%", width: "100%", zIndex: 1 }}
            zoomControl={false} 
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <MapFocusController coords={focusCoords} />
            
            {/* Componente que asegura el dibujado en dispositivos móviles */}
            <MapResizer />

            {clients.map((client) => (
               client.latitude && client.longitude && (
                <Marker 
                  key={client.id} 
                  position={[client.latitude, client.longitude]} 
                  icon={clientIcon}
                >
                  <Popup>
                    <strong className="text-[#0B1020]">{client.name}</strong><br/>
                    <span className="text-slate-600 text-xs">{client.address}</span>
                  </Popup>
                </Marker>
              )
            ))}

            {cobradorData && cobradorData.latitude && cobradorData.longitude && (
              <Marker 
                position={[cobradorData.latitude, cobradorData.longitude]} 
                icon={cobradorIcon}
              >
                <Popup>
                  <div className="flex flex-col text-[#0B1020]">
                    <span className="font-bold text-sm flex items-center gap-1 text-emerald-700">
                      <FiNavigation />
                      {cobradorData.name}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      En ruta (GPS Activo)
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

      </div>
    </div>
  );
}