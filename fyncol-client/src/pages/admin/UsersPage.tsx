// src/pages/admin/UsersPage.tsx
import { useState, useRef, useEffect } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCamera,
  FiUser,
  FiCreditCard,
  FiMapPin,
  FiPhone,
  FiShield,
  FiChevronDown,
  FiCheck,
  FiX,
  FiMail,
  FiAlertTriangle,
  FiToggleLeft,
  FiToggleRight,
  FiSlash,
} from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<number | string | null>(null);

  // === ESTADOS PARA CRUD ===
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [selectedRole, setSelectedRole] = useState("COBRADOR");
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    address: "",
    phone: "",
  });

  const roles = [
    { label: "Cobrador", value: "COBRADOR" },
    { label: "Administrador", value: "ADMIN" },
    { label: "Supervisor", value: "SUPERVISOR" },
  ];

  // === ALERTA PREMIUM ===
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

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const getTokenOrFail = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      openAlert({
        variant: "danger",
        title: "Sesión no válida",
        message: "No se encontró token. Inicia sesión nuevamente.",
        confirmText: "OK",
        cancelText: "",
        onConfirm: () => closeAlert(),
      });
      return null;
    }
    return token;
  };

  // 1. READ
  const fetchUsers = async () => {
    try {
      const token = getTokenOrFail();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success) setUsers(data.users);
      else {
        openAlert({
          variant: "danger",
          title: "No se pudo cargar",
          message: data.message || "Error trayendo usuarios.",
          confirmText: "Entendido",
          cancelText: "",
          onConfirm: () => closeAlert(),
        });
      }
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      openAlert({
        variant: "danger",
        title: "No se pudo cargar",
        message: "Hubo un problema trayendo los usuarios. Revisa conexión o token.",
        confirmText: "Entendido",
        cancelText: "",
        onConfirm: () => closeAlert(),
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. CREATE / UPDATE
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = getTokenOrFail();
      if (!token) return;

      const isEditing = editingId !== null;
      const url = isEditing ? `${API_URL}/api/users/${editingId}` : `${API_URL}/api/users`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, role: selectedRole }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        closeModal();
        fetchUsers();
        openAlert({
          variant: "success",
          title: isEditing ? "Usuario actualizado" : "Usuario creado",
          message: "Los cambios se guardaron correctamente.",
          confirmText: "Listo",
          cancelText: "",
          onConfirm: () => closeAlert(),
        });
      } else {
        openAlert({
          variant: "danger",
          title: "No se pudo guardar",
          message: data.message || `Error del servidor (${res.status})`,
          confirmText: "Entendido",
          cancelText: "",
          onConfirm: () => closeAlert(),
        });
      }
    } catch (error) {
      openAlert({
        variant: "danger",
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor.",
        confirmText: "Entendido",
        cancelText: "",
        onConfirm: () => closeAlert(),
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. ACTIVAR / DESACTIVAR
  const handleToggleActive = async (id: number | string, name: string, nextState: boolean) => {
    const actionLabel = nextState ? "activar" : "desactivar";

    openAlert({
      variant: "info",
      title: `${nextState ? "Activar" : "Desactivar"} usuario`,
      message: `¿Seguro que deseas ${actionLabel} a "${name}"?`,
      confirmText: nextState ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        closeAlert();
        const token = getTokenOrFail();
        if (!token) return;

        setBusyId(id);
        try {
          const res = await fetch(`${API_URL}/api/users/${id}/active`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isActive: nextState }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data?.success) {
            fetchUsers();
            openAlert({
              variant: "success",
              title: nextState ? "Usuario activado" : "Usuario desactivado",
              message: "El estado se actualizó correctamente.",
              confirmText: "Listo",
              cancelText: "",
              onConfirm: () => closeAlert(),
            });
          } else {
            openAlert({
              variant: "danger",
              title: "No se pudo actualizar",
              message: data?.message || `Error del servidor (${res.status})`,
              confirmText: "Entendido",
              cancelText: "",
              onConfirm: () => closeAlert(),
            });
          }
        } catch (e) {
          openAlert({
            variant: "danger",
            title: "Error",
            message: "No se pudo actualizar el estado del usuario.",
            confirmText: "Entendido",
            cancelText: "",
            onConfirm: () => closeAlert(),
          });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  // 4. BORRAR REAL (Hard Delete)
  const handleHardDelete = async (id: number | string, name: string) => {
    openAlert({
      variant: "danger",
      title: "Eliminar definitivamente",
      message: `Esto eliminará a "${name}" de forma PERMANENTE. ¿Deseas continuar?`,
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        closeAlert();
        const token = getTokenOrFail();
        if (!token) return;

        setBusyId(id);
        try {
          const res = await fetch(`${API_URL}/api/users/${id}/hard`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data?.success) {
            fetchUsers();
            openAlert({
              variant: "success",
              title: "Usuario eliminado",
              message: "Se eliminó definitivamente.",
              confirmText: "Listo",
              cancelText: "",
              onConfirm: () => closeAlert(),
            });
          } else {
            openAlert({
              variant: "danger",
              title: "No se pudo eliminar",
              message:
                data?.message ||
                `Error del servidor (${res.status}). Asegura que exista DELETE /api/users/:id/hard.`,
              confirmText: "Entendido",
              cancelText: "",
              onConfirm: () => closeAlert(),
            });
          }
        } catch (e) {
          openAlert({
            variant: "danger",
            title: "Error",
            message: "No se pudo eliminar definitivamente.",
            confirmText: "Entendido",
            cancelText: "",
            onConfirm: () => closeAlert(),
          });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  // === AUXILIARES DE UI ===
  const openEditModal = (user: any) => {
    setEditingId(user.id);
    setFormData({
      name: user.name || "",
      document: user.document || "",
      email: user.email || "",
      address: user.address || "",
      phone: user.phone || "",
    });
    setSelectedRole(user.role || "COBRADOR");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: "", document: "", email: "", address: "", phone: "" });
    setSelectedRole("COBRADOR");
  };

  // Bloquea scroll del body cuando hay modal/alert
  useEffect(() => {
    document.body.style.overflow = showModal || alertState.open ? "hidden" : "unset";
  }, [showModal, alertState.open]);

  return (
    <div
      className="
        max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10 font-inter
        h-[calc(100dvh-90px)] overflow-y-auto
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
      "
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-sora tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-400 mt-1">Administra los accesos y roles del equipo.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="group relative overflow-hidden bg-blue-600 px-4 md:px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          <FiPlus size={20} />
          <span className="hidden md:inline">Crear Usuario</span>
        </button>
      </div>

      {/* VISTA ESCRITORIO */}
      <div className="hidden md:block border border-white/5 rounded-3xl overflow-hidden bg-[#0B1020]/40 backdrop-blur-sm shadow-2xl">
        <div
          className="
            max-h-[calc(100dvh-240px)] overflow-auto
            [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
          "
        >
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-400 uppercase text-xs font-semibold tracking-wider sticky top-0">
              <tr>
                <th className="px-6 py-5">Usuario</th>
                <th className="px-6 py-5">Documento</th>
                <th className="px-6 py-5">Rol</th>
                <th className="px-6 py-5 text-center">Estado</th>
                <th className="px-6 py-5 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {users.map((user) => {
                const isBusy = busyId === user.id;
                const active = !!user.isActive;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-white/[0.02] transition-colors group ${!active ? "opacity-60" : ""}`}
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/10 overflow-hidden">
                        {user.imageUrl ? (
                          <img src={user.imageUrl} className="rounded-full h-full w-full object-cover" />
                        ) : (
                          user.name?.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{user.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-400">{user.document}</td>

                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${
                          active
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-300 border-white/10"
                        }`}
                      >
                        {active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {/* Editar */}
                        <button
                          disabled={isBusy}
                          onClick={() => openEditModal(user)}
                          className="p-2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-40"
                          aria-label="Editar"
                          title="Editar"
                        >
                          <FiEdit2 size={16} />
                        </button>

                        {/* Activar / Desactivar (solo uno a la vez) */}
                        {active ? (
                          <button
                            disabled={isBusy}
                            onClick={() => handleToggleActive(user.id, user.name, false)}
                            className="p-2 text-slate-400 hover:text-amber-300 transition-colors disabled:opacity-40"
                            aria-label="Desactivar"
                            title="Desactivar"
                          >
                            <FiToggleLeft size={16} />
                          </button>
                        ) : (
                          <button
                            disabled={isBusy}
                            onClick={() => handleToggleActive(user.id, user.name, true)}
                            className="p-2 text-slate-400 hover:text-emerald-300 transition-colors disabled:opacity-40"
                            aria-label="Activar"
                            title="Activar"
                          >
                            <FiToggleRight size={16} />
                          </button>
                        )}

                        {/* Soft delete (desactivar) rápido si quieres mantener la semántica "basura" */}
                        <button
                          disabled={isBusy || !active}
                          onClick={() => handleToggleActive(user.id, user.name, false)}
                          className="p-2 text-slate-400 hover:text-red-300 transition-colors disabled:opacity-30"
                          aria-label="Desactivar (rápido)"
                          title="Desactivar (rápido)"
                        >
                          <FiSlash size={16} />
                        </button>

                        {/* Borrar real */}
                        <button
                          disabled={isBusy}
                          onClick={() => handleHardDelete(user.id, user.name)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40"
                          aria-label="Eliminar definitivamente"
                          title="Eliminar definitivamente"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>
                    No hay usuarios aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex md:items-center justify-center bg-[#020408]/90 backdrop-blur-md">
          <div className="relative w-full h-[100dvh] md:h-auto md:max-w-[520px] bg-[#05050A] md:bg-[#05050A]/80 md:backdrop-blur-3xl md:border border-white/10 rounded-none md:rounded-[36px] flex flex-col overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-start px-6 md:px-10 pt-8 md:pt-10 pb-4 shrink-0 border-b border-white/[0.05]">
              <h2 className="text-2xl font-bold text-white font-sora">
                {editingId ? "Editar Usuario" : "Nuevo Usuario"}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-500 hover:text-white">
                <FiX size={24} />
              </button>
            </div>

            <div className="flex-1 px-6 md:px-10 py-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="userForm" onSubmit={handleSaveUser} className="space-y-6">
                <div className="flex justify-center mb-4">
                  <div className="h-28 w-28 rounded-full bg-[#0B1020]/80 border border-white/10 flex flex-col items-center justify-center text-slate-400 shadow-inner">
                    <FiCamera size={28} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase opacity-80">Foto</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Nombre Completo"
                    placeholder="Juan Pérez"
                    icon={FiUser}
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <InputGroup
                    label="Cédula (CC)"
                    placeholder="123456"
                    type="number"
                    icon={FiCreditCard}
                    value={formData.document}
                    onChange={(e: any) => setFormData({ ...formData, document: e.target.value })}
                    required
                  />
                </div>

                <InputGroup
                  label="Correo Electrónico"
                  placeholder="correo@empresa.com"
                  type="email"
                  icon={FiMail}
                  value={formData.email}
                  onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <InputGroup
                  label="Dirección"
                  placeholder="Calle 123"
                  icon={FiMapPin}
                  value={formData.address}
                  onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Teléfono"
                    placeholder="300..."
                    type="tel"
                    icon={FiPhone}
                    value={formData.phone}
                    onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <CustomSelect label="Rol de Acceso" icon={FiShield} options={roles} value={selectedRole} onChange={setSelectedRole} />
                </div>
              </form>
            </div>

            <div className="px-6 md:px-10 pt-5 pb-8 border-t border-white/[0.05] bg-[#020408]/50 flex gap-4 backdrop-blur-xl">
              <button
                type="button"
                onClick={closeModal}
                className="w-1/3 py-3.5 rounded-2xl border border-white/5 text-slate-400 font-medium"
              >
                Cancelar
              </button>
              <button
                form="userForm"
                type="submit"
                disabled={loading}
                className="w-2/3 py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50"
              >
                {loading ? "Procesando..." : editingId ? "Actualizar" : "Guardar Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA PREMIUM DARK */}
      {alertState.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-[520px] rounded-3xl border border-white/10 bg-[#05050A]/90 shadow-2xl overflow-hidden animate-[slideUp_0.18s_ease-out]">
            <div className="p-6 md:p-7 flex items-start gap-4">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center border ${
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
                <h3 className="text-white font-sora font-bold text-lg">{alertState.title}</h3>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">{alertState.message}</p>
              </div>

              <button onClick={closeAlert} className="text-slate-500 hover:text-white p-2 -m-2">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-6 md:px-7 pb-6 flex gap-3 justify-end">
              {alertState.cancelText ? (
                <button
                  onClick={closeAlert}
                  className="px-4 py-2.5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  {alertState.cancelText}
                </button>
              ) : null}

              <button
                onClick={() => alertState.onConfirm?.()}
                className={`px-4 py-2.5 rounded-2xl font-semibold transition-all active:scale-[0.98] ${
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

// Helpers
function InputGroup({ label, type = "text", placeholder, icon: Icon, value, onChange, required }: any) {
  return (
    <div className="space-y-2 relative group">
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
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
      <label className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
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
