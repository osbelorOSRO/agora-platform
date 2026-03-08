// src/modules/accesos/pages/Usuarios.tsx
import { useEffect, useState } from "react";
import { obtenerUsuarios, actualizarUsuario } from "../services/usuarioService";
import { preregistrarUsuario } from "../services/authService";
import { obtenerRoles } from "../services/rolService";
import type { Usuario } from "../types/usuario";
import type { Rol } from "../types/rol";
import { Pencil, Save, Trash2, CirclePlus } from "lucide-react";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Usuario>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [usuariosData, rolesData] = await Promise.all([
        obtenerUsuarios(),
        obtenerRoles(),
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
    };
    fetchData();
  }, []);

  const handleEdit = (usuario: Usuario) => {
    setEditandoId(usuario.id);
    setForm(usuario);
  };

  const handleCancel = () => {
    setEditandoId(null);
    setForm({});
  };

  const handleChange = (campo: keyof Usuario, valor: any) => {
    setForm({ ...form, [campo]: valor });
  };

  const handleGuardar = async () => {
    if (!form.username || !form.rol?.id) return;

    if (editandoId === 0) {
      await preregistrarUsuario(form.username, form.rol.id);
    } else if (typeof editandoId === "number") {
      await actualizarUsuario(editandoId, {
        nombre: form.nombre,
        apellido: form.apellido,
        run: form.run,
        telefono: form.telefono,
        email: form.email,
        rol: form.rol,
        oficina: form.oficina,
      });
    }

    const actualizados = await obtenerUsuarios();
    setUsuarios(actualizados);
    setEditandoId(null);
    setForm({});
  };

  const handleAgregar = () => {
    const nuevo: Usuario = {
      id: 0,
      username: "",
      nombre: "",
      apellido: "",
      run: "",
      telefono: "",
      email: "",
      creado_en: "",
      actualizado_en: "",
      creado_por_username: "",
      actualizado_por_username: "",
      rol: null,
      oficina: null,
    };
    setUsuarios([...usuarios, nuevo]);
    setEditandoId(0);
    setForm(nuevo);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white font-[Montserrat] mb-4">
          Usuarios
        </h2>
        <button onClick={handleAgregar} className="w-5 h-5 text-white">
          <CirclePlus size={28} />
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-custom">
        <table className="w-full text-sm text-left text-white font-[Montserrat]">
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
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-white/10">
                <td className="p-2">{usuario.id || "—"}</td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input
                      className="bg-transparent border border-white/20 px-1"
                      value={form.username || ""}
                      onChange={(e) => handleChange("username", e.target.value)}
                      disabled={usuario.id !== 0}
                    />
                  ) : (
                    usuario.username
                  )}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input
                      value={form.nombre || ""}
                      onChange={(e) => handleChange("nombre", e.target.value)}
                      className="bg-transparent border border-white/20 px-1"
                    />
                  ) : (
                    usuario.nombre
                  )}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input
                      value={form.apellido || ""}
                      onChange={(e) => handleChange("apellido", e.target.value)}
                      className="bg-transparent border border-white/20 px-1"
                    />
                  ) : (
                    usuario.apellido
                  )}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input
                      value={form.run || ""}
                      onChange={(e) => handleChange("run", e.target.value)}
                      className="bg-transparent border border-white/20 px-1"
                    />
                  ) : (
                    usuario.run
                  )}
                </td>

                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input
                      value={form.telefono || ""}
                      onChange={(e) => handleChange("telefono", e.target.value)}
                      className="bg-transparent border border-white/20 px-1"
                    />
                  ) : (
                    usuario.telefono
                  )}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <input
                      value={form.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="bg-transparent border border-white/20 px-1"
                    />
                  ) : (
                    usuario.email
                  )}
                </td>
                <td className="p-2">
                  {editandoId === usuario.id ? (
                    <select
                      value={form.rol?.id || ""}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        const rol = roles.find((r) => r.id === id) || null;
                        handleChange("rol", rol);
                      }}
                      className="bg-transparent border border-white/20 px-1"
                    >
                      <option value="">Seleccionar</option>
                      {roles.map((rol) => (
                        <option key={rol.id} value={rol.id}>
                          {rol.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    usuario.rol?.nombre
                  )}
                </td>
                <td className="p-2">{usuario.creado_por_username || "—"}</td>
                <td className="p-2 flex gap-2">
                  {editandoId === usuario.id ? (
                    <>
                      <button onClick={handleGuardar} className="w-5 h-5 text-white">
                        <Save size={18} />
                      </button>
                      <button onClick={handleCancel} className="w-5 h-5 text-white">
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleEdit(usuario)} className="w-5 h-5 text-white">
                      <Pencil size={18} />
                    </button>
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
