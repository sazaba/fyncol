import { useState, useEffect, useRef, useMemo } from 'react';
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
  FiDollarSign,
  FiSearch,
  FiTrash2,
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
  const [isSaving, setIsSaving] = useState(false); // Estado para carga al guardar
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
    setAlertState((prev) => ({ ...prev, open: true, ...payload }));
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

  // --- Geografía Memorizada para Rendimiento ---
  const countries = useMemo(() => Country.getAllCountries().map(c => ({ label: c.name, value: c.isoCode })), []);
  const states = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry).map(s => ({ label: s.name, value: s.isoCode })) : [], [selectedCountry]);
  const cities = useMemo(() => selectedState ? City.getCitiesOfState(selectedCountry, selectedState).map(c => ({ label: c.name, value: c.name })) : [], [selectedState, selectedCountry]);

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
        openAlert({ variant: "danger", title: "Error de conexión", message: "No se pudieron cargar los datos." });
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

    setIsSaving(true);
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
        setSelectedCountry(''); setSelectedState(''); setSelectedCity(''); setCurrency(''); setAssignedToId('');
        openAlert({ variant: "success", title: "Ruta creada", message: "Configuración guardada exitosamente." });
      }
    } catch (error) {
      openAlert({ variant: "danger", title: "Error", message: "No se pudo crear la ruta." });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmReassign = (routeId: number, newUserId: string) => {
    const userName = collaborators.find(c => c.id === Number(newUserId))?.name || "un nuevo cobrador";
    openAlert({
      variant: "info",
      title: "Reasignar Cobrador",
      message: `¿Deseas asignar esta ruta a ${userName}?`,
      confirmText: "Si, Reasignar",
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
        openAlert({ variant: "success", title: "Actualizado", message: "Cambio realizado correctamente." });
      }
    } catch {
      openAlert({ variant: "danger", title: "Error", message: "No se pudo actualizar la ruta." });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (route: Route) => {
    openAlert({
      variant: "danger",
      title: "Eliminar Ruta",
      message: `¿Estás seguro de eliminar permanentemente la Ruta ${route.id} en ${route.city}?`,
      confirmText: "Sí, Eliminar",
      onConfirm: () => handleDelete(route.id)
    });
  };

  const handleDelete = async (id: number) => {
    closeAlert();
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/rutas/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setRoutes(routes.filter(r => r.id !== id));
        openAlert({ variant: "success", title: "Eliminado", message: "La ruta ha sido removida del sistema." });
      }
    } catch {
      openAlert({ variant: "danger", title: "Error", message: "No se pudo eliminar la ruta." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 pb-20">
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">Gestión de Rutas</h1>
        <p className="text-sm text-slate-400 mt-1 font-sans">Administra los territorios y asigna cobradores operativos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div className="lg:col-span-4 rounded-[32px] border border-white/10 bg-[#0B1020]/40 backdrop-blur-md p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <FiPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-white font-display">Nueva Ruta</h2>
          </div>

          <form onSubmit={handleCreateRoute} className="space-y-5">
            <SearchableSelect label="País" icon={FiGlobe} options={countries} value={selectedCountry} onChange={handleCountryChange} />
            <SearchableSelect label="Estado / Departamento" icon={FiMapPin} options={states} value={selectedState} onChange={(val: string) => {setSelectedState(val); setSelectedCity('');}} disabled={!selectedCountry} />
            <SearchableSelect label="Ciudad" icon={FiMap} options={cities} value={selectedCity} onChange={setSelectedCity} disabled={!selectedState} />
            
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 font-sans">Divisa de Cartera</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-blue-400/50"><FiDollarSign size={18} /></div>
                <input type="text" value={currency} readOnly placeholder="Autocompletado" className="w-full bg-[#05050A]/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-blue-400 font-bold outline-none cursor-not-allowed shadow-inner" />
              </div>
            </div>

            <SearchableSelect label="Asignar Cobrador" icon={FiUser} options={collaborators.map(c => ({ label: c.name, value: c.id.toString() }))} value={assignedToId} onChange={setAssignedToId} placeholder="Sin asignar por ahora" />

            <button 
              type="submit" 
              disabled={isSaving || !selectedCity}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
            >
              {isSaving ? <FiLoader className="animate-spin" /> : <FiCheck />}
              {isSaving ? "Guardando..." : "Crear Nueva Ruta"}
            </button>
          </form>
        </div>

        {/* PANEL DERECHO: LISTA */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Rutas Registradas</h3>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{routes.length} Activas</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500 bg-[#0B1020]/20 rounded-[32px] border border-white/5">
              <FiLoader className="animate-spin mb-4 text-blue-500" size={40} />
              <p className="font-medium">Sincronizando sistema...</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="rounded-[32px] border border-white/5 bg-[#0B1020]/20 p-16 text-center text-slate-600 font-medium">
              No hay rutas operativas en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {routes.map((ruta) => (
                <div key={ruta.id} className="group relative rounded-[32px] border border-white/5 bg-[#0B1020]/40 backdrop-blur-sm p-6 hover:bg-[#0B1020]/60 hover:border-blue-500/30 transition-all shadow-xl flex flex-col md:flex-row items-center gap-6">
                  <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">{ruta.id}</div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-lg truncate font-display">{ruta.city}, {ruta.country}</h4>
                    <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">{ruta.currency}</span>
                  </div>

                  <div className="w-full md:w-64">
                    <SearchableSelect 
                      options={collaborators.map(c => ({ label: c.name, value: c.id.toString() }))} 
                      value={ruta.assignedTo?.id?.toString() || ''} 
                      onChange={(v: string) => confirmReassign(ruta.id, v)} 
                      placeholder="Sin cobrador"
                      compact
                      isBusy={busyId === ruta.id}
                    />
                  </div>

                  <button 
                    onClick={() => confirmDelete(ruta)}
                    className="p-3.5 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                    title="Eliminar Ruta"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE ALERTAS PREMIUM */}
      {alertState.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-[440px] rounded-[40px] border border-white/10 bg-[#05050A] shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]">
            <div className="p-8 flex items-start gap-5">
              <div className={`h-14 w-14 rounded-[22px] flex items-center justify-center border shrink-0 ${
                alertState.variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                alertState.variant === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}><FiAlertTriangle size={24} /></div>
              <div>
                <h3 className="text-white font-bold text-xl font-display">{alertState.title}</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">{alertState.message}</p>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3 justify-end font-sans">
              {alertState.cancelText && <button onClick={closeAlert} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]"> {alertState.cancelText} </button>}
              <button onClick={() => alertState.onConfirm ? alertState.onConfirm() : closeAlert()} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg uppercase tracking-widest text-[10px] ${
                alertState.variant === "danger" ? "bg-red-600 text-white shadow-red-600/20" :
                alertState.variant === "success" ? "bg-emerald-600 text-white shadow-emerald-600/20" :
                "bg-blue-600 text-white shadow-blue-600/20"
              }`}>{alertState.confirmText || "Aceptar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Componente SearchableSelect PREMIUM (Con Búsqueda por Teclado) ---
function SearchableSelect({ label, icon: Icon, options, value, onChange, disabled, placeholder = "Seleccionar...", compact = false, isBusy = false }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = options.find((opt: any) => opt.value === value)?.label || placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((opt: any) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!dropdownRef.current?.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

  return (
    <div className={`space-y-1.5 relative group ${disabled ? 'opacity-40' : ''}`} ref={dropdownRef}>
      {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 font-sans">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
          className={`w-full flex items-center justify-between bg-[#0B1020]/50 border border-white/5 rounded-2xl px-4 ${compact ? 'py-2.5' : 'py-3.5'} text-sm text-white focus:border-blue-500/50 outline-none transition-all shadow-inner hover:bg-[#0B1020]/80`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {isBusy ? <FiLoader className="animate-spin text-blue-500" /> : Icon && <Icon size={18} className={isOpen ? 'text-blue-400' : 'text-slate-500'} />}
            <span className={`truncate ${value ? 'text-white' : 'text-slate-500'} font-medium`}>{isBusy ? 'Cargando...' : displayLabel}</span>
          </div>
          <FiChevronDown className={`transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-[#0B1020] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-[slideDown_0.2s]">
            <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0B1020] z-10">
              <FiSearch className="text-slate-500 ml-2" />
              <input 
                ref={inputRef}
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full flex items-center justify-between px-5 py-3 text-xs text-left transition-all hover:bg-white/5 ${value === opt.value ? "bg-blue-600 text-white font-bold" : "text-slate-300"}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && <FiCheck size={14} />}
                  </button>
                ))
              ) : (
                <div className="p-5 text-center text-xs text-slate-600 italic">No hay resultados</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}