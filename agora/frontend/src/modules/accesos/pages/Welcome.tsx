import { useEffect, useState } from "react";
import style from "../styles/style";
import GraficoProductividad from "../components/GraficoProductividad";
import GraficoProcesosPorAgente from "../components/GraficoProcesosPorAgente";
import TablaProductividad from "../components/TablaProductividad";
import type { ProcesoProductividad, ProcesoPorAgente } from "../types/productividad";
import { obtenerTodosLosProcesos, obtenerResumenProcesosPorUsuarioPeriodo } from "../services/productividadService";

export default function Welcome() {
  const [procesos, setProcesos] = useState<ProcesoProductividad[]>([]);
  const [procesosPorAgente, setProcesosPorAgente] = useState<ProcesoPorAgente[]>([]);
  const [desde, setDesde] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Por defecto desde hace un mes
    return date.toISOString().split("T")[0];
  });
  const [hasta, setHasta] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });

  // Carga todos los procesos una sola vez al montar
  useEffect(() => {
    const cargarProcesos = async () => {
      try {
        const data = await obtenerTodosLosProcesos();
        setProcesos(data);
      } catch (error) {
        console.error("❌ Error al cargar procesos iniciales:", error);
      }
    };
    cargarProcesos();
  }, []);

  // El filtro solo aplica a procesosPorAgente (gráfico inferior)
  useEffect(() => {
    const cargarProcesosPorAgente = async () => {
      try {
        if (desde && hasta) {
          const resumen = await obtenerResumenProcesosPorUsuarioPeriodo(desde, hasta);
          setProcesosPorAgente(resumen);
        }
      } catch (error) {
        console.error("❌ Error al cargar proceso por agente:", error);
      }
    };
    cargarProcesosPorAgente();
  }, [desde, hasta]);

  return (
    <main className={`${style.mainContent} flex flex-col gap-6`}>
      <h1 className="text-white text-2xl font-semibold">
        Dashboard de Productividad
      </h1>

      {/* El filtro solo controla el gráfico de agentes, por claridad lo separamos */}
      <div className="bg-white/5 rounded-xl p-4 shadow">
        <GraficoProductividad procesos={procesos} />
      </div>

      <div className="flex gap-4 mb-4">
        <label className="flex flex-col text-white">
          Desde:
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded p-1"
          />
        </label>
        <label className="flex flex-col text-white">
          Hasta:
          <input
            type="date"
            value={hasta}
            min={desde}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded p-1"
          />
        </label>
      </div>

      <GraficoProcesosPorAgente datos={procesosPorAgente} />

      <TablaProductividad procesos={procesos} />
    </main>
  );
}
