import { useState, useEffect } from 'react';
import { Country, State, City } from 'country-state-city';

// Interfaces de TypeScript
interface User {
  id: number;
  name: string;
  role: string;
}

interface Route {
  id: number;
  country: string;
  city: string;
  currency: string;
  assignedTo?: User | null;
}

export default function Rutas() {
  // Estados de datos
  const [routes, setRoutes] = useState<Route[]>([]);
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del formulario
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currency, setCurrency] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  // LÓGICA DE URL INFALIBLE (Corrige el 404 automáticamente)
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // Listas autocompletadas de la librería
  const countries = Country.getAllCountries();
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  const cities = selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Obtener Rutas
        const routesRes = await fetch(`${API_URL}/rutas`, { headers });
        if (routesRes.ok) {
          const routesData = await routesRes.json();
          // Manejamos si el backend devuelve el array directo o dentro de una propiedad
          setRoutes(routesData.data || routesData || []);
        }

        // 2. Obtener Usuarios (Cobradores y Supervisores)
        const usersRes = await fetch(`${API_URL}/users`, { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          
          // DIAGNÓSTICO EN CONSOLA
          console.log("Data cruda de usuarios:", usersData);
          
          // Tu backend devuelve { success: true, users: [...] }
          const usersArray = Array.isArray(usersData) ? usersData : (usersData.users || []);
          
          // Filtramos estrictamente según tu esquema de Prisma (Mayúsculas)
          const operativos = usersArray.filter((u: User) => 
            u.role === 'COBRADOR' || u.role === 'SUPERVISOR'
          );
          
          setCollaborators(operativos);
        } else {
           console.error("Error del servidor al obtener usuarios:", usersRes.statusText);
        }
      } catch (error) {
        console.error("Error de conexión al cargar los datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL]);

  // Manejar cambio de país
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    setSelectedCountry(countryCode);
    
    const countryData = Country.getCountryByCode(countryCode);
    if (countryData?.currency) {
      setCurrency(countryData.currency);
    } else {
      setCurrency('');
    }
    setSelectedState('');
    setSelectedCity('');
  };

  // Manejar cambio de estado/departamento
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
    setSelectedCity('');
  };

  // Crear nueva ruta
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const countryName = Country.getCountryByCode(selectedCountry)?.name || '';

    try {
      const response = await fetch(`${API_URL}/rutas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          country: countryName,
          city: selectedCity,
          currency,
          assignedToId: assignedToId ? Number(assignedToId) : null
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Agregamos la nueva ruta al estado local (considerando posible propiedad .data)
        const newRoute = result.data || result;
        setRoutes([...routes, newRoute]);
        
        // Limpiar formulario
        setSelectedCountry('');
        setSelectedState('');
        setSelectedCity('');
        setCurrency('');
        setAssignedToId('');
      } else {
        alert("Error al crear la ruta en el servidor.");
      }
    } catch (error) {
      console.error("Error en la petición POST:", error);
    }
  };

  // Reasignar colaborador
  const handleReassign = async (routeId: number, newUserId: string) => {
    try {
      const response = await fetch(`${API_URL}/rutas/${routeId}/reasignar`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          assignedToId: newUserId ? Number(newUserId) : null
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedRoute = result.data || result;
        setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
      } else {
        alert("Error al reasignar la ruta.");
      }
    } catch (error) {
      console.error("Error en la petición PATCH:", error);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-dark-900 min-h-full text-white font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">Gestión de Rutas</h1>
          <p className="text-gray-400">Crea rutas, asigna territorios geográficos y gestiona colaboradores.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulario de Creación */}
          <div className="lg:col-span-1 bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg h-fit">
            <h2 className="font-display text-xl font-bold text-white mb-6">Nueva Ruta</h2>
            
            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5 font-medium">País</label>
                <select 
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  required
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="">Seleccione un país...</option>
                  {countries.map(c => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Estado / Departamento</label>
                <select 
                  value={selectedState}
                  onChange={handleStateChange}
                  required
                  disabled={!selectedCountry}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 appearance-none"
                >
                  <option value="">Seleccione un estado...</option>
                  {states?.map((state, index) => (
                    <option key={index} value={state.isoCode}>{state.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Ciudad</label>
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  required
                  disabled={!selectedState}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 appearance-none"
                >
                  <option value="">Seleccione una ciudad...</option>
                  {cities?.map((city, index) => (
                    <option key={index} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Divisa Operativa</label>
                <input 
                  type="text" 
                  value={currency} 
                  readOnly 
                  className="w-full bg-dark-900/50 border border-dark-700 rounded-lg p-2.5 text-sm text-blue-400 font-bold cursor-not-allowed focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Colaborador (Opcional)</label>
                <select 
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="">Sin asignar por ahora</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all active:scale-[0.98]"
              >
                Crear y Guardar Ruta
              </button>
            </form>
          </div>

          {/* Lista de Rutas */}
          <div className="lg:col-span-2 bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
            <h2 className="font-display text-xl font-bold text-white mb-6">Directorio de Rutas</h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : routes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 border-2 border-dashed border-dark-700 rounded-xl bg-dark-900/50 text-center p-4">
                <p>No hay rutas operativas registradas.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {routes.map((ruta) => (
                  <div 
                    key={ruta.id} 
                    className="bg-dark-900 p-5 rounded-xl border border-dark-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 hover:border-blue-500/30 transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-bold font-display tracking-wider">
                          RUTA {ruta.id}
                        </span>
                        <span className="text-sm font-bold text-white font-display">
                          {ruta.city}, {ruta.country}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Moneda base: <span className="text-slate-300 font-semibold">{ruta.currency}</span>
                      </p>
                    </div>
                    
                    <div className="w-full sm:w-auto min-w-[200px]">
                      <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">
                        Asignado a:
                      </label>
                      <select 
                        value={ruta.assignedTo?.id || ''}
                        onChange={(e) => handleReassign(ruta.id, e.target.value)}
                        className="w-full bg-dark-800 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                      >
                        <option value="">Ninguno (Libre)</option>
                        {collaborators.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}