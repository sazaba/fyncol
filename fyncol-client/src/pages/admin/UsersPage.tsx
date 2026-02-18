// src/pages/admin/UsersPage.tsx
import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiCamera, FiMoreVertical } from "react-icons/fi";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  const dummyUsers = [
    { id: 1, name: "Carlos Ramírez", doc: "1088234567", phone: "310 555 1234", role: "Cobrador", status: "Activo" },
    { id: 2, name: "Ana Martínez", doc: "42111222", phone: "300 222 3333", role: "Administrador", status: "Inactivo" },
  ];

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
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/10">
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
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 flex items-center justify-center font-bold text-base shrink-0 border border-blue-500/10">
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

      {/* MODAL DE REGISTRO PREMIUM GLASSMORPHISM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#020408]/80 backdrop-blur-md p-0 md:p-4 transition-all">
          
          {/* Luces de fondo (Glows) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[120px]" />
          </div>

          {/* Contenedor del Modal (Estructura Flex para evitar que se corte) */}
          <div className="relative w-full max-w-lg bg-[#05050A]/90 backdrop-blur-2xl border-t md:border border-white/10 rounded-t-[32px] md:rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[92dvh] animate-[slideUp_0.3s_ease-out] md:animate-none overflow-hidden">
            
            {/* Handle Drag Móvil */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 shrink-0 md:hidden" />

            {/* HEADER MODAL (Fijo) */}
            <div className="px-6 md:px-8 pt-4 md:pt-8 pb-4 shrink-0 border-b border-white/5">
              <h2 className="text-xl md:text-2xl font-bold text-white font-sora">Nuevo Usuario</h2>
              <p className="text-xs text-slate-400 mt-1">Completa los datos para registrar un nuevo integrante.</p>
            </div>
            
            {/* BODY MODAL (Scrolleable) */}
            <div className="px-6 md:px-8 py-6 overflow-y-auto custom-scrollbar">
              <form className="space-y-6">
                
                {/* Foto */}
                <div className="flex justify-center">
                   <div className="h-24 w-24 rounded-full bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/10 transition-all group shadow-inner">
                     <FiCamera size={24} className="mb-1 group-hover:scale-110 transition-transform duration-300" />
                     <span className="text-[10px] font-semibold uppercase tracking-wider">Subir</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Nombre Completo" placeholder="Ej: Juan Pérez" />
                  <InputGroup label="Cédula (CC)" placeholder="12345678" type="number" />
                </div>
                
                <InputGroup label="Dirección" placeholder="Calle 123 # 45-67" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Teléfono" placeholder="300 123 4567" type="tel" />
                  <div className="space-y-1.5">
                    <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">Rol</label>
                    <select className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-blue-500/50 focus:bg-[#0B1020] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all [&>option]:bg-[#0B1020]">
                      <option>Cobrador</option>
                      <option>Administrador</option>
                      <option>Supervisor</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* FOOTER MODAL (Fijo) */}
            <div className="px-6 md:px-8 py-5 border-t border-white/5 bg-[#05050A] shrink-0 flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-medium hover:bg-white/5 transition-all active:scale-95 text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all active:scale-95 text-sm shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)]"
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

// Helper para Inputs estilizados
function InputGroup({ label, type = "text", placeholder }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-blue-500/50 focus:bg-[#0B1020] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 shadow-sm" 
      />
    </div>
  );
}