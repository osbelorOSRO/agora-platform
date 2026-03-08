import type { ProcesoProductividad } from "../types/productividad";
import { FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type Props = {
  procesos: ProcesoProductividad[];
  mostrarEtiqueta?: boolean;
};

// Función robusta para mostrar fechas
function fechaCorta(val: unknown): string {
  if (typeof val === "string" && val.length >= 10) {
    return val.slice(0, 10);
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  return "-";
}

export default function TablaProductividad({ procesos, mostrarEtiqueta = false }: Props) {
  // Ordena de mayor a menor proceso_id (más reciente arriba)
  const procesosOrdenados = [...procesos].sort((a, b) => b.proceso_id - a.proceso_id);

  const exportarAExcel = () => {
    const data = procesosOrdenados.map((p) => ({
      Cliente: p.cliente_id,
      Proceso: p.proceso_id,
      Agente: p.iniciado_por,
      Etiqueta: p.ultima_etiqueta,
      Inicio: fechaCorta(p.fecha_inicio),
      Cierre: fechaCorta(p.fecha_cierre),
      Duracion: p.duracion_valor !== null && p.duracion_unidad
        ? `${p.duracion_valor} ${p.duracion_unidad}`
        : "",
      Abandono: p.abandonado ? "Sí" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procesos");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "procesos-productividad.xlsx");
  };

  return (
    <div className="overflow-x-auto bg-white/5 p-4 rounded-xl shadow">
      <button
        onClick={exportarAExcel}
        className="mb-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
      >
        <FileDown size={18} /> Exportar a Excel
      </button>

      <table className="min-w-full text-sm text-white">
        <thead>
          <tr className="text-left border-b border-white/20">
            <th className="p-2">Cliente</th>
            <th className="p-2">Proceso</th>
            <th className="p-2">Agente</th>
            {mostrarEtiqueta && <th className="p-2">Etiqueta</th>}
            <th className="p-2">Inicio</th>
            <th className="p-2">Cierre</th>
            <th className="p-2">Duración</th>
            <th className="p-2">Abandono</th>
          </tr>
        </thead>
        <tbody>
          {procesosOrdenados.map((p) => (
            <tr key={p.proceso_id} className="border-b border-white/10 hover:bg-white/10">
              <td className="p-2">{p.cliente_id}</td>
              <td className="p-2">{p.proceso_id}</td>
              <td className="p-2">{p.iniciado_por}</td>
              {mostrarEtiqueta && <td className="p-2">{p.ultima_etiqueta}</td>}
              <td className="p-2">{fechaCorta(p.fecha_inicio)}</td>
              <td className="p-2">{fechaCorta(p.fecha_cierre)}</td>
              <td className="p-2">
                {p.duracion_valor !== null && p.duracion_unidad
                  ? `${p.duracion_valor} ${p.duracion_unidad}`
                  : "-"}
              </td>
              <td className="p-2">{p.abandonado ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
