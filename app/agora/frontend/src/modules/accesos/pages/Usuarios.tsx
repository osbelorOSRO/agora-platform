import { useEffect, useState } from "react";
import { obtenerUsuarios, actualizarUsuario, adminResetPassword, adminReset2FA, desbloquearUsuario, regenerarInvitacion, cancelarPreregistro } from "../services/usuarioService";
import { preregistrarUsuario } from "../services/authService";
import { obtenerRoles } from "../services/rolService";
import type { Usuario, EstadoUsuario } from "../types/usuario";
import type { Rol } from "../types/rol";
import { Pencil, Save, Trash2, CirclePlus, KeyRound, Smartphone, Unlock, UserX, RefreshCw, Copy, Check } from "lucide-react";

const ESTADO_CONFIG: Record<EstadoUsuario, { label: string; color: string }> = {
  activo:               { label: "Activo",              color: "text-emerald-400" },
  preregistrado:        { label: "Pendiente registro",  color: "text-yellow-400"  },
  invitacion_expirada:  { label: "Invitación expirada", color: "text-orange-400"  },
  sin_invitacion:       { label: "Sin invitación",      color: "text-[#666666]"   },
  bloqueado:            { label: "Bloqueado",           color: "text-red-400"     },
  reset_contraseña:     { label: "Reset contraseña",   color: "text-blue-400"    },
  reset_2fa:            { label: "Reset 2FA",           color: "text-purple-400"  },
};

const INPUT_CLS = "w-full min-w-[80px] bg-transparent border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";
const SELECT_CLS = "bg-background border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";

