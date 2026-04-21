import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FiMapPin, FiUser, FiNavigation } from "react-icons/fi";

// Configuración de iconos personalizados de Leaflet
const clientIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const cobradorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", // Icono verde para el cobrador
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function TodayRouteCard({ routeId }: { routeId: number }) {
  const [clients, setClients] = useState<any[]>([]);
  const [cobradorPos, setCobradorPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // 1. Aquí harías el fetch a tu backend para traer los clientes de hoy
    // fetch(`/api/rutas/${routeId}/monitoreo-hoy`)...
    
    // DATOS SIMULADOS PARA EJEMPLO:
    setClients([
      { id: 1, name: "Juan Pérez", address: "Calle 123", latitude: 5.0688, longitude: -75.5173 }, // Manizales coords
      { id: 2, name: "María Gómez", address: "Carrera 45", latitude: 5.0710, longitude: -75.5200 },
    ]);

    // 2. Aquí harías un fetch constante (o escucharías un WebSocket) 
    // para obtener la última ubicación del cobrador.
    setCobradorPos({ lat: 5.0695, lng: -75.5180 }); 
  }, [routeId]);

  // Centro del mapa inicial (Manizales por defecto o la pos del cobrador)
  const mapCenter: [number, number] = cobradorPos 
    ? [cobradorPos.lat, cobradorPos.lng] 
    : [5.0688, -75.5173];

  return (
    <div className="bg-[#0B1020]/60 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row gap-6 mb-8">
      
      {/* SECCIÓN IZQUIERDA: Lista de Clientes */}
      <div className="w-full lg:w-1/3 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FiMapPin className="text-blue-400" />
          Ruta de Hoy
        </h3>
        
        <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-3 [&::-webkit-scrollbar]:hidden">
          {clients.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay cobros pendientes para hoy.</p>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                <p className="font-semibold text-white flex items-center gap-2">
                  <FiUser className="text-slate-400" size={14} />
                  {client.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">{client.address}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Mapa */}
      <div className="w-full lg:w-2/3 h-[400px] rounded-2xl overflow-hidden border border-white/10 relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          {/* Capa base del mapa (OpenStreetMap es gratis) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

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
          {cobradorPos && (
            <Marker position={[cobradorPos.lat, cobradorPos.lng]} icon={cobradorIcon}>
              <Popup>
                <div className="flex items-center gap-2 text-[#0B1020] font-bold">
                  <FiNavigation className="text-green-600" />
                  Ubicación del Cobrador
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}