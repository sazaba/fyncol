import { useState } from "react";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          + Crear Usuario
        </button>
      </div>

      {/* Tabla Placeholder */}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-[#05050A]">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-white/5 text-slate-200 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
             <tr>
               <td className="px-6 py-4 text-center text-slate-600" colSpan={5}>
                 No hay usuarios registrados aún.
               </td>
             </tr>
          </tbody>
        </table>
      </div>

      {/* Modal de Registro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B1020] border border-white/10 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-white">Nuevo Usuario</h2>
            
            <form className="space-y-4">
              {/* Foto */}
              <div className="flex justify-center mb-4">
                 <div className="h-20 w-20 rounded-full bg-white/5 border-2 border-dashed border-slate-600 flex items-center justify-center text-xs text-slate-400 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-colors">
                   Subir Foto
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Nombre Completo" placeholder="Ej: Juan Pérez" />
                <InputGroup label="Cédula (CC)" placeholder="12345678" type="number" />
              </div>
              
              <InputGroup label="Dirección" placeholder="Calle 123 # 45-67" />
              
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Teléfono" placeholder="300 123 4567" type="tel" />
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Rol</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none [&>option]:bg-[#0B1020]">
                    <option>Cobrador</option>
                    <option>Administrador</option>
                    <option>Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5">Cancelar</button>
                <button type="button" className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper pequeño para inputs
function InputGroup({ label, type = "text", placeholder }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  );
}