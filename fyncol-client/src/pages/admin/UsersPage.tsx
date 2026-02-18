// src/pages/admin/UsersPage.tsx
import { useState, useRef, useEffect } from "react";
import { 
  FiPlus, FiEdit2, FiTrash2, FiCamera, FiMoreVertical, 
  FiUser, FiCreditCard, FiMapPin, FiPhone, FiShield,
  FiChevronDown, FiCheck
} from "react-icons/fi";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Cobrador");

  const dummyUsers = [
    { id: 1, name: "Carlos Ramírez", doc: "1088234567", phone: "310 555 1234", role: "Cobrador", status: "Activo" },
    { id: 2, name: "Ana Martínez", doc: "42111222", phone: "300 222 3333", role: "Administrador", status: "Inactivo" },
  ];
  
  const roles = ["Cobrador", "Administrador", "Supervisor"];

  return (
    <div className="max-w-6xl mx-auto p-4 pt-8 md:p-8 md:pt-10 font-inter">
      
      {/* HEADER PAGE */}
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-sora tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-400 mt-1">Administra los accesos y roles del equipo.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)} 
          className="group relative overflow-hidden bg-blue-600 px-4 md:px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.7)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-white/20 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <FiPlus size={20} className="text-white relative z-10" />
          <span className="hidden md:inline text-white relative z-10">Crear Usuario</span>
        </button>
      </div>

      {/* VISTA ESCRITORIO: Tabla */}
      <div className="hidden md:block border border-white/5 rounded-3xl overflow-hidden bg-[#0B1020]/40 backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-slate-400 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-5">Usuario</th>
              <th className="px-6 py-5">Documento</th>
              <th className="px-6 py-5">Contacto</th>
              <th className="px-6 py-5">Rol</th>
              <th className="px-6 py-5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
             {dummyUsers.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>No hay usuarios registrados aún.</td>
                </tr>
             ) : (
                dummyUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                        {user.name.charAt(0)}
                      </div>
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{user.doc}</td>
                    <td className="px-6 py-4 text-slate-400">{user.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${user.role === 'Administrador' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><FiEdit2 size={16} /></button>
                        <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
             )}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL: Tarjetas */}
      <div className="md:hidden space-y-3">
        {dummyUsers.length === 0 ? (
          <div className="text-center py-10 bg-[#0B1020]/40 rounded-3xl border border-white/5 text-slate-500 text-sm backdrop-blur-md">No hay usuarios registrados aún.</div>
        ) : (
          dummyUsers.map((user) => (
            <div key={user.id} className="bg-[#0B1020]/60 border border-white/5 rounded-3xl p-5 flex items-center justify-between backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center font-bold text-base shrink-0 border border-blue-500/10">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-base font-medium text-white">{user.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">{user.role} • {user.doc}</p>
                </div>
              </div>
              <button className="p-2 text-slate-500 hover:text-white transition-colors active:bg-white/5 rounded-xl">
                <FiMoreVertical size={22} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL ULTRA PREMIUM (SCROLL & ARROWS HIDDEN + NO MOBILE ZOOM) */}
      {/* ========================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#020408]/80 backdrop-blur-md p-0 md:p-4 transition-all">
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
          </div>

          <div className="relative w-full max-w-[520px] bg-[#05050A]/80 backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[36px] md:rounded-[36px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[92dvh] animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] md:animate-none overflow-hidden ring-1 ring-white/5">
            
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 shrink-0 md:hidden" />

            {/* HEADER MODAL */}
            <div className="px-6 md:px-10 pt-5 md:pt-10 pb-4 shrink-0 border-b border-white/[0.05]">
              <h2 className="text-xl md:text-2xl font-bold text-white font-sora">Nuevo Usuario</h2>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">Completa los datos para registrar un nuevo integrante.</p>
            </div>
            
            {/* BODY MODAL - Scroll oculto visualmente pero funcional */}
            <div className="px-6 md:px-10 py-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form className="space-y-6">
                
                {/* Foto Profile Area */}
                <div className="flex justify-center mb-2">
                   <div className="relative group cursor-pointer">
                     <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-colors duration-500" />
                     <div className="relative h-28 w-28 rounded-full bg-[#0B1020]/80 border border-white/10 flex flex-col items-center justify-center text-slate-400 group-hover:border-blue-500/50 group-hover:text-blue-400 transition-all duration-300 shadow-inner">
                       <FiCamera size={28} className="mb-2 group-hover:scale-110 transition-transform duration-300" />
                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Subir</span>
                     </div>
                   </div>
                </div>

                {/* Grid de Inputs con Íconos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Nombre Completo" placeholder="Ej: Juan Pérez" icon={FiUser} />
                  <InputGroup label="Cédula (CC)" placeholder="12345678" type="number" icon={FiCreditCard} />
                </div>
                
                <InputGroup label="Dirección" placeholder="Calle 123 # 45-67" icon={FiMapPin} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Teléfono" placeholder="300 123 4567" type="tel" icon={FiPhone} />
                  
                  {/* Select Personalizado */}
                  <CustomSelect 
                    label="Rol de Acceso" 
                    icon={FiShield} 
                    options={roles} 
                    value={selectedRole} 
                    onChange={setSelectedRole} 
                  />
                </div>
              </form>
            </div>

            {/* FOOTER MODAL */}
            <div className="px-6 md:px-10 py-5 border-t border-white/[0.05] bg-[#020408]/50 shrink-0 flex gap-4 backdrop-blur-xl">
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="w-1/3 py-3.5 rounded-2xl border border-white/5 text-slate-400 font-medium hover:bg-white/5 hover:text-white transition-all active:scale-95 text-base md:text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="w-2/3 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all active:scale-95 text-base md:text-sm shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.7)] flex justify-center items-center gap-2"
              >
                Guardar Usuario
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HELPERS (Con Fix 'text-base md:text-sm' para evitar Zoom en iOS)
// ==========================================

function InputGroup({ label, type = "text", placeholder, icon: Icon }: any) {
  return (
    <div className="space-y-2 relative group">
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input 
          type={type} 
          placeholder={placeholder} 
          // FIX ZOOM: text-base en móvil, text-sm en desktop (md:text-sm)
          className={`w-full bg-[#0B1020]/50 border border-white/5 rounded-2xl ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3.5 text-base md:text-sm text-white focus:border-blue-500/50 focus:bg-blue-500/[0.02] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 shadow-inner [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]`} 
        />
      </div>
    </div>
  );
}

function CustomSelect({ label, icon: Icon, options, value, onChange }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="space-y-2 relative group" ref={dropdownRef}>
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          // FIX ZOOM: text-base en móvil, text-sm en desktop (md:text-sm)
          className={`w-full flex items-center justify-between bg-[#0B1020]/50 border border-white/5 rounded-2xl ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3.5 text-base md:text-sm focus:border-blue-500/50 focus:bg-blue-500/[0.02] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner text-left ${isOpen ? 'border-blue-500/50 bg-blue-500/[0.02] ring-4 ring-blue-500/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
        >
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
              <Icon size={18} className={isOpen ? 'text-blue-400' : ''} />
            </div>
          )}
          <span className="truncate">{value}</span>
          <FiChevronDown size={18} className={`text-slate-500 transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
        </button>

        <div className={`absolute z-20 mt-2 w-full bg-[#0B1020] border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl overflow-hidden transition-all duration-200 origin-top ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
          <div className="py-2 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {options.map((option: string) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                // FIX ZOOM: text-base en móvil, text-sm en desktop (md:text-sm)
                className={`w-full flex items-center justify-between px-4 py-3 text-base md:text-sm text-left transition-colors ${value === option ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span>{option}</span>
                {value === option && <FiCheck size={16} className="text-blue-400 flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}