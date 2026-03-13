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
  FiRefreshCw,
  FiUserPlus,
  FiMail,
  FiLock,
  FiCreditCard,
  FiPhone,
  FiShield,
  FiX
} from "react-icons/fi";

// --- Interfaces ---
interface User {
  id: number;
  name: string;
  role: string;
  isActive?: boolean;
  status?: string;
  document?: string;
  address?: string;
  phone?: string;
  email?: string;
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

type ReplacementState = {
  isOpen: boolean;
  targetRouteId: number;
  newUserId: number;
  oldRouteId: number;
  replacementUserId: string;
  isDirectSwap: boolean;
};

export default function Rutas() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currency, setCurrency] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  const [alertState, setAlertState] = useState<PremiumAlertState>({ open: false, variant: "info", title: "", message: "" });
  
  const [replacementModal, setReplacementModal] = useState<ReplacementState>({
    isOpen: false, targetRouteId: 0, newUserId: 0, oldRouteId: 0, replacementUserId: '', isDirectSwap: false
  });

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ 
    name: '', document: '', email: '', address: '', phone: '', password: '', role: 'COBRADOR' 
  });

  const roles = [
    { label: "Cobrador", value: "COBRADOR" },
    { label: "Administrador", value: "ADMIN" },
    { label: "Supervisor", value: "SUPERVISOR" },
  ];

  const openAlert = (payload: Partial<PremiumAlertState>) => setAlertState((prev) => ({ ...prev, open: true, ...payload }));
  const closeAlert = () => setAlertState((prev) => ({ ...prev, open: false, onConfirm: null }));

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

  const countries = useMemo(() => Country.getAllCountries().map(c => ({ label: c.name, value: c.isoCode })), []);
  const states = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry).map(s => ({ label: s.name, value: s.isoCode })) : [], [selectedCountry]);
  const cities = useMemo(() => selectedState ? City.getCitiesOfState(selectedCountry, selectedState).map(c => ({ label: c.name, value: c.name })) : [], [selectedState, selectedCountry]);

  const assignedUserIds = useMemo(() => routes.map(r => r.assignedTo?.id).filter(Boolean) as number[], [routes]);
  const freeUsers = useMemo(() => collaborators.filter(c => !assignedUserIds.includes(c.id)), [collaborators, assignedUserIds]);

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
          setCollaborators((uData.users || []).filter((u: User) => {
            const hasValidRole = u.role === 'COBRADOR' || u.role === 'SUPERVISOR';
            return hasValidRole && u.isActive !== false && u.status?.toLowerCase() !== 'inactivo';
          }));
        }
      } catch (error) {
        openAlert({ variant: "danger", title: "Error", message: "Error cargando datos." });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    setCurrency(Country.getCountryByCode(val)?.currency || '');
    setSelectedState(''); setSelectedCity('');
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/rutas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          country: Country.getCountryByCode(selectedCountry)?.name || '',
          city: selectedCity,
          currency,
          assignedToId: assignedToId ? Number(assignedToId) : null
        })
      });

      if (res.ok) {
        const result = await res.json();
        setRoutes([...routes, result.data || result]);
        setSelectedCountry(''); setSelectedState(''); setSelectedCity(''); setCurrency(''); setAssignedToId('');
        openAlert({ variant: "success", title: "Éxito", message: "Ruta creada." });
      }
    } catch {
      openAlert({ variant: "danger", title: "Error", message: "Fallo al crear." });
    } finally { setIsSaving(false); }
  };

  const confirmReassign = (routeId: number, newUserId: string) => {
    const userName = collaborators.find(c => c.id === Number(newUserId))?.name || "un cobrador";
    openAlert({
      variant: "info", title: "Reasignar", message: `¿Asignar esta ruta a ${userName}?`, confirmText: "Proceder",
      onConfirm: () => executeReassign(routeId, newUserId)
    });
  };

  const executeReassign = async (routeId: number, newUserId: string, replacementId?: string) => {
    closeAlert();
    setBusyId(routeId);
    try {
      const payload: any = { assignedToId: newUserId ? Number(newUserId) : null };
      if (replacementId) payload.replacementId = Number(replacementId);

      const res = await fetch(`${API_URL}/rutas/${routeId}/reasignar`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === 'REQUIRES_REPLACEMENT') {
          setReplacementModal({
            isOpen: true,
            targetRouteId: routeId,
            newUserId: Number(newUserId),
            oldRouteId: result.oldRouteId,
            replacementUserId: '',
            isDirectSwap: false
          });
          return;
        }
        throw new Error(result.error || "Error interno al reasignar");
      }

      if (result.updatedRoutes) {
        setRoutes(prev => prev.map(r => {
          const updated = result.updatedRoutes.find((ur: Route) => ur.id === r.id);
          return updated ? updated : r;
        }));
      }
      
      setReplacementModal(prev => ({ ...prev, isOpen: false }));
      openAlert({ variant: "success", title: "Actualizado", message: "Asignación completada." });

    } catch (err: any) {
      openAlert({ variant: "danger", title: "Error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDirectSwap = () => {
    const targetRoute = routes.find(r => r.id === replacementModal.targetRouteId);
    
    if (!targetRoute || !targetRoute.assignedTo) {
        alert("La ruta destino no tiene un conductor para intercambiar.");
        return;
    }

    setReplacementModal(prev => ({
        ...prev,
        isDirectSwap: true,
        replacementUserId: targetRoute.assignedTo!.id.toString()
    }));
  };

  const handleCreateEmergencyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.document) return;
    
    setIsSavingUser(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newUserForm)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || "Error al crear usuario");

      const newUser = result.user || result;
      
      setCollaborators(prev => [...prev, newUser]);
      setReplacementModal(prev => ({ 
          ...prev, 
          replacementUserId: newUser.id.toString(),
          isDirectSwap: false 
      }));
      
      setNewUserForm({ name: '', document: '', email: '', address: '', phone: '', password: '', role: 'COBRADOR' });
      setUserModalOpen(false);

    } catch (err: any) {
      alert(err.message); 
    } finally {
      setIsSavingUser(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 pb-20 relative">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">Rutas</h1>
        <p className="text-sm text-slate-400 mt-1 font-sans">Administra los territorios y asigna cobradores operativos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PANEL IZQUIERDO */}
        <div className="lg:col-span-4 rounded-[32px] border border-white/10 bg-[#0B1020]/40 backdrop-blur-md p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20"><FiPlus size={20} /></div>
            <h2 className="text-xl font-bold text-white font-display">Nueva Ruta</h2>
          </div>
          <form onSubmit={handleCreateRoute} className="space-y-5">
            <SearchableSelect label="País" icon={FiGlobe} options={countries} value={selectedCountry} onChange={handleCountryChange} />
            <SearchableSelect label="Estado" icon={FiMapPin} options={states} value={selectedState} onChange={(val: string) => {setSelectedState(val); setSelectedCity('');}} disabled={!selectedCountry} />
            <SearchableSelect label="Ciudad" icon={FiMap} options={cities} value={selectedCity} onChange={setSelectedCity} disabled={!selectedState} />
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 font-sans">Divisa</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-blue-400/50"><FiDollarSign size={18} /></div>
                <input type="text" value={currency} readOnly placeholder="Autocompletado" className="w-full bg-[#05050A]/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-base md:text-sm text-blue-400 font-bold outline-none cursor-not-allowed" />
              </div>
            </div>
            <SearchableSelect 
              label="Asignar Cobrador" icon={FiUser} 
              options={freeUsers.map(c => ({ label: c.name, value: c.id.toString() }))} 
              value={assignedToId} onChange={setAssignedToId} 
              placeholder={freeUsers.length === 0 ? "No hay libres" : "Sin asignar"} disabled={freeUsers.length === 0}
            />
            <button type="submit" disabled={isSaving || !selectedCity} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] mt-4 flex items-center justify-center gap-3">
              {isSaving ? <FiLoader className="animate-spin" /> : <FiCheck />} {isSaving ? "Guardando..." : "Crear Ruta"}
            </button>
          </form>
        </div>

        {/* PANEL DERECHO */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Rutas Registradas</h3>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{routes.length} Activas</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500 bg-[#0B1020]/20 rounded-[32px] border border-white/5"><FiLoader className="animate-spin mb-4 text-blue-500" size={40} /><p>Cargando...</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {routes.map((ruta) => (
                <div key={ruta.id} className="group relative z-10 hover:z-50 focus-within:z-[60] rounded-[32px] border border-white/5 bg-[#0B1020]/40 backdrop-blur-sm p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="h-14 px-5 min-w-[100px] rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 whitespace-nowrap">
                    Ruta {ruta.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-lg truncate font-display">{ruta.city}, {ruta.country}</h4>
                    <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">{ruta.currency}</span>
                  </div>
                  <div className="w-full md:w-64">
                    <SearchableSelect 
                      options={collaborators.map(c => ({ 
                        label: c.name + (assignedUserIds.includes(c.id) && c.id !== ruta.assignedTo?.id ? ' (Ocupado)' : ''), 
                        value: c.id.toString() 
                      }))} 
                      value={ruta.assignedTo?.id?.toString() || ''} 
                      onChange={(v: string) => confirmReassign(ruta.id, v)} 
                      placeholder="Sin cobrador" compact isBusy={busyId === ruta.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: REEMPLAZO OBLIGATORIO */}
      {replacementModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-[440px] rounded-[40px] border border-white/10 bg-[#05050A] shadow-2xl overflow-hidden p-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4"><FiRefreshCw size={28} /></div>
              <h3 className="text-white font-bold text-xl font-display">Sustitución Requerida</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                El cobrador seleccionado ya administra la <strong className="text-white">Ruta {replacementModal.oldRouteId}</strong>. Asigna un reemplazo para esa ruta.
              </p>
            </div>
            
            <div className="mb-6 relative z-[70] space-y-4">
              
              {!replacementModal.isDirectSwap ? (
                  <>
                    <SearchableSelect 
                        label="Cobrador de Reemplazo" icon={FiUser} 
                        options={freeUsers.map(c => ({ label: c.name, value: c.id.toString() }))} 
                        value={replacementModal.replacementUserId} 
                        onChange={(val: string) => setReplacementModal(prev => ({...prev, replacementUserId: val}))} 
                        placeholder={freeUsers.length === 0 ? "Selecciona un cobrador" : "Selecciona reemplazo libre"}
                        disabled={freeUsers.length === 0}
                    />

                    {routes.find(r => r.id === replacementModal.targetRouteId)?.assignedTo && (
                        <button 
                            onClick={handleDirectSwap}
                            className="w-full py-2 text-sm text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/10 transition-colors"
                        >
                            <FiRefreshCw className="inline mr-2" />
                            Intercambiar conductores entre rutas
                        </button>
                    )}

                    {freeUsers.length === 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                        <p className="text-red-400 text-xs font-bold mb-3">Bloqueo: No hay personal libre disponible para cubrir el puesto.</p>
                        <button 
                            onClick={() => setUserModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
                        >
                            <FiUserPlus /> Crear Nuevo Cobrador
                        </button>
                        </div>
                    )}
                  </>
              ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                      <p className="text-blue-400 text-sm font-medium">
                          Se realizará un intercambio directo. 
                          El conductor actual pasará a la Ruta {replacementModal.oldRouteId}.
                      </p>
                      <button 
                          onClick={() => setReplacementModal(prev => ({...prev, isDirectSwap: false, replacementUserId: ''}))}
                          className="mt-3 text-xs text-slate-400 hover:text-white underline"
                      >
                          Cancelar intercambio directo
                      </button>
                  </div>
              )}
            </div>

            <div className="flex gap-3 justify-end font-sans">
              <button onClick={() => setReplacementModal(prev => ({...prev, isOpen: false, isDirectSwap: false}))} className="px-5 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/5 w-full uppercase tracking-widest text-[10px]">Cancelar</button>
              <button 
                onClick={() => executeReassign(replacementModal.targetRouteId, replacementModal.newUserId.toString(), replacementModal.replacementUserId)} 
                disabled={!replacementModal.replacementUserId}
                className="px-5 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white w-full uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:bg-slate-700"
              >
                Confirmar Cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREACIÓN DE USUARIO ALINEADO A USERSPAGE */}
      {userModalOpen && (
        <div className="fixed inset-0 z-[300] flex md:items-center justify-center bg-[#020408]/90 backdrop-blur-md px-0 md:px-4">
          <div className="relative w-full h-[100dvh] md:h-auto md:w-[min(920px,92vw)] md:max-h-[85dvh] bg-[#05050A] md:bg-[#05050A]/80 md:backdrop-blur-3xl md:border border-white/10 rounded-none md:rounded-[36px] flex flex-col overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            
            <div className="flex justify-between items-start px-6 md:px-10 pt-8 md:pt-9 pb-4 shrink-0 border-b border-white/[0.05]">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FiUserPlus className="text-blue-500"/> Alta Rápida de Empleado
                </h2>
                <p className="text-sm text-slate-400 mt-1 hidden md:block">
                  Completa la información para asignar inmediatamente a la ruta.
                </p>
              </div>
              <button onClick={() => setUserModalOpen(false)} className="p-2 text-slate-500 hover:text-white" aria-label="Cerrar">
                <FiX size={24} />
              </button>
            </div>

            <div className="flex-1 px-6 md:px-10 py-8 md:py-9 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="emergencyUserForm" onSubmit={handleCreateEmergencyUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Nombre Completo" placeholder="Juan Pérez" icon={FiUser}
                    value={newUserForm.name} onChange={(e: any) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    required
                  />
                  <InputGroup
                    label="Cédula (CC)" placeholder="123456" type="number" icon={FiCreditCard}
                    value={newUserForm.document} onChange={(e: any) => setNewUserForm({ ...newUserForm, document: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Correo Electrónico" placeholder="correo@ejemplo.com" type="email" icon={FiMail}
                    value={newUserForm.email} onChange={(e: any) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    required
                  />
                  <InputGroup
                    label="Contraseña" placeholder="********" type="password" icon={FiLock}
                    value={newUserForm.password} onChange={(e: any) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    required
                  />
                </div>

                <InputGroup
                  label="Dirección" placeholder="Calle 123" icon={FiMapPin}
                  value={newUserForm.address} onChange={(e: any) => setNewUserForm({ ...newUserForm, address: e.target.value })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Teléfono" placeholder="300..." type="tel" icon={FiPhone}
                    value={newUserForm.phone} onChange={(e: any) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  />
                  <CustomSelect
                    label="Rol de Acceso" icon={FiShield} options={roles}
                    value={newUserForm.role} onChange={(val: string) => setNewUserForm({ ...newUserForm, role: val })}
                  />
                </div>
              </form>
            </div>

            <div className="px-6 md:px-10 pt-5 pb-8 border-t border-white/[0.05] bg-[#020408]/50 flex gap-4 backdrop-blur-xl shrink-0">
              <button type="button" onClick={() => setUserModalOpen(false)} className="w-1/3 py-3.5 rounded-2xl border border-white/5 text-slate-400 font-medium hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button form="emergencyUserForm" type="submit" disabled={isSavingUser} className="w-2/3 py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2">
                {isSavingUser ? <FiLoader className="animate-spin" /> : "Guardar y Asignar"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE ALERTAS ESTÁNDAR */}
      {alertState.open && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-[440px] rounded-[40px] border border-white/10 bg-[#05050A] shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] transform-gpu">
            <div className="p-8 flex items-start gap-5">
              <div className={`h-14 w-14 rounded-[22px] flex items-center justify-center border shrink-0 ${alertState.variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-400" : alertState.variant === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}><FiAlertTriangle size={24} /></div>
              <div><h3 className="text-white font-bold text-xl font-display">{alertState.title}</h3><p className="text-slate-400 text-sm mt-2 leading-relaxed">{alertState.message}</p></div>
            </div>
            <div className="px-8 pb-8 flex gap-3 justify-end font-sans">
              {alertState.cancelText && <button onClick={closeAlert} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]"> {alertState.cancelText} </button>}
              <button onClick={() => alertState.onConfirm ? alertState.onConfirm() : closeAlert()} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg uppercase tracking-widest text-[10px] ${alertState.variant === "danger" ? "bg-red-600 text-white shadow-red-600/20" : alertState.variant === "success" ? "bg-emerald-600 text-white shadow-emerald-600/20" : "bg-blue-600 text-white shadow-blue-600/20"}`}>{alertState.confirmText || "Aceptar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers Formulario Alineado
function InputGroup({ label, type = "text", placeholder, icon: Icon, value, onChange, required }: any) {
  return (
    <div className="space-y-2 relative group">
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 group-focus-within:text-blue-400">
          <Icon size={18} />
        </div>
        <input
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-[#0B1020]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-base md:text-sm text-white focus:border-blue-500/50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
        />
      </div>
    </div>
  );
}

function CustomSelect({ label, icon: Icon, options, value, onChange }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const displayLabel = options.find((opt: any) => opt.value === value)?.label || value;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2 relative group" ref={dropdownRef}>
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-[#0B1020]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-base md:text-sm text-white focus:border-blue-500/50 outline-none transition-all shadow-inner"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
            <Icon size={18} />
          </div>
          <span>{displayLabel}</span>
          <FiChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-[#0B1020] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {options.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left ${
                  value === opt.value ? "bg-blue-500/10 text-blue-400" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <FiCheck size={16} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
        <button type="button" disabled={disabled || isBusy} onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }} className={`w-full flex items-center justify-between bg-[#0B1020]/50 border border-white/5 rounded-2xl px-4 ${compact ? 'py-2.5' : 'py-3.5'} text-base md:text-sm text-white focus:border-blue-500/50 outline-none transition-all shadow-inner hover:bg-[#0B1020]/80`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {isBusy ? <FiLoader className="animate-spin text-blue-500" /> : Icon && <Icon size={18} className={isOpen ? 'text-blue-400' : 'text-slate-500'} />}
            <span className={`truncate ${value ? 'text-white' : 'text-slate-500'} font-medium`}>{isBusy ? 'Cargando...' : displayLabel}</span>
          </div>
          <FiChevronDown className={`transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-[#0B1020]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-[slideDown_0.2s] transform-gpu">
            <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0B1020] z-10">
              <FiSearch className="text-slate-500 ml-2" />
              <input ref={inputRef} type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full bg-transparent py-2 text-base md:text-sm text-white outline-none placeholder:text-slate-600" />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any) => (
                  <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`w-full flex items-center justify-between px-5 py-4 text-sm md:text-xs text-left transition-all hover:bg-white/5 ${value === opt.value ? "bg-blue-600 text-white font-bold" : "text-slate-300"}`}>
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