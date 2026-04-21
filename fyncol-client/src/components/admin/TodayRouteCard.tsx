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

// Componente invisible para mover la cámara del mapa
function MapFocusController({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] !== 0 && coords[1] !== 0) {
      map.flyTo(coords, 16, { animate: true, duration: 1.5 }); // Zoom 16 para acercarse bien al cliente
    }
  }, [coords, map]);
  return null;
}

export default function TodayRouteCard({ routeId }: { routeId: number }) {
  const [clients, setClients] = useState<any[]>([]);
  const [cobradorData, setCobradorData] = useState<any>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setCobradorData(data.cobrador);

        // Si es la primera carga, centrar el mapa en el cobrador o en el primer cliente
        if (!focusCoords) {
          if (data.cobrador?.latitude && data.cobrador?.longitude) {
            setFocusCoords([data.cobrador.latitude, data.cobrador.longitude]);
          } else if (data.clientes?.length > 0 && data.clientes[0].latitude) {
            setFocusCoords([data.clientes[0].latitude, data.clientes[0].longitude]);
          }
        }
      }
    } catch (error) {
      console.error("Error al obtener datos de monitoreo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchRealTimeData();

    // Actualizar ubicación del cobrador y estado de clientes cada 15 segundos
    const syncInterval = setInterval(fetchRealTimeData, 15000);
    
    return () => clearInterval(syncInterval);
  }, [routeId]);

  // Coordenada por defecto (Centro de Colombia) si no hay nada más
  const mapCenter: [number, number] = focusCoords || [4.5709, -74.2973];

  return (
    <div className="bg-[#0B1020]/60 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row gap-6 mb-8">
      
      {/* SECCIÓN IZQUIERDA: Lista de Clientes */}
      <div className="w-full lg:w-1/3 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FiMapPin className="text-blue-400" />
          Ruta de Hoy
        </h3>
        
        <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-3 [&::-webkit-scrollbar]:hidden">
          {isLoading && clients.length === 0 ? (
             <div className="flex justify-center items-center py-10 text-slate-400">
               <FiLoader className="animate-spin" size={24} />
             </div>
          ) : clients.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay cobros pendientes para hoy.</p>
          ) : (
            clients.map((client) => (
              <div 
                key={client.id} 
                onClick={() => {
                  // Al hacer clic, enfocamos el mapa en las coordenadas del cliente
                  if (client.latitude && client.longitude) {
                    setFocusCoords([client.latitude, client.longitude]);
                  }
                }}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <FiUser className="text-slate-400 group-hover:text-blue-400 transition-colors" size={14} />
                    {client.name}
                  </p>
                  {!client.latitude && (
                    <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">Sin GPS</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{client.address}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Mapa */}
      <div className="w-full lg:w-2/3 h-[400px] rounded-2xl overflow-hidden border border-white/10 relative z-0">
        
        {/* Etiqueta de "Última vez visto" sobre el mapa */}
        {cobradorData && cobradorData.lastUpdate && (
          <div className="absolute top-4 right-4 z-[400] bg-[#05050A]/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-white">
              {cobradorData.name} activo
            </span>
          </div>
        )}

        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Controlador que mueve la cámara cuando cambia `focusCoords` */}
          <MapFocusController coords={focusCoords} />

          {/* Markers de los clientes a cobrar */}
          {clients.map((client) => (
             client.latitude && client.longitude && (
              <Marker 
                key={client.id} 
                position={[client.latitude, client.longitude]} 
                icon={clientIcon}
              >
                <Popup>
                  <strong className="text-[#0B1020]">{client.name}</strong><br/>
                  <span className="text-slate-600">{client.address}</span>
                </Popup>
              </Marker>
            )
          ))}

          {/* Marker del Cobrador (En tiempo real) */}
          {cobradorData?.latitude && cobradorData?.longitude && (
            <Marker 
              position={[cobradorData.latitude, cobradorData.longitude]} 
              icon={cobradorIcon}
            >
              <Popup>
                <div className="flex flex-col text-[#0B1020]">
                  <span className="font-bold flex items-center gap-1">
                    <FiNavigation className="text-emerald-600" />
                    {cobradorData.name}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Últ. actualiz: {new Date(cobradorData.lastUpdate).toLocaleTimeString('es-CO')}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}