import { useEffect, useState } from "react";
import { obtenerUsuarios, actualizarUsuario, adminResetPassword, adminReset2FA, desbloquearUsuario, regenerarInvitacion, cancelarPreregistro } from "../services/usuarioService";
import { preregistrarUsuario } from "../services/authService";
import { obtenerRoles } from "../services/rolService";
import type { Usuario, EstadoUsuario } from "../types/usuario";
import type { Rol } from "../types/rol";
import { Pencil, Save, Trash2, CirclePlus, KeyRound, Smartphone, Unlock, UserX, RefreshCw, Copy, Check } from "lucide-react";

const ESTADO_CONFIG: Record<EstadoUsuario, { label: string; color: string }> = {
  activo: { label: "Activo", color: "text-green-400" },
  preregistrado: { label: "Pendiente registro", color: "text-yellow-400" },
  invitacion_expirada: { label: "Invitación expirada", color: "text-orange-400" },
  sin_invitacion: { label: "Sin invitación", color: "text-gray-400" },
  bloqueado: { label: "Bloqueado", color: "text-red-400" },
  reset_contraseña: { label: "Reset contraseña", color: "text-blue-400" },
  reset_2fa: { label: "Reset 2FA", color: "text-purple-400" },
};

interface ModalToken {
  titulo: string;
  token: string;
  expira: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Usuario>>({});
  const [modal, setModal] = useState<ModalToken | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const [usuariosData, rolesData] = await Promise.all([obtenerUsuarios(), obtenerRoles()]);
    setUsuarios(usuariosData);
    setRoles(rolesData);
  };

  const handleEdit = (usuario: Usuario) => { setEditandoId(usuario.id); setForm(usuario); };
  const handleCancel = () => { setEditandoId(null); setForm({}); };
  const handleChange = (campo: keyof Usuario, valor: any) => setForm({ ...form, [campo]: valor });

  const handleGuardar = async () => {
    if (!form.username || !form.rol?.id) return;
    if (editandoId === 0) {
      const res = await preregistrarUsuario(form.username, form.rol.id);
      setModal({ titulo: "Código de invitación", token: res.invitationToken, expira: new Date(res.expiresAt).toLocaleString() });
    } else if (typeof editandoId === "number") {
      await actualizarUsuario(editandoId, { nombre: form.nombre, apellido: form.apellido, run: form.run, telefono: form.telefono, email: form.email, rol: form.rol, oficina: form.oficina });
    }
    await cargar();
    setEditandoId(null);
    setForm({});
  };

  const handleAgregar = () => {
    const nuevo: Usuario = { id: 0, username: "", nombre: "", apellido: "", run: "", telefono: "", email: "", creado_en: "", actualizado_en: "", creado_por_username: "", actualizado_por_username: "", rol: null, oficina: null, estado: "sin_invitacion" };
    setUsuarios([...usuarios, nuevo]);
    setEditandoId(0);
    setForm(nuevo);
  };

  const accionResetPassword = async (id: number) => {
    const res = await adminResetPassword(id);
    setModal({ titulo: "Código de reset de contraseña", token: res.resetToken, expira: new Date(res.expiresAt).toLocaleString() });
  };

  const accionReset2FA = async (id: number) => {
    const res = await adminReset2FA(id);
    setModal({ titulo: "Código de reset 2FA", token: res.bypassToken, expira: new Date(res.expiresAt).toLocaleString() });
  };

  const accionDesbloquear = async (id: number) => {
    await desbloquearUsuario(id);
    await cargar();
  };

  const accionRegenerarInvitacion = async (id: number) => {
    const res = await regenerarInvitacion(id);
    setModal({ titulo: "Nuevo código de invitación", token: res.invitationToken, expira: new Date(res.expiresAt).toLocaleString() });
    await cargar();
  };

  const accionCancelarPreregistro = async (id: number) => {
    if (!confirm("¿Cancelar el preregistro de este usuario? Esta acción no se puede deshacer.")) return;
    await cancelarPreregistro(id);
    await cargar();
  };

  const copiarToken = () => {
    if (!modal) return;
    navigator.clipboard.writeText(modal.token);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const estaPreregistrado = (u: Usuario) => ['preregistrado', 'invitacion_expirada', 'sin_invitacion'].includes(u.estado);

  return (
    <div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{modal.titulo}</h3>
            <p className="text-xs text-muted-foreground">Comparte este código con el usuario. Expira el {modal.expira}.</p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <span className="font-mono text-lg font-bold tracking-widest text-foreground flex-1">{modal.token}</span>
              <button onClick={copiarToken} className="text-muted-foreground hover:text-primary transition-colors" title="Copiar código">
                {copiado ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-amber-400">Este código se muestra una sola vez. No se puede recuperar después de cerrar esta ventana.</p>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => { setModal(null); setCopiado(false); }}
                className="rounded-xl border border-border bg-input px-4 py-1.5 text-sm font-bold text-foreground hover:border-primary/30 hover:text-primary transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="mb-4 text-2xl font-bold text-white">Usuarios</h2>
        <button onClick={handleAgregar} className="w-5 h-5 text-white"><CirclePlus size={28} /></button>
      </div>

      <div className="overflow-x-auto scrollbar-custom">
        <table className="w-full text-left text-sm text-white font-montserrat">
          <thead>
            <tr className="bg-white/10">
              <th className="p-2">ID</th>
              <th className="p-2">Username</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Apellido</th>
              <th className="p-2">RUN</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Creado Por</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-white/10">
                <td className="p-2">{usuario.id || "—"}</td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input className="bg-transparent border border-white/20 px-1" value={form.username || ""} onChange={(e) => handleChange("username", e.target.value)} disabled={usuario.id !== 0} />
                  ) : usuario.username}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input value={form.nombre || ""} onChange={(e) => handleChange("nombre", e.target.value)} className="bg-transparent border border-white/20 px-1" />
                  ) : usuario.nombre}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input value={form.apellido || ""} onChange={(e) => handleChange("apellido", e.target.value)} className="bg-transparent border border-white/20 px-1" />
                  ) : usuario.apellido}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input value={form.run || ""} onChange={(e) => handleChange("run", e.target.value)} className="bg-transparent border border-white/20 px-1" />
                  ) : usuario.run}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input value={form.telefono || ""} onChange={(e) => handleChange("telefono", e.target.value)} className="bg-transparent border border-white/20 px-1" />
                  ) : usuario.telefono}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)} className="bg-transparent border border-white/20 px-1" />
                  ) : usuario.email}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <select value={form.rol?.id || ""} onChange={(e) => { const id = parseInt(e.target.value); const rol = roles.find((r) => r.id === id) || null; handleChange("rol", rol); }} className="bg-transparent border border-white/20 px-1">
                      <option value="">Seleccionar</option>
                      {roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
                    </select>
                  ) : usuario.rol?.nombre}
                </td>
                <td className="p-2">{usuario.creado_por_username || "—"}</td>
                <td className="p-2">
                  {usuario.estado ? (
                    <span className={`text-xs font-semibold ${ESTADO_CONFIG[usuario.estado]?.color ?? "text-gray-400"}`}>
                      {ESTADO_CONFIG[usuario.estado]?.label ?? usuario.estado}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <div className="flex gap-2">
                      <button onClick={handleGuardar} className="w-5 h-5 text-white" title="Guardar"><Save size={18} /></button>
                      <button onClick={handleCancel} className="w-5 h-5 text-white" title="Cancelar"><Trash2 size={18} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleEdit(usuario)} className="w-5 h-5 text-white" title="Editar"><Pencil size={18} /></button>
                      {estaPreregistrado(usuario) ? (
                        <>
                          <button onClick={() => accionRegenerarInvitacion(usuario.id)} className="w-5 h-5 text-yellow-400" title="Regenerar invitación"><RefreshCw size={18} /></button>
                          <button onClick={() => accionCancelarPreregistro(usuario.id)} className="w-5 h-5 text-red-400" title="Cancelar preregistro"><UserX size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => accionResetPassword(usuario.id)} className="w-5 h-5 text-blue-400" title="Resetear contraseña"><KeyRound size={18} /></button>
                          <button onClick={() => accionReset2FA(usuario.id)} className="w-5 h-5 text-purple-400" title="Resetear autenticador 2FA"><Smartphone size={18} /></button>
                          {usuario.estado === 'bloqueado' && (
                            <button onClick={() => accionDesbloquear(usuario.id)} className="w-5 h-5 text-green-400" title="Desbloquear cuenta"><Unlock size={18} /></button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