interface ModalToken { titulo: string; token: string; expira: string; }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Usuario>>({});
  const [modal, setModal] = useState<ModalToken | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const [u, r] = await Promise.all([obtenerUsuarios(), obtenerRoles()]);
    setUsuarios(u);
    setRoles(r);
  };

  const handleEdit   = (u: Usuario) => { setEditandoId(u.id); setForm(u); };
  const handleCancel = () => { setEditandoId(null); setForm({}); };
  const handleChange = (campo: keyof Usuario, valor: Usuario[keyof Usuario]) => setForm({ ...form, [campo]: valor });

  const handleGuardar = async () => {
    if (!form.username || !form.rol?.id) return;
    if (editandoId === 0) {
      const res = await preregistrarUsuario(form.username, form.rol.id);
      setModal({ titulo: "Código de invitación", token: res.invitationToken, expira: new Date(res.expiresAt).toLocaleString() });
    } else if (typeof editandoId === "number") {
      await actualizarUsuario(editandoId, { nombre: form.nombre, apellido: form.apellido, run: form.run, telefono: form.telefono, email: form.email, rol: form.rol });
    }
    await cargar();
    setEditandoId(null);
    setForm({});
  };

  const handleAgregar = () => {
    const nuevo: Usuario = { id: 0, username: "", nombre: "", apellido: "", run: "", telefono: "", email: "", creado_en: "", actualizado_en: "", creado_por_username: "", actualizado_por_username: "", rol: null, estado: "sin_invitacion" };
    setUsuarios([...usuarios, nuevo]);
    setEditandoId(0);
    setForm(nuevo);
  };

  const accionResetPassword       = async (id: number) => { const res = await adminResetPassword(id);       setModal({ titulo: "Código de reset de contraseña", token: res.resetToken,      expira: new Date(res.expiresAt).toLocaleString() }); };
  const accionReset2FA            = async (id: number) => { const res = await adminReset2FA(id);            setModal({ titulo: "Código de reset 2FA",           token: res.bypassToken,     expira: new Date(res.expiresAt).toLocaleString() }); };
  const accionDesbloquear         = async (id: number) => { await desbloquearUsuario(id); await cargar(); };
  const accionRegenerarInvitacion = async (id: number) => { const res = await regenerarInvitacion(id);      setModal({ titulo: "Nuevo código de invitación",    token: res.invitationToken, expira: new Date(res.expiresAt).toLocaleString() }); await cargar(); };
  const accionCancelarPreregistro = async (id: number) => { if (!confirm("¿Cancelar el preregistro de este usuario?")) return; await cancelarPreregistro(id); await cargar(); };

  const copiarToken = () => {
    if (!modal) return;
    navigator.clipboard.writeText(modal.token);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const estaPreregistrado = (u: Usuario) => ["preregistrado", "invitacion_expirada", "sin_invitacion"].includes(u.estado);

  return (
    <section className="space-y-6">
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]">
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
              <button onClick={() => { setModal(null); setCopiado(false); }} className="rounded-xl border border-border bg-input px-4 py-1.5 text-sm font-bold text-foreground hover:border-[#6E3709] hover:text-primary transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Usuarios</h1>
          <p className="mt-2 text-sm text-[#999999]">Gestión de cuentas, roles y acceso al panel.</p>
        </div>
        <button
          type="button"
          onClick={handleAgregar}
          className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white"
        >
          <CirclePlus size={15} />
          Agregar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Apellido</th>
              <th className="px-4 py-3">RUN</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Creado por</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B1B1B]">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="transition hover:bg-[#141414]">
                <td className="px-4 py-3 text-[#999999]">{usuario.id || "—"}</td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id
                    ? <input className={INPUT_CLS} value={form.username || ""} onChange={(e) => handleChange("username", e.target.value)} disabled={usuario.id !== 0} />
                    : <span className="font-medium text-white">{usuario.username}</span>}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id
                    ? <input className={INPUT_CLS} value={form.nombre || ""} onChange={(e) => handleChange("nombre", e.target.value)} />
                    : <span className="text-[#CCCCCC]">{usuario.nombre}</span>}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id
                    ? <input className={INPUT_CLS} value={form.apellido || ""} onChange={(e) => handleChange("apellido", e.target.value)} />
                    : <span className="text-[#CCCCCC]">{usuario.apellido}</span>}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id
                    ? <input className={INPUT_CLS} value={form.run || ""} onChange={(e) => handleChange("run", e.target.value)} />
                    : <span className="font-mono text-xs text-[#B3B3B3]">{usuario.run}</span>}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id
                    ? <input className={INPUT_CLS} value={form.telefono || ""} onChange={(e) => handleChange("telefono", e.target.value)} />
                    : <span className="text-[#B3B3B3]">{usuario.telefono}</span>}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id
                    ? <input className={INPUT_CLS} value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
                    : <span className="text-[#B3B3B3]">{usuario.email}</span>}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id ? (
                    <select className={SELECT_CLS} value={form.rol?.id || ""} onChange={(e) => { const id = parseInt(e.target.value); const rol = roles.find((r) => r.id === id) || null; handleChange("rol", rol); }}>
                      <option value="">Seleccionar</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  ) : (
                    <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#B3B3B3]">
                      {usuario.rol?.nombre ?? "—"}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-xs text-[#999999]">{usuario.creado_por_username || "—"}</td>

                <td className="px-4 py-3">
                  {usuario.estado ? (
                    <span className={`text-xs font-semibold ${ESTADO_CONFIG[usuario.estado]?.color ?? "text-[#666666]"}`}>
                      {ESTADO_CONFIG[usuario.estado]?.label ?? usuario.estado}
                    </span>
                  ) : "—"}
                </td>

                <td className="px-4 py-3">
                  {editandoId === usuario.id ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleGuardar} title="Guardar" className="text-emerald-400 hover:text-emerald-300 transition"><Save size={16} /></button>
                      <button type="button" onClick={handleCancel}  title="Cancelar" className="text-[#666666] hover:text-[#B3B3B3] transition"><Trash2 size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleEdit(usuario)} title="Editar" className="text-[#808080] hover:text-white transition"><Pencil size={15} /></button>
                      {estaPreregistrado(usuario) ? (
                        <>
                          <button type="button" onClick={() => accionRegenerarInvitacion(usuario.id)} title="Regenerar invitación" className="text-yellow-400 hover:text-yellow-300 transition"><RefreshCw size={15} /></button>
                          <button type="button" onClick={() => accionCancelarPreregistro(usuario.id)} title="Cancelar preregistro"  className="text-red-400 hover:text-red-300 transition"><UserX size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => accionResetPassword(usuario.id)} title="Resetear contraseña"     className="text-blue-400 hover:text-blue-300 transition"><KeyRound size={15} /></button>
                          <button type="button" onClick={() => accionReset2FA(usuario.id)}      title="Resetear autenticador 2FA" className="text-purple-400 hover:text-purple-300 transition"><Smartphone size={15} /></button>
                          {usuario.estado === "bloqueado" && (
                            <button type="button" onClick={() => accionDesbloquear(usuario.id)} title="Desbloquear cuenta" className="text-emerald-400 hover:text-emerald-300 transition"><Unlock size={15} /></button>
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

      <p className="text-xs text-[#4D4D4D]">Total: {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}</p>
    </section>
  );
}
