import React, { useState, useMemo, useEffect } from 'react';
import { FiMapPin, FiUploadCloud, FiSave, FiUser, FiDollarSign, FiMap, FiBriefcase } from 'react-icons/fi';

interface ClientFormData {
  name: string;
  address: string;
  routeId: string;
  amount: string;
  installments: string;
  interestRate: string;
}

interface LocationData {
  latitude: number | null;
  longitude: number | null;
}

export default function NuevoCredito() {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '', address: '', routeId: '',
    amount: '', installments: '', interestRate: ''
  });
  
  const [location, setLocation] = useState<LocationData>({ latitude: null, longitude: null });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para manejar la ruta única asignada
  const [rutaAsignada, setRutaAsignada] = useState<any | null>(null);
  const [isLoadingRuta, setIsLoadingRuta] = useState(true);
  const [errorFetchRuta, setErrorFetchRuta] = useState<string | null>(null);

  // Buscar la ruta asignada al cobrador actual al montar el componente
  useEffect(() => {
    const fetchMiRuta = async () => {
      try {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        
        if (!userStr || !token) {
          setErrorFetchRuta("Sesión no válida. Vuelve a iniciar sesión.");
          return;
        }

        const currentUser = JSON.parse(userStr);
        if (!currentUser.id) {
          setErrorFetchRuta("Falta el ID del usuario en la sesión. Inicia sesión nuevamente.");
          return;
        }

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/rutas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const rutas = Array.isArray(data) ? data : data.data || []; 
          
          // Buscar exactamente la ruta donde el "assignedToId" coincide con el ID del cobrador logueado
          const miRutaEncontrada = rutas.find((r: any) => r.assignedTo?.id === currentUser.id);
          
          if (miRutaEncontrada) {
            setRutaAsignada(miRutaEncontrada);
            setFormData(prev => ({ ...prev, routeId: miRutaEncontrada.id.toString() }));
          } else {
            setErrorFetchRuta("No tienes ninguna ruta asignada actualmente. Contacta al administrador.");
          }
        } else {
          setErrorFetchRuta(`Error del servidor: código ${res.status}`);
          console.error("Error al obtener rutas, status:", res.status);
        }
      } catch (error) {
        setErrorFetchRuta("Error de conexión con el servidor.");
        console.error("Error en la petición de rutas:", error);
      } finally {
        setIsLoadingRuta(false);
      }
    };
    fetchMiRuta();
  }, []);

  // Cálculo de la métrica proyectada en tiempo real
  const projectedTotal = useMemo(() => {
    const amountNum = parseFloat(formData.amount) || 0;
    const interestNum = parseFloat(formData.interestRate) || 0;
    return amountNum + (amountNum * (interestNum / 100));
  }, [formData.amount, formData.interestRate]);

  // Captura de ubicación GPS
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          alert("Ubicación capturada con éxito"); 
        },
        (error) => {
          console.error("Error GPS:", error);
          alert("Por favor habilita el GPS en tu dispositivo.");
        }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  };

  // Subida a Cloudinary
  const uploadToCloudinary = async (imageFile: File): Promise<string> => {
    const data = new FormData();
    data.append("file", imageFile);
    data.append("upload_preset", "fyncol_cedulas"); 
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/dr2fkqgfz/image/upload`, {
      method: "POST",
      body: data,
    });
    
    if (!response.ok) throw new Error("Error al subir la imagen a Cloudinary");
    
    const json = await response.json();
    return json.secure_url;
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.routeId) {
        throw new Error("No hay una ruta asignada válida para registrar el crédito.");
      }

      let documentUrl = null;
      if (file) {
        documentUrl = await uploadToCloudinary(file);
      }

      const payload = {
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude,
        documentUrl
      };

      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/clients/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar la operación");
      }

      alert("Cliente y préstamo registrados correctamente");
      
      setFormData({ 
        name: '', address: '', 
        routeId: rutaAsignada?.id.toString() || '', 
        amount: '', installments: '', interestRate: '' 
      });
      setLocation({ latitude: null, longitude: null });
      setFile(null);
      
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-inter">
      
      {/* HEADER: Título y Pestañas de Estadísticas */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Nuevo Crédito</h1>
          <p className="text-sm text-slate-400 mt-1">Registra un nuevo cliente y asígnale su crédito inicial.</p>
        </div>

        {/* Pestañas de Información de Ruta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
          {isLoadingRuta ? (
            <div className="col-span-3 text-slate-500 text-sm p-4 bg-[#0B0B12] rounded-xl border border-white/5">Cargando métricas de tu ruta...</div>
          ) : errorFetchRuta ? (
            <div className="col-span-3 text-red-400 text-sm p-4 bg-red-500/10 rounded-xl border border-red-500/30">⚠️ {errorFetchRuta}</div>
          ) : rutaAsignada && (
            <>
              {/* Pestaña 1: Ruta Operativa Asignada */}
              <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FiMap size={14} />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Ruta Operativa Asignada</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {rutaAsignada.city}, {rutaAsignada.country} (ID: {rutaAsignada.id})
                </p>
              </div>

              {/* Pestaña 2: Capital Disponible */}
              <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center border-b-2 border-b-green-500/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FiDollarSign size={14} className="text-green-400" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-green-400/80">Capital Disponible</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${Number(rutaAsignada.availableCapital || 0).toLocaleString('es-CO')}
                </p>
              </div>

              {/* Pestaña 3: Total Cartera */}
              <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center border-b-2 border-b-blue-500/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FiBriefcase size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400/80">Total Cartera</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${Number(rutaAsignada.totalCartera || 0).toLocaleString('es-CO')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Datos del Cliente */}
        <div className="bg-[#0B0B12] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <FiUser className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Datos del Cliente</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nombre Completo</label>
              <input required name="name" value={formData.name} onChange={handleChange} disabled={!rutaAsignada} className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Ej: Cliente de Prueba" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Dirección</label>
              <input required name="address" value={formData.address} onChange={handleChange} disabled={!rutaAsignada} className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Ej: Calle Principal 123" />
            </div>

            <div className="pt-2">
              <button type="button" onClick={handleGetLocation} disabled={!rutaAsignada} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${!rutaAsignada ? 'opacity-50 cursor-not-allowed bg-blue-500/5 border-white/5 text-slate-500' : location.latitude ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'}`}>
                <FiMapPin size={18} />
                <span className="font-medium">{location.latitude ? "Ubicación Capturada" : "Capturar Ubicación GPS"}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Foto de la Cédula</label>
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl transition-all ${rutaAsignada ? 'hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FiUploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                  <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-blue-400">Haz clic para subir</span> o arrastra</p>
                  <p className="text-xs text-slate-500">SVG, PNG, JPG (MAX. 5MB)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={!rutaAsignada} />
              </label>
              {file && <p className="text-xs text-green-400 mt-2 text-center">Archivo seleccionado: {file.name}</p>}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Datos del Crédito */}
        <div className="bg-[#0B0B12] border border-white/5 rounded-2xl p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-6">
            <FiDollarSign className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Detalles del Préstamo</h2>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Monto a Prestar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input required type="number" name="amount" value={formData.amount} onChange={handleChange} disabled={!rutaAsignada} className="w-full bg-transparent border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Cuotas</label>
                <input required type="number" name="installments" value={formData.installments} onChange={handleChange} disabled={!rutaAsignada} className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Ej: 30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Interés (%)</label>
                <div className="relative">
                  <input required type="number" name="interestRate" value={formData.interestRate} onChange={handleChange} disabled={!rutaAsignada} className="w-full bg-transparent border border-white/10 rounded-xl pl-4 pr-8 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Ej: 20" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-xl p-5">
              <p className="text-sm text-blue-400 font-medium mb-1">Total Proyectado a Recoger</p>
              <p className="text-3xl font-bold text-white">${projectedTotal.toLocaleString('es-CO')}</p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/5">
            <button type="submit" disabled={isSubmitting || !rutaAsignada} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 px-4 font-semibold transition-colors shadow-lg shadow-blue-500/20">
              <FiSave size={18} />
              {isSubmitting ? "Registrando Operación..." : "Guardar Cliente y Crédito"}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}