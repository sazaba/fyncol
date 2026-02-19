// src/pages/admin/UsersPage.tsx
import { useState, useRef, useEffect } from "react";
import { 
  FiPlus, FiEdit2, FiTrash2, FiCamera, FiMoreVertical, 
  FiUser, FiCreditCard, FiMapPin, FiPhone, FiShield,
  FiChevronDown, FiCheck, FiX, FiMail 
} from "react-icons/fi";

// Variable de entorno
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // Estado para usuarios reales
  
  // Estado para el formulario
  const [selectedRole, setSelectedRole] = useState("COBRADOR");
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    address: "",
    phone: ""
  });

  const roles = [
    { label: "Cobrador", value: "COBRADOR" },
    { label: "Administrador", value: "ADMIN" },
    { label: "Supervisor", value: "SUPERVISOR" }
  ];

  // 1. OBTENER USUARIOS DE LA BD
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. GUARDAR USUARIO EN LA BD
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          role: selectedRole // Enviamos el valor en MAYÚSCULAS para el Enum de Prisma
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        setFormData({ name: "", document: "", email: "", address: "", phone: "" });
        fetchUsers(); // Recargamos la lista
      } else {
        alert(data.message || "Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // Bloquear scroll al abrir modal
  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal]);

  return (
    <div className="max-w-6xl mx-auto p-4 pt-8 md:p-8 md:pt-10 font-inter">
      
      {/* HEADER PAGE */}
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-sora tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-400 mt-1 text-pretty">Administra los accesos y roles del equipo.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)} 
          className="group relative overflow-hidden bg-blue-600 px-4 md:px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]"
        >
          <FiPlus size={20} className="text-white relative z-10" />
          <span className="hidden md:inline text-white relative z-10">Crear Usuario</span>
        </button>
      </div>

      {/* VISTA ESCRITORIO: Tabla Real */}
      <div className="hidden md:block border border-white/5 rounded-3xl overflow-hidden bg-[#0B1020]/40 backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-slate-400 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-5">Usuario</th>
              <th className="px-6 py-5">Documento</th>
              <th className="px-6 py-5">Rol</th>
              <th className="px-6 py-5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
             {users.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>Cargando usuarios...</td>
                </tr>
             ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/10">
                        {user.imageUrl ? <img src={user.imageUrl} className="rounded-full h-full w-full object-cover" /> : user.name?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{user.document}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-blue-400"><FiEdit2 size={16} /></button>
                        <button className="p-2 text-slate-400 hover:text-red-400"><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
             )}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL: Tarjetas Reales */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <div key={user.id} className="bg-[#0B1020]/60 border border-white/5 rounded-3xl p-5 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/10">
                {user.imageUrl ? <img src={user.imageUrl} className="rounded-full h-full w-full object-cover" /> : user.name?.charAt(0)}
              </div>
              <div>
                <p className="text-base font-medium text-white">{user.name}</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">{user.role} • {user.document}</p>
              </div>
            </div>
            <button className="p-2 text-slate-500"><FiMoreVertical size={22} /></button>
          </div>
        ))}
      </div>

      {/* MODAL INTEGRADO */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex md:items-center justify-center bg-[#020408]/90 backdrop-blur-md">
          <div className="relative w-full h-[100dvh] md:h-auto md:max-w-[520px] bg-[#05050A] md:bg-[#05050A]/80 md:backdrop-blur-3xl md:border border-white/10 rounded-none md:rounded-[36px] flex flex-col overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            
            <div className="flex justify-between items-start px-6 md:px-10 pt-8 md:pt-10 pb-4 shrink-0 border-b border-white/[0.05]">
              <h2 className="text-2xl font-bold text-white font-sora">Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-500 hover:text-white"><FiX size={24} /></button>
            </div>
            
            <div className="flex-1 px-6 md:px-10 py-8 overflow-y-auto custom-scrollbar">
              <form id="userForm" onSubmit={handleSaveUser} className="space-y-6">
                
                <div className="flex justify-center mb-4">
                   <div className="h-28 w-28 rounded-full bg-[#0B1020]/80 border border-white/10 flex flex-col items-center justify-center text-slate-400 shadow-inner">
                     <FiCamera size={28} className="mb-2" />
                     <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 text-center px-2">Cloudinary Próximamente</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup 
                    label="Nombre Completo" 
                    placeholder="Juan Pérez" 
                    icon={FiUser} 
                    value={formData.name}
                    onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <InputGroup 
                    label="Cédula (CC)" 
                    placeholder="123456" 
                    type="number" 
                    icon={FiCreditCard} 
                    value={formData.document}
                    onChange={(e: any) => setFormData({...formData, document: e.target.value})}
                    required
                  />
                </div>

                <InputGroup 
                    label="Correo Electrónico" 
                    placeholder="correo@empresa.com" 
                    type="email" 
                    icon={FiMail} 
                    value={formData.email}
                    onChange={(e: any) => setFormData({...formData, email: e.target.value})}
                    required
                />
                
                <InputGroup 
                    label="Dirección" 
                    placeholder="Calle 123" 
                    icon={FiMapPin} 
                    value={formData.address}
                    onChange={(e: any) => setFormData({...formData, address: e.target.value})}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup 
                    label="Teléfono" 
                    placeholder="300..." 
                    type="tel" 
                    icon={FiPhone} 
                    value={formData.phone}
                    onChange={(e: any) => setFormData({...formData, phone: e.target.value})}
                  />
                  
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

            <div className="px-6 md:px-10 pt-5 pb-8 border-t border-white/[0.05] bg-[#020408]/50 flex gap-4 backdrop-blur-xl">
              <button type="button" onClick={() => setShowModal(false)} className="w-1/3 py-3.5 rounded-2xl border border-white/5 text-slate-400 font-medium text-sm">Cancelar</button>
              <button 
                form="userForm"
                type="submit" 
                disabled={loading}
                className="w-2/3 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers actualizados con Props de Formulario
function InputGroup({ label, type = "text", placeholder, icon: Icon, value, onChange, required }: any) {
  return (
    <div className="space-y-2 relative group">
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
          <Icon size={18} />
        </div>
        <input 
          type={type} 
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder} 
          className="w-full bg-[#0B1020]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-base md:text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 shadow-inner" 
        />
      </div>
    </div>
  );
}

function CustomSelect({ label, icon: Icon, options, value, onChange }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mapeamos el valor interno (MAYÚS) a la etiqueta visual (Normal)
  const displayLabel = options.find((opt: any) => opt.value === value)?.label || value;

  return (
    <div className="space-y-2 relative group" ref={dropdownRef}>
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-[#0B1020]/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-base md:text-sm text-white focus:border-blue-500/50 outline-none transition-all shadow-inner"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500"><Icon size={18} /></div>
          <span>{displayLabel}</span>
          <FiChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-[#0B1020] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {options.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left ${value === opt.value ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:bg-white/5'}`}
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