import { useState, useEffect, useRef } from 'react';
import { Country, State, City } from 'country-state-city';
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiGlobe,
  FiMapPin,
  FiUser,
  FiLoader,
  FiPlus,
  FiMap,
  FiDollarSign
} from "react-icons/fi";

// --- Interfaces ---
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

type AlertVariant = "info" | "success" | "danger";

type PremiumAlertState = {
  open: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (() => void) | null;
};

export default function Rutas() {
  // --- Estados de Datos ---
  const [routes, setRoutes] = useState<Route[]>([]);
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  
  // --- Estados del Formulario ---
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currency, setCurrency] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  // --- Sistema de Alertas ---
  const [alertState, setAlertState] = useState<PremiumAlertState>({
    open: false,
    variant: "info",
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    onConfirm: null,
  });

  const openAlert = (payload: Partial<PremiumAlertState>) => {
    setAlertState((prev) => ({
      ...prev,
      open: true,
      variant: payload.variant ?? prev.variant,
      title: payload.title ?? prev.title,
      message: payload.message ?? prev.message,
      confirmText: payload.confirmText ?? prev.confirmText,
      cancelText: payload.cancelText ?? prev.cancelText,
      onConfirm: payload.onConfirm ?? prev.onConfirm,
    }));
  };

  const closeAlert = () => setAlertState((prev) => ({ ...prev, open: false, onConfirm: null }));

  // --- Configuración API ---
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // --- Geografía ---
  const countries = Country.getAllCountries().map(c => ({ label: c.name, value: c.isoCode }));
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry).map(s => ({ label: s.name, value: s.isoCode })) : [];
  const cities = selectedState ? City.getCitiesOfState(selectedCountry, selectedState).map(c => ({ label: c.name, value: c.name })) : [];

  // --- Carga Inicial ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [routesRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/rutas`, { headers }),
          fetch(`${API_URL}/users`, { headers })
        ]);

        if (routesRes.ok) {
          const rData = await routesRes.json();
          setRoutes(rData.data || rData || []);
        }

        if (usersRes.ok) {
          const uData = await usersRes.json();
          const usersArray = uData.users || [];
          setCollaborators(usersArray.filter((u: User) => u.role === 'COBRADOR' || u.role === 'SUPERVISOR'));
        }
      } catch (error) {
        openAlert({
          variant: "danger",
          title: "Error de conexión",
          message: "No se pudieron cargar los datos del servidor."
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Handlers ---
  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    const countryData = Country.getCountryByCode(val);
    setCurrency(countryData?.currency || '');
    setSelectedState('');
    setSelectedCity('');
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) return;

    try {
      const countryName = Country.getCountryByCode(selectedCountry)?.name || '';
      const res = await fetch(`${API_URL}/rutas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          country: countryName,
          city: selectedCity,
          currency,
          assignedToId: assignedToId ? Number(assignedToId) : null
        })
      });

      if (res.ok) {
        const result = await res.json();
        setRoutes([...routes, result.data || result]);
        // Reset
        setSelectedCountry(''); setSelectedState(''); setSelectedCity(''); setCurrency(''); setAssignedToId('');
        
        openAlert({
          variant: "success",
          title: "Ruta creada",
          message: "La nueva ruta ha sido registrada exitosamente.",
          confirmText: "Genial",
          cancelText: ""
        });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error", message: "No se pudo crear la ruta." });
    }
  };

  const confirmReassign = (routeId: number, newUserId: string) => {
    const userName = collaborators.find(c => c.id === Number(newUserId))?.name || "un nuevo cobrador";
    
    openAlert({
      variant: "info",
      title: "Reasignar Ruta",
      message: `¿Deseas cambiar el cobrador asignado a ${userName}?`,
      confirmText: "Sí, reasignar",
      cancelText: "Cancelar",
      onConfirm: () => handleReassign(routeId, newUserId)
    });
  };

  const handleReassign = async (routeId: number, newUserId: string) => {
    closeAlert();
    setBusyId(routeId);
    try {
      const res = await fetch(`${API_URL}/rutas/${routeId}/reasignar`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ assignedToId: newUserId ? Number(newUserId) : null })
      });
      if (res.ok) {
        const result = await res.json();
        setRoutes(routes.map(r => r.id === routeId ? (result.data || result) : r));
        openAlert({ variant: "success", title: "Actualizado", message: "Cobrador reasignado correctamente.", cancelText: "" });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error", message: "Fallo en la reasignación." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 pb-20">
      {/* HEADER */}
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Gestión de Rutas</h1>
        <p className="text-sm text-slate-400 mt-1">Configura territorios y asigna el personal operativo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* FORMULARIO PREMIUM */}
        <div className="lg:col-span-4 rounded-[32px] border border-white/10 bg-[#0B1020]/40 backdrop-blur-md p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <FiPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Nueva Ruta</h2>
          </div>

          <form onSubmit={handleCreateRoute} className="space-y-5">
            <CustomSelect label="País" icon={FiGlobe} options={countries} value={selectedCountry} onChange={handleCountryChange} />
            <CustomSelect label="Estado / Depto" icon={FiMapPin} options={states} value={selectedState} onChange={(val: string) => {setSelectedState(val); setSelectedCity('');}} disabled={!selectedCountry} />
            <CustomSelect label="Ciudad" icon={FiMap} options={cities} value={selectedCity} onChange={setSelectedCity} disabled={!selectedState} />
            
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Divisa Base</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-blue-400/50"><FiDollarSign size={18} /></div>
                <input type="text" value={currency} readOnly placeholder="Autocompletado" className="w-full bg-[#0B1020]/30 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-blue-400 font-bold outline-none cursor-not-allowed shadow-inner" />
              </div>
            </div>

            <CustomSelect label="Asignar Cobrador" icon={FiUser} options={collaborators.map(c => ({ label: `${c.name} (${c.role})`, value: c.id.toString() }))} value={assignedToId} onChange={setAssignedToId} placeholder="Sin asignar por ahora" />

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
              <FiCheck /> Guardar Configuración
            </button>
          </form>
        </div>

        {/* LISTADO PREMIUM */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Rutas Operativas</h3>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{routes.length} Activas</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500 bg-[#0B1020]/20 rounded-[32px] border border-white/5">
              <FiLoader className="animate-spin mb-4 text-blue-500" size={40} />
              <p className="font-medium">Sincronizando rutas...</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="rounded-[32px] border border-white/5 bg-[#0B1020]/20 p-16 text-center">
              <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600"><FiMap size={32} /></div>
              <p className="text-slate-500 font-medium">No hay rutas registradas en el sistema.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {routes.map((ruta) => (
                <div key={ruta.id} className="group relative rounded-[28px] border border-white/5 bg-[#0B1020]/40 backdrop-blur-sm p-5 md:p-6 hover:bg-[#0B1020]/60 hover:border-blue-500/30 transition-all shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center text-blue-400 border border-blue-500/10 font-bold text-lg shrink-0">
                      {ruta.id}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-lg truncate">{ruta.city}, {ruta.country}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">{ruta.currency}</span>
                        <span className="text-xs text-slate-500 font-medium italic">Ruta comercial activa</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-64 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Personal Asignado</label>
                    <div className="relative">
                      {busyId === ruta.id ? (
                        <div className="absolute inset-0 z-10 bg-[#0B1020]/80 rounded-xl flex items-center justify-center"><FiLoader className="animate-spin text-blue-500" /></div>
                      ) : null}
                      <select 
                        value={ruta.assignedTo?.id || ''} 
                        onChange={(e) => confirmReassign(ruta.id, e.target.value)}
                        className="w-full bg-[#05050A]/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer"
                      >
                        <option value="">Sin cobrador</option>
                        {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- PREMIUM ALERT COMPONENT --- */}
      {alertState.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-[480px] rounded-[40px] border border-white/10 bg-[#05050A]/90 shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]">
            <div className="p-8 flex items-start gap-5">
              <div className={`h-14 w-14 rounded-[20px] flex items-center justify-center border shrink-0 ${
                alertState.variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                alertState.variant === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}>
                <FiAlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl">{alertState.title}</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">{alertState.message}</p>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3 justify-end">
              {alertState.cancelText && (
                <button onClick={closeAlert} className="px-6 py-3 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all uppercase text-xs tracking-widest">
                  {alertState.cancelText}
                </button>
              )}
              <button onClick={() => alertState.onConfirm ? alertState.onConfirm() : closeAlert()} className={`px-6 py-3 rounded-2xl font-bold transition-all active:scale-[0.98] uppercase text-xs tracking-widest shadow-xl ${
                alertState.variant === "danger" ? "bg-red-600 text-white shadow-red-600/20" :
                alertState.variant === "success" ? "bg-emerald-600 text-white shadow-emerald-600/20" :
                "bg-blue-600 text-white shadow-blue-600/20"
              }`}>
                {alertState.confirmText || "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helpers de UI ---
function CustomSelect({ label, icon: Icon, options, value, onChange, disabled, placeholder = "Seleccionar..." }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const displayLabel = options.find((opt: any) => opt.value === value)?.label || placeholder;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`space-y-2 relative group ${disabled ? 'opacity-40' : ''}`} ref={dropdownRef}>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#0B1020]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all shadow-inner ${isOpen ? 'ring-2 ring-blue-500/10' : ''}`}
        >
          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center ${isOpen ? 'text-blue-400' : 'text-slate-500'}`}><Icon size={18} /></div>
          <span className={value ? 'text-white' : 'text-slate-500'}>{displayLabel}</span>
          <FiChevronDown className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto bg-[#0B1020] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl custom-scrollbar">
            {options.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-xs text-left transition-colors ${value === opt.value ? "bg-blue-600/20 text-blue-400" : "text-slate-300 hover:bg-white/5"}`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <FiCheck size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}