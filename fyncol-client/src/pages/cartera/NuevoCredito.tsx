import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FiMapPin, FiUploadCloud, FiSave, FiUser, FiDollarSign, 
  FiMap, FiBriefcase, FiAlertTriangle, FiX, FiLoader, FiCalendar, FiList, FiCreditCard, FiPhone, FiChevronDown, 
  FiSearch
} from 'react-icons/fi';

interface ClientFormData {
  name: string;
  documentId: string;
  phone: string;
  address: string;
  routeId: string;
  amount: string;
  installments: string;
  interestRate: string;
  periodicity: string;
  firstPaymentDate: string; 
}

interface LocationData {
  latitude: number | null;
  longitude: number | null;
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

const COUNTRY_CODES = [
  { code: '+57', country: 'Colombia', aliases: ['colombia', 'col'] },
  { code: '+52', country: 'México', aliases: ['mexico', 'méxico', 'mex'] },
  { code: '+51', country: 'Perú', aliases: ['peru', 'perú'] },
  { code: '+54', country: 'Argentina', aliases: ['argentina', 'arg'] },
  { code: '+56', country: 'Chile', aliases: ['chile'] },
  { code: '+593', country: 'Ecuador', aliases: ['ecuador'] },
  { code: '+58', country: 'Venezuela', aliases: ['venezuela', 'ven'] },
  { code: '+507', country: 'Panamá', aliases: ['panama', 'panamá'] },
  { code: '+34', country: 'España', aliases: ['españa', 'spain', 'es'] },
  { code: '+1', country: 'USA/Canadá', aliases: ['usa', 'estados unidos', 'eeuu', 'us', 'canada', 'canadá'] },
  { code: '+55', country: 'Brasil', aliases: ['brasil', 'brazil', 'br'] }, 
  { code: '+598', country: 'Uruguay', aliases: ['uruguay'] },
  { code: '+595', country: 'Paraguay', aliases: ['paraguay'] },
  { code: '+591', country: 'Bolivia', aliases: ['bolivia'] },
];

// NUEVO: Diccionario para anclar la zona horaria real según el país
const COUNTRY_TIMEZONES: Record<string, string> = {
  'Colombia': 'America/Bogota',
  'México': 'America/Mexico_City',
  'Perú': 'America/Lima',
  'Argentina': 'America/Argentina/Buenos_Aires',
  'Chile': 'America/Santiago',
  'Ecuador': 'America/Guayaquil',
  'Venezuela': 'America/Caracas',
  'Panamá': 'America/Panama',
  'España': 'Europe/Madrid',
  'USA/Canadá': 'America/New_York', 
  'Brasil': 'America/Sao_Paulo', 
  'Uruguay': 'America/Montevideo',
  'Paraguay': 'America/Asuncion',
  'Bolivia': 'America/La_Paz',
};

export default function NuevoCredito() {
  
  // NUEVO HELPER: Calcula la fecha exacta basada en el país de la ruta
  const getRouteDateStr = (countryStr?: string, addDays: number = 0) => {
    let tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // Fallback navegador
    if (countryStr) {
      const match = COUNTRY_CODES.find(c => c.aliases.some(alias => countryStr.toLowerCase().trim().includes(alias)));
      if (match && COUNTRY_TIMEZONES[match.country]) {
        tz = COUNTRY_TIMEZONES[match.country];
      }
    }
    
    // Obtenemos la hora actual en esa zona horaria específica
    const nowStr = new Date().toLocaleString("en-US", { timeZone: tz });
    const routeDate = new Date(nowStr);
    
    routeDate.setDate(routeDate.getDate() + addDays);
    
    const yyyy = routeDate.getFullYear();
    const mm = String(routeDate.getMonth() + 1).padStart(2, '0');
    const dd = String(routeDate.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  };

  const [formData, setFormData] = useState<ClientFormData>({
    name: '', documentId: '', phone: '', address: '', routeId: '',
    amount: '', installments: '', interestRate: '', 
    periodicity: 'MENSUAL', firstPaymentDate: getRouteDateStr() 
  });
  
  const [location, setLocation] = useState<LocationData>({ latitude: null, longitude: null });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [rutaAsignada, setRutaAsignada] = useState<any | null>(null);
  const [isLoadingRuta, setIsLoadingRuta] = useState(true);
  const [errorFetchRuta, setErrorFetchRuta] = useState<string | null>(null);

  const [showAmortization, setShowAmortization] = useState(false);

  const [phoneCode, setPhoneCode] = useState('+57');
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [alertState, setAlertState] = useState<PremiumAlertState>({
    open: false, variant: "info", title: "", message: "",
    confirmText: "Confirmar", cancelText: "", onConfirm: null,
  });

  const openAlert = (payload: Partial<PremiumAlertState>) => {
    setAlertState((prev) => ({ ...prev, open: true, ...payload }));
  };

  const closeAlert = () => setAlertState((prev) => ({ ...prev, open: false, onConfirm: null }));

  useEffect(() => {
    document.body.style.overflow = (alertState.open || showAmortization) ? "hidden" : "auto";
  }, [alertState.open, showAmortization]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (alertState.open) closeAlert();
        if (showAmortization) setShowAmortization(false);
        if (isPhoneDropdownOpen) setIsPhoneDropdownOpen(false);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPhoneDropdownOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [alertState.open, showAmortization, isPhoneDropdownOpen]);

  const fetchMiRuta = async () => {
    setIsLoadingRuta(true);
    setErrorFetchRuta(null);
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      
      if (!userStr || !token) {
        setErrorFetchRuta("Sesión no válida. Vuelve a iniciar sesión.");
        return;
      }

      const currentUser = JSON.parse(userStr);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/rutas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const rutas = Array.isArray(data) ? data : data.data || []; 
        const miRutaEncontrada = rutas.find((r: any) => r.assignedTo?.id === currentUser.id);
        
        if (miRutaEncontrada) {
          setRutaAsignada(miRutaEncontrada);
          setFormData(prev => ({ ...prev, routeId: miRutaEncontrada.id.toString() }));
        } else {
          setErrorFetchRuta("No tienes ninguna ruta asignada actualmente.");
        }
      } else {
        setErrorFetchRuta(`Error del servidor: código ${res.status}`);
      }
    } catch (error) {
      setErrorFetchRuta("Error de conexión con el servidor.");
    } finally {
      setIsLoadingRuta(false);
    }
  };

  useEffect(() => { fetchMiRuta(); }, []);

  useEffect(() => {
    if (rutaAsignada && rutaAsignada.country) {
      const rutaPais = rutaAsignada.country.toLowerCase().trim();
      const match = COUNTRY_CODES.find(c => 
        c.aliases.some(alias => rutaPais.includes(alias))
      );
      if (match) {
        setPhoneCode(match.code);
      }
    }
  }, [rutaAsignada]);

  // CORRECCIÓN: Calcular la fecha de primer pago usando el Timezone de la ruta
  useEffect(() => {
    let daysToAdd = 1; 

    if (formData.periodicity === 'QUINCENAL') daysToAdd = 15;
    if (formData.periodicity === 'MENSUAL') daysToAdd = 30;

    const newPaymentDate = getRouteDateStr(rutaAsignada?.country, daysToAdd);
    
    setFormData(prev => ({ ...prev, firstPaymentDate: newPaymentDate }));
  }, [formData.periodicity, rutaAsignada?.country]);

  // CORRECCIÓN: Base matemática alineada a la zona horaria
  const creditMetrics = useMemo(() => {
    const amountNum = parseFloat(formData.amount) || 0;
    const interestNum = parseFloat(formData.interestRate) || 0;
    const installmentsNum = parseInt(formData.installments) || 0;

    if (amountNum === 0 || installmentsNum === 0 || !formData.firstPaymentDate) {
      return { total: 0, installmentValue: 0, schedule: [] };
    }

    let daysPerInstallment = 1; 
    if (formData.periodicity === 'QUINCENAL') daysPerInstallment = 15;
    if (formData.periodicity === 'MENSUAL') daysPerInstallment = 30;

    // Calculamos "Hoy" usando la zona de la ruta asignada
    const todayStr = getRouteDateStr(rutaAsignada?.country, 0);
    const [tYear, tMonth, tDay] = todayStr.split('-');
    const today = new Date(parseInt(tYear), parseInt(tMonth) - 1, parseInt(tDay));
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = formData.firstPaymentDate.split('-');
    const firstPayment = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    firstPayment.setHours(0, 0, 0, 0);

    const diffTime = firstPayment.getTime() - today.getTime();
    let daysUntilFirstPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilFirstPayment <= 0) daysUntilFirstPayment = 1;

    const totalDays = daysUntilFirstPayment + ((installmentsNum - 1) * daysPerInstallment);
    const interestPerDay = (interestNum / 100 / 30) * amountNum;
    const totalInterestExact = interestPerDay * totalDays;

    const exactProjectedTotal = amountNum + totalInterestExact;
    
    const installmentValue = Math.ceil(exactProjectedTotal / installmentsNum);
    const total = installmentValue * installmentsNum;

    const schedule = [];
    let currentBalance = total;
    let currentDate = new Date(firstPayment);

    for (let i = 1; i <= installmentsNum; i++) {
      schedule.push({
        number: i,
        date: currentDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' }),
        amount: installmentValue,
        balance: Math.max(0, currentBalance - installmentValue) 
      });
      
      if (formData.periodicity === 'MENSUAL') {
        currentDate.setMonth(currentDate.getMonth() + 1); 
      } else if (formData.periodicity === 'QUINCENAL') {
        currentDate.setDate(currentDate.getDate() + 15); 
      } else {
        currentDate.setDate(currentDate.getDate() + 1); 
      }
      currentBalance -= installmentValue;
    }
    return { total, installmentValue, schedule };
  }, [formData.amount, formData.interestRate, formData.installments, formData.periodicity, formData.firstPaymentDate, rutaAsignada?.country]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          openAlert({
            variant: "success", title: "Ubicación capturada",
            message: "Las coordenadas GPS se han registrado correctamente.",
            confirmText: "Entendido", onConfirm: () => closeAlert()
          });
        },
        () => {
          openAlert({
            variant: "danger", title: "Error GPS",
            message: "Por favor habilita el GPS o los permisos de ubicación en tu navegador.",
            confirmText: "Entendido", onConfirm: () => closeAlert()
          });
        }
      );
    } else {
      openAlert({
        variant: "info", title: "No Soportado",
        message: "Tu navegador o dispositivo no soporta geolocalización.",
        confirmText: "Entendido", onConfirm: () => closeAlert()
      });
    }
  };

  const uploadToCloudinary = async (imageFile: File): Promise<string> => {
    const data = new FormData();
    data.append("file", imageFile);
    data.append("upload_preset", "fyncol_cedulas"); 
    const response = await fetch(`https://api.cloudinary.com/v1_1/dr2fkqgfz/image/upload`, { method: "POST", body: data });
    if (!response.ok) throw new Error("Error al subir la imagen a Cloudinary");
    const json = await response.json();
    return json.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.routeId) throw new Error("No hay una ruta asignada válida.");
      if (!formData.firstPaymentDate) throw new Error("Selecciona una fecha de primer pago.");

      let documentUrl = null;
      if (file) documentUrl = await uploadToCloudinary(file);

      const finalPhone = formData.phone ? `${phoneCode} ${formData.phone.trim()}` : '';

      const payload = {
        ...formData,
        phone: finalPhone, 
        latitude: location.latitude,
        longitude: location.longitude,
        documentUrl
      };

      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/clients/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => null);
      
      if (!response.ok) {
        if (responseData?.errorType === "ACTIVE_DEBT") {
          throw new Error(responseData.error);
        }
        throw new Error(responseData?.error || "Error del servidor");
      }

      let titleMsg = "Crédito Registrado";
      let successMsg = "El cliente y su préstamo inicial se guardaron correctamente.";
      let alertVariant: AlertVariant = "success";

      if (responseData.otherActiveLoansCount > 0) {
        titleMsg = "Crédito Creado con Alerta";
        successMsg = `El préstamo se registró. OJO: Este cliente tiene ${responseData.otherActiveLoansCount} crédito(s) activo(s) en otras oficinas.`;
        alertVariant = "info"; 
      }

      openAlert({
        variant: alertVariant, 
        title: titleMsg,
        message: successMsg,
        confirmText: "Listo",
        onConfirm: () => {
          closeAlert();
          // Reset formulario anclando la fecha de la nueva inserción al time zone actual
          setFormData({ 
            name: '', documentId: '', phone: '', address: '', routeId: rutaAsignada?.id.toString() || '', 
            amount: '', installments: '', interestRate: '', 
            periodicity: 'DIARIO', firstPaymentDate: getRouteDateStr(rutaAsignada?.country, 1)
          });
          setLocation({ latitude: null, longitude: null });
          setFile(null);
          
          if (rutaAsignada && rutaAsignada.country) {
            const rutaPais = rutaAsignada.country.toLowerCase().trim();
            const match = COUNTRY_CODES.find(c => c.aliases.some(alias => rutaPais.includes(alias)));
            setPhoneCode(match ? match.code : '+57');
          } else {
            setPhoneCode('+57');
          }
          
          fetchMiRuta();
        }
      });
    } catch (error: any) {
      openAlert({
        variant: "danger", title: "Error al guardar",
        message: error.message || "Ocurrió un error inesperado.",
        confirmText: "Entendido", onConfirm: () => closeAlert()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredCountries = COUNTRY_CODES.filter(country => 
    country.aliases.some(alias => alias.includes(phoneSearch.toLowerCase().trim())) || 
    country.code.includes(phoneSearch)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 md:h-[calc(100dvh-90px)] md:overflow-y-auto md:[&::-webkit-scrollbar]:hidden md:[-ms-overflow-style:none] md:[scrollbar-width:none] pb-10">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Nuevo Crédito</h1>
          <p className="text-sm text-slate-400 mt-1">Registra un nuevo cliente y asígnale su crédito inicial.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
          {isLoadingRuta ? (
            <div className="col-span-3 flex items-center justify-center gap-3 text-slate-400 text-sm p-4 bg-[#0B0B12] rounded-xl border border-white/5">
              <FiLoader className="animate-spin text-blue-500" />
              Actualizando métricas de tu ruta...
            </div>
          ) : errorFetchRuta ? (
            <div className="col-span-3 text-red-400 text-sm p-4 bg-red-500/10 rounded-xl border border-red-500/30">
              ⚠️ {errorFetchRuta}
            </div>
          ) : rutaAsignada && (
            <>
              <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FiMap size={14} />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Ruta Operativa</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {rutaAsignada.city}, {rutaAsignada.country} <span className="text-slate-500 text-xs ml-1">(ID: {rutaAsignada.id})</span>
                </p>
              </div>

              <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center border-b-2 border-b-green-500/50 shadow-[0_4px_20px_-10px_rgba(34,197,94,0.3)]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FiDollarSign size={14} className="text-green-400" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-green-400/80">Capital Disponible</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${Math.round(Number(rutaAsignada.availableCapital) || 0).toLocaleString('es-CO')}
                </p>
              </div>

              <div className="bg-[#0B0B12] border border-white/5 rounded-xl p-4 flex flex-col justify-center border-b-2 border-b-blue-500/50 shadow-[0_4px_20px_-10px_rgba(59,130,246,0.3)]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FiBriefcase size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400/80">Total Cartera</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${Math.round(Number(rutaAsignada.totalCartera) || 0).toLocaleString('es-CO')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Datos del Cliente */}
        <div className="bg-[#0B0B12]/80 backdrop-blur-sm border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FiUser size={16} />
            </div>
            <h2 className="text-lg font-semibold text-white">Datos del Cliente</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                Nombre Completo
              </label>
              <input 
                required 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                disabled={!rutaAsignada} 
                className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner" 
                placeholder="Ej: Juan Pérez" 
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                <FiCreditCard size={12} /> Cédula / ID
              </label>
              <input 
                required 
                name="documentId" 
                value={formData.documentId} 
                onChange={handleChange} 
                disabled={!rutaAsignada} 
                className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner" 
                placeholder="Ej: 1020304050" 
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                <FiPhone size={12} /> Celular
              </label>
              <div className="flex gap-2">
                <div className="relative" ref={dropdownRef}>
                  <button 
                    type="button" 
                    onClick={() => setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                    disabled={!rutaAsignada}
                    className="flex items-center justify-between gap-1 min-w-[70px] h-[48px] px-3 bg-[#05050A]/50 border border-white/10 rounded-2xl text-sm text-white shadow-inner transition-colors hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{phoneCode}</span>
                    <FiChevronDown size={14} className="text-slate-500" />
                  </button>

                  {isPhoneDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-[scaleIn_0.1s_ease-out]">
                      <div className="p-2 border-b border-white/5">
                        <div className="relative">
                          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                          <input 
                            type="text" 
                            placeholder="Buscar país..." 
                            value={phoneSearch}
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="w-full bg-[#05050A] text-xs text-white border border-white/10 rounded-lg pl-7 pr-2 py-2 focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <ul className="max-h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {filteredCountries.length > 0 ? filteredCountries.map((c, i) => (
                          <li 
                            key={i} 
                            onClick={() => {
                              setPhoneCode(c.code);
                              setIsPhoneDropdownOpen(false);
                              setPhoneSearch('');
                            }}
                            className="px-3 py-2 text-sm text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 cursor-pointer transition-colors flex justify-between"
                          >
                            <span>{c.country}</span>
                            <span className="text-slate-500">{c.code}</span>
                          </li>
                        )) : (
                          <li className="px-3 py-4 text-xs text-slate-500 text-center">Sin resultados</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <input 
                  type="tel"
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  disabled={!rutaAsignada} 
                  className="flex-1 w-full bg-[#05050A]/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner" 
                  placeholder="Ej: 3001234567" 
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                Dirección Operativa
              </label>
              <input 
                required 
                name="address" 
                value={formData.address} 
                onChange={handleChange} 
                disabled={!rutaAsignada} 
                className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner" 
                placeholder="Ej: Calle Principal 123" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="button" 
              onClick={handleGetLocation} 
              disabled={!rutaAsignada} 
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all ${
                !rutaAsignada 
                  ? 'opacity-50 cursor-not-allowed bg-blue-500/5 border-white/5 text-slate-500' 
                  : location.latitude 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              <FiMapPin size={18} />
              <span className="font-medium text-sm">
                {location.latitude ? "Ubicación Capturada" : "Capturar Ubicación GPS"}
              </span>
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
              Foto de la Cédula
            </label>
            <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 rounded-2xl transition-all bg-[#05050A]/30 ${
              rutaAsignada ? 'hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'
            }`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FiUploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-300">
                  <span className="font-semibold text-blue-400">Haz clic para subir</span> o arrastra
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  SVG, PNG, JPG (MAX. 5MB)
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                disabled={!rutaAsignada} 
              />
            </label>
            {file && (
              <p className="text-xs font-medium text-emerald-400 mt-2 text-center bg-emerald-500/10 py-2 rounded-xl">
                Archivo: {file.name}
              </p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Datos del Crédito */}
        <div className="bg-[#0B0B12]/80 backdrop-blur-sm border border-white/5 rounded-3xl p-6 flex flex-col h-full shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
              <FiDollarSign size={16} />
            </div>
            <h2 className="text-lg font-semibold text-white">Detalles del Préstamo</h2>
          </div>

          <div className="space-y-5 flex-1">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Monto a Prestar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  <input 
                    required 
                    type="number" 
                    name="amount" 
                    value={formData.amount} 
                    onChange={handleChange} 
                    disabled={!rutaAsignada} 
                    className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl pl-8 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Cuotas
                </label>
                <input 
                  required 
                  type="number" 
                  name="installments" 
                  value={formData.installments} 
                  onChange={handleChange} 
                  disabled={!rutaAsignada} 
                  className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner" 
                  placeholder="Ej: 30" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Interés Mensual
                </label>
                <div className="relative">
                  <input 
                    required 
                    type="number" 
                    name="interestRate" 
                    value={formData.interestRate} 
                    onChange={handleChange} 
                    disabled={!rutaAsignada} 
                    className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl pl-4 pr-8 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner" 
                    placeholder="Ej: 20" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Periodicidad
                </label>
                <select 
                  required 
                  name="periodicity" 
                  value={formData.periodicity} 
                  onChange={handleChange} 
                  disabled={!rutaAsignada} 
                  className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                >
                  <option value="DIARIO">Diario</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Primer Pago
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <FiCalendar size={14} />
                  </div>
                  <input 
                    required 
                    type="date"
                    name="firstPaymentDate" 
                    value={formData.firstPaymentDate} 
                    onChange={handleChange} 
                    disabled={!rutaAsignada} 
                    className="w-full bg-[#05050A]/50 border border-white/10 rounded-2xl pl-9 pr-2 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-inner [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
            </div>
            
            {/* CAJA DE RESULTADOS */}
            <div className="mt-8 bg-gradient-to-br from-blue-900/10 to-blue-600/5 border border-blue-500/20 rounded-3xl p-6 flex flex-col gap-5 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)] relative">
              
              <button 
                type="button" 
                onClick={() => setShowAmortization(true)}
                disabled={creditMetrics.schedule.length === 0}
                className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-blue-500/20"
              >
                <FiList size={14} /> 
                <span className="hidden sm:inline">Ver Tabla</span>
              </button>

              <div>
                <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest mb-1">
                  Total Proyectado a Recoger
                </p>
                <p className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  ${creditMetrics.total.toLocaleString('es-CO')}
                </p>
              </div>

              <div className="pt-5 border-t border-blue-500/20">
                <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1">
                  Valor Cuota ({formData.periodicity.toLowerCase()})
                </p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${creditMetrics.installmentValue.toLocaleString('es-CO')}
                </p>
              </div>

            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/5">
            <button 
              type="submit" 
              disabled={isSubmitting || !rutaAsignada} 
              className="group relative w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-2xl py-4 font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin" size={18} /> 
                  Procesando Transacción...
                </>
              ) : (
                <>
                  <FiSave size={18} /> 
                  Guardar Cliente y Crédito
                </>
              )}
            </button>
          </div>
        </div>

      </form>

      {/* MODAL: TABLA DE AMORTIZACIÓN */}
      {showAmortization && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 p-4 md:p-8" onClick={(e) => { if (e.target === e.currentTarget) setShowAmortization(false); }}>
          <div className="w-full max-w-2xl bg-[#05050A] border border-white/10 rounded-[30px] shadow-2xl flex flex-col max-h-[85dvh] animate-[slideUp_0.2s_ease-out]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white">Tabla de Pagos Proyectada</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                  {formData.periodicity} - {formData.installments} CUOTAS
                </p>
              </div>
              <button 
                onClick={() => setShowAmortization(false)} 
                className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-full transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                <div>Nº Cuota</div>
                <div>Fecha</div>
                <div className="text-right">A Pagar</div>
                <div className="text-right">Saldo Restante</div>
              </div>
              
              <div className="space-y-2">
                {creditMetrics.schedule.map((item: any) => (
                  <div key={item.number} className="grid grid-cols-4 gap-2 text-sm items-center bg-white/[0.02] p-3 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5">
                    <div className="font-semibold text-slate-300">
                      #{item.number}
                    </div>
                    <div className="text-blue-300 text-xs md:text-sm">
                      {item.date}
                    </div>
                    <div className="text-right font-medium text-emerald-400">
                      ${item.amount.toLocaleString('es-CO')}
                    </div>
                    <div className="text-right font-medium text-slate-400">
                      ${item.balance.toLocaleString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0B0B12] rounded-b-[30px] shrink-0 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Total a Recoger
                </p>
                <p className="text-xl font-bold text-white">
                  ${creditMetrics.total.toLocaleString('es-CO')}
                </p>
              </div>
              <button 
                onClick={() => setShowAmortization(false)} 
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all active:scale-95"
              >
                Cerrar Tabla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA PREMIUM */}
      {alertState.open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-[520px] rounded-3xl border border-white/10 bg-[#05050A]/90 shadow-2xl overflow-hidden animate-[slideUp_0.18s_ease-out]">
            <div className="p-6 md:p-7 flex items-start gap-4">
              <div
                className={`shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center border ${
                  alertState.variant === "danger"
                    ? "bg-red-500/10 border-red-500/20 text-red-300"
                    : alertState.variant === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-300"
                }`}
              >
                <FiAlertTriangle size={18} />
              </div>

              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{alertState.title}</h3>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">{alertState.message}</p>
              </div>

              <button onClick={closeAlert} className="text-slate-500 hover:text-white p-2 -m-2" aria-label="Cerrar alerta">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-6 md:px-7 pb-6 flex gap-3 justify-end">
              {alertState.cancelText ? (
                <button
                  onClick={closeAlert}
                  className="px-4 py-2.5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm font-medium"
                >
                  {alertState.cancelText}
                </button>
              ) : null}

              <button
                onClick={() => {
                  if (alertState.onConfirm) alertState.onConfirm();
                  else closeAlert();
                }}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  alertState.variant === "danger"
                    ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.35)]"
                    : alertState.variant === "success"
                    ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.30)]"
                    : "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                }`}
              >
                {alertState.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}