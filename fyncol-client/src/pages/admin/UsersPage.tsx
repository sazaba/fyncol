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
    // Se añadió pt-8 en móvil y pt-10 en desktop para separarlo del techo
    <div className="max-w-6xl mx-auto p-4 pt-8 md:p-8 md:pt-10 font-inter">
      
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-sora tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-400 mt-1">Administra los accesos y roles del equipo.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
        >
          <FiPlus size={20} />
          <span className="hidden md:inline">Crear Usuario</span>
        </button>
      </div>

      {/* VISTA ESCRITORIO: Tabla */}
      <div className="hidden md:block border border-white/5 rounded-2xl overflow-hidden bg-[#0B1020]/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-slate-400 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
             {dummyUsers.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={5}>No hay usuarios registrados aún.</td>
                </tr>
             ) : (
                dummyUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{user.doc}</td>
                    <td className="px-6 py-4 text-slate-400">{user.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${user.role === 'Administrador' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><FiEdit2 size={16} /></button>
                        <button className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><FiTrash2 size={16} /></button>
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
          <div className="text-center py-10 bg-[#0B1020]/40 rounded-2xl border border-white/5 text-slate-500 text-sm">No hay usuarios registrados aún.</div>
        ) : (
          dummyUsers.map((user) => (
            <div key={user.id} className="bg-[#0B1020]/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{user.role} • {user.doc}</p>
                </div>
              </div>
              <button className="p-2 text-slate-500 hover:text-white transition-colors active:bg-white/5 rounded-lg">
                <FiMoreVertical size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE REGISTRO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-[#0B1020] border-t md:border border-white/10 w-full max-w-lg rounded-t-3xl md:rounded-2xl p-6 md:p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] md:animate-none">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 md:hidden" />
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white font-sora">Nuevo Usuario</h2>
            
            <form className="space-y-5">
              <div className="flex justify-center mb-2">
                 <div className="h-24 w-24 rounded-full bg-[#05050A] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all group">
                   <FiCamera size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-medium uppercase tracking-wider">Subir Foto</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Nombre Completo" placeholder="Ej: Juan Pérez" />
                <InputGroup label="Cédula (CC)" placeholder="12345678" type="number" />
              </div>
              
              <InputGroup label="Dirección" placeholder="Calle 123 # 45-67" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Teléfono" placeholder="300 123 4567" type="tel" />
                <div className="space-y-1.5">
                  <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">Rol</label>
                  <select className="w-full bg-[#05050A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none [&>option]:bg-[#0B1020]">
                    <option>Cobrador</option>
                    <option>Administrador</option>
                    <option>Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 md:py-2.5 rounded-xl md:rounded-lg border border-white/10 text-slate-300 font-medium hover:bg-white/5 transition-colors">Cancelar</button>
                <button type="button" className="flex-1 py-3 md:py-2.5 rounded-xl md:rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InputGroup({ label, type = "text", placeholder }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full bg-[#05050A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" />
    </div>
  );
}