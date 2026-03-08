// src/modules/accesos/pages/Oficinas.tsx
import { useEffect, useState } from "react";
import { CirclePlus, Pencil, Save } from "lucide-react";
import style from "../styles/style";
import { obtenerOficinas, crearOficina, actualizarOficina } from "../services/oficinaService";
import type { Oficina } from "../types/oficina";

export default function Oficinas() {
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [nuevaFilaVisible, setNuevaFilaVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editados, setEditados] = useState<Record<number, Partial<Oficina>>>({});

  useEffect(() => {
    cargarOficinas();
  }, []);

  const cargarOficinas = async () => {
    try {
      const data = await obtenerOficinas();
      setOficinas(data);
    } catch (err) {
      console.error("Error cargando oficinas:", err);
    }
  };

  const manejarCambio = (id: number, campo: keyof Oficina, valor: string) => {
    setEditados((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor,
      },
    }));
  };

  const guardar = async (id: number) => {
    try {
      const datos = editados[id];
      if (!datos) return;

      if (id < 0) {
        await crearOficina({ nombre: datos.nombre ?? "", region: datos.region ?? "" });
      } else {
        await actualizarOficina(id, datos);
      }

      setNuevaFilaVisible(false);
      setEditandoId(null);
      setEditados({});
      await cargarOficinas();
    } catch (err) {
      console.error("Error guardando oficina:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white font-[Montserrat] mb-4">Gestión de Oficinas</h2>
        <button onClick={() => setNuevaFilaVisible(true)} title="Nueva oficina">
          <CirclePlus className="w-6 h-6 text-white" />
        </button>
      </div>

      <table className={style.table}>
        <thead>
          <tr>
            <th className={style.tableHeader}>ID</th>
            <th className={style.tableHeader}>Nombre</th>
            <th className={style.tableHeader}>Región</th>
            <th className={style.tableHeader}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {oficinas.map((o) => (
            <tr key={o.id} className={style.filaTabla}>
              <td className={style.celdaTabla}>{o.id}</td>
              {editandoId === o.id ? (
                <>
                  <td>
                    <input
                      className="w-full bg-transparent border border-white/20 rounded px-2 text-white"
                      value={editados[o.id]?.nombre ?? o.nombre}
                      onChange={(e) => manejarCambio(o.id, "nombre", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="w-full bg-transparent border border-white/20 rounded px-2 text-white"
                      value={editados[o.id]?.region ?? o.region}
                      onChange={(e) => manejarCambio(o.id, "region", e.target.value)}
                    />
                  </td>
                </>
              ) : (
                <>
                  <td className={style.celdaTabla}>{o.nombre}</td>
                  <td className={style.celdaTabla}>{o.region}</td>
                </>
              )}
              <td className={style.accionesCell}>
                {editandoId === o.id ? (
                  <button onClick={() => guardar(o.id)}>
                    <Save className="w-5 h-5 text-white" />
                  </button>
                ) : (
                  <button onClick={() => setEditandoId(o.id)}>
                    <Pencil className="w-5 h-5 text-white" />
                  </button>
                )}
              </td>
            </tr>
          ))}

          {nuevaFilaVisible && (
            <tr className={style.filaTabla}>
              <td className={style.celdaTabla}>—</td>
              <td className={style.celdaTabla}>
                <input
                  className="w-full bg-transparent border border-white/20 rounded px-2 text-white"
                  placeholder="Nueva oficina"
                  onChange={(e) => manejarCambio(-1, "nombre", e.target.value)}
                />
              </td>
              <td className={style.celdaTabla}>
                <input
                  className="w-full bg-transparent border border-white/20 rounded px-2 text-white"
                  placeholder="Región"
                  onChange={(e) => manejarCambio(-1, "region", e.target.value)}
                />
              </td>
              <td className={style.accionesCell}>
                <button onClick={() => guardar(-1)}>
                  <Save className="w-5 h-5 text-white" />
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
