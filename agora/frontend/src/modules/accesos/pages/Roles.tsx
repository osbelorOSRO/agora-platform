// src/modules/accesos/pages/Roles.tsx
import { useEffect, useState } from "react";
import { CirclePlus, Save, Trash2, Pencil } from "lucide-react";
import style from "../styles/style";
import { obtenerRoles, crearRol, actualizarRol } from "../services/rolService";
import { obtenerPermisos } from "../services/permisoService";

import type { Rol } from "../types/rol";
import type { Permiso } from "../types/permiso";

type DatosRolEditado = { nombre: string; permisos: number[] };

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

  const manejarCambio = (
    id: number,
    campo: keyof DatosRolEditado,
    valor: any
  ) => {
    const actual = editados[id] || {
      nombre: roles.find((r) => r.id === id)?.nombre || "",
      permisos: roles.find((r) => r.id === id)?.permisos || [],
    };
    setEditados((prev) => ({
      ...prev,
      [id]: { ...actual, [campo]: valor },
    }));
  };

  const togglePermiso = (id: number, permisoId: number) => {
    const permisosActuales =
      editados[id]?.permisos ?? roles.find((r) => r.id === id)?.permisos ?? [];
    const nuevos = permisosActuales.includes(permisoId)
      ? permisosActuales.filter((p) => p !== permisoId)
      : [...permisosActuales, permisoId];
    manejarCambio(id, "permisos", nuevos);
  };

  const guardar = async (id: number) => {
    const datos = editados[id];
    if (!datos) return;

    try {
      if (id < 0) {
        await crearRol(datos);
        const rolesActualizados = await obtenerRoles();
        setRoles(rolesActualizados);
      } else {
        const actualizado = await actualizarRol(id, datos);
        setRoles((prev) => prev.map((r) => (r.id === id ? actualizado : r)));
      }
      setEditados((prev) => {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      });
      setFilaEditandoId(null);
    } catch (err) {
      console.error("Error al guardar rol:", err);
    }
  };

  const agregar = () => {
    const id = tempId;
    const nuevo: Rol = {
      id,
      nombre: "",
      permisos: [],
      creado_en: "",
      actualizado_en: "",
      creado_por_username: null,
      actualizado_por_username: null,
    };
    setRoles((prev) => [nuevo, ...prev]);
    setEditados((prev) => ({
      ...prev,
      [id]: { nombre: "", permisos: [] },
    }));
    setFilaEditandoId(id);
    setTempId(id - 1);
  };

  const cancelarNuevo = (id: number) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setEditados((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
    setFilaEditandoId(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="mb-4 text-2xl font-bold text-white">Roles</h2>
        <button onClick={agregar}>
          <CirclePlus className="w-5 h-5 text-white" />
        </button>
      </div>

      <table className={style.table}>
        <thead>
          <tr>
            <th className={style.tableHeader}>ID</th>
            <th className={style.tableHeader}>Nombre</th>
            <th className={style.tableHeader}>Permisos</th>
            <th className={style.tableHeader}>Creado por</th>
            <th className={style.tableHeader}>Actualizado por</th>
            <th className={style.tableHeader}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((rol) => {
            const editando = filaEditandoId === rol.id;
            const permisosActuales =
              editados[rol.id]?.permisos ?? rol.permisos;
            const nombreActual = editados[rol.id]?.nombre ?? rol.nombre;

            return (
              <tr key={rol.id} className={style.filaTabla}>
                <td className={style.celdaTabla}>{rol.id > 0 ? rol.id : "—"}</td>
                <td className={style.celdaTabla}>
                  {editando ? (
                    <input
                      className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
                      value={nombreActual}
                      onChange={(e) =>
                        manejarCambio(rol.id, "nombre", e.target.value)
                      }
                    />
                  ) : (
                    rol.nombre
                  )}
                </td>
                <td className={style.celdaTabla}>
                  {editando ? (
                    <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                      {permisos.map((p) => (
                        <label key={p.id} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className={style.checkboxPermiso}
                            checked={permisosActuales.includes(p.id)}
                            onChange={() => togglePermiso(rol.id, p.id)}
                          />
                          <span className="text-sm text-white">{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    permisos
                      .filter((p) => rol.permisos.includes(p.id))
                      .map((p) => p.nombre)
                      .join(", ")
                  )}
                </td>
                <td className={style.celdaTabla}>
                  {rol.creado_por_username ?? "—"}
                </td>
                <td className={style.celdaTabla}>
                  {rol.actualizado_por_username ?? "—"}
                </td>
                <td className={style.accionesCell}>
                  <div>
                    {editando ? (
                      <>
                        <button onClick={() => guardar(rol.id)} title="Guardar">
                          <Save className="w-5 h-5 text-white" />
                        </button>
                        {rol.id < 0 && (
                          <button
                            onClick={() => cancelarNuevo(rol.id)}
                            title="Cancelar"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => setFilaEditandoId(rol.id)} title="Editar">
                        <Pencil className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
