import { useEffect, useState } from "react";
import { CirclePlus, Save, Trash2, Pencil } from "lucide-react";
import { obtenerRoles, crearRol, actualizarRol } from "../services/rolService";
import { obtenerPermisos } from "../services/permisoService";
import type { Rol } from "../types/rol";
import type { Permiso } from "../types/permiso";

type DatosRolEditado = { nombre: string; permisos: number[] };

const INPUT_CLS = "w-full bg-transparent border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";

export default function Roles() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [editados, setEditados] = useState<Record<number, DatosRolEditado>>({});
  const [filaEditandoId, setFilaEditandoId] = useState<number | null>(null);
  const [tempId, setTempId] = useState(-1);

  useEffect(() => {
    const cargar = async () => {
      const [r, p] = await Promise.all([obtenerRoles(), obtenerPermisos()]);
      setRoles(r);
      setPermisos(p);
    };
    cargar();
  }, []);

  const manejarCambio = (id: number, campo: keyof DatosRolEditado, valor: any) => {
    const actual = editados[id] || {
      nombre: roles.find((r) => r.id === id)?.nombre || "",
      permisos: roles.find((r) => r.id === id)?.permisos || [],
    };
    setEditados((prev) => ({ ...prev, [id]: { ...actual, [campo]: valor } }));
  };

  const togglePermiso = (id: number, permisoId: number) => {
    const actuales = editados[id]?.permisos ?? roles.find((r) => r.id === id)?.permisos ?? [];
    const nuevos = actuales.includes(permisoId)
      ? actuales.filter((p) => p !== permisoId)
      : [...actuales, permisoId];
    manejarCambio(id, "permisos", nuevos);
  };

  const guardar = async (id: number) => {
    const datos = editados[id];
    if (!datos) return;
    try {
      if (id < 0) {
        await crearRol(datos);
        setRoles(await obtenerRoles());
      } else {
        const actualizado = await actualizarRol(id, datos);
        setRoles((prev) => prev.map((r) => (r.id === id ? actualizado : r)));
      }
      setEditados((prev) => { const c = { ...prev }; delete c[id]; return c; });
      setFilaEditandoId(null);
    } catch (err) {
      console.error("Error al guardar rol:", err);
    }
  };

  const agregar = () => {
    const id = tempId;
    const nuevo: Rol = { id, nombre: "", permisos: [], creado_en: "", actualizado_en: "", creado_por_username: null, actualizado_por_username: null };
    setRoles((prev) => [nuevo, ...prev]);
    setEditados((prev) => ({ ...prev, [id]: { nombre: "", permisos: [] } }));
    setFilaEditandoId(id);
    setTempId(id - 1);
  };

  const cancelarNuevo = (id: number) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setEditados((prev) => { const c = { ...prev }; delete c[id]; return c; });
    setFilaEditandoId(null);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Roles</h1>
          <p className="mt-2 text-sm text-[#999999]">Permisos agrupados por rol. Cada usuario hereda los permisos del rol asignado.</p>
        </div>
        <button
          type="button"
          onClick={agregar}
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
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Permisos</th>
              <th className="px-4 py-3">Creado por</th>
              <th className="px-4 py-3">Actualizado por</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B1B1B]">
            {roles.map((rol) => {
              const editando = filaEditandoId === rol.id;
              const permisosActuales = editados[rol.id]?.permisos ?? rol.permisos;
              const nombreActual = editados[rol.id]?.nombre ?? rol.nombre;

              return (
                <tr key={rol.id} className="transition hover:bg-[#141414]">
                  <td className="px-4 py-3 text-[#999999]">{rol.id > 0 ? rol.id : "—"}</td>

                  <td className="px-4 py-3">
                    {editando ? (
                      <input className={INPUT_CLS} value={nombreActual} onChange={(e) => manejarCambio(rol.id, "nombre", e.target.value)} />
                    ) : (
                      <span className="font-medium text-white">{rol.nombre}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editando ? (
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1 scrollbar-custom">
                        {permisos.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-primary w-4 h-4 shrink-0"
                              checked={permisosActuales.includes(p.id)}
                              onChange={() => togglePermiso(rol.id, p.id)}
                            />
                            <span className="text-sm text-[#CCCCCC]">{p.nombre}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {permisos.filter((p) => rol.permisos.includes(p.id)).map((p) => (
                          <span key={p.id} className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#999999]">
                            {p.nombre}
                          </span>
                        ))}
                        {rol.permisos.length === 0 && <span className="text-xs text-[#4D4D4D]">Sin permisos</span>}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-[#999999]">{rol.creado_por_username ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#999999]">{rol.actualizado_por_username ?? "—"}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editando ? (
                        <>
                          <button type="button" onClick={() => guardar(rol.id)} title="Guardar" className="text-emerald-400 hover:text-emerald-300 transition"><Save size={16} /></button>
                          {rol.id < 0 && (
                            <button type="button" onClick={() => cancelarNuevo(rol.id)} title="Cancelar" className="text-[#666666] hover:text-[#B3B3B3] transition"><Trash2 size={16} /></button>
                          )}
                        </>
                      ) : (
                        <button type="button" onClick={() => setFilaEditandoId(rol.id)} title="Editar" className="text-[#808080] hover:text-white transition"><Pencil size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#4D4D4D]">Total: {roles.length} rol{roles.length !== 1 ? "es" : ""}</p>
    </section>
  );
}
