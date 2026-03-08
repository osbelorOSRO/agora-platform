// src/modules/accesos/pages/KPIs.tsx
import { useEffect, useState } from "react";
import { obtenerProductividadAgente } from "../services/productividadService";
import type { ProductividadResumen } from "../types/productividad";
import TasaAbandonoGauge from "../components/kpi/TasaAbandonoGauge";
import PromediosBarras from "../components/kpi/PromediosBarras";
import ProcesosAgrupadosBarras from "../components/kpi/ProcesosAgrupadosBarras";
import FiltroKPI from "../components/FiltroKPI";

export default function KPIs() {
  const [resumen, setResumen] = useState<ProductividadResumen | null>(null);
  const [usuarioId, setUsuarioId] = useState<number>(12);

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [desde, setDesde] = useState(firstDay);
  const [hasta, setHasta] = useState(today);

  const cargarDatos = async (id: number, desde: string, hasta: string) => {
    try {
      const data = await obtenerProductividadAgente(id, desde, hasta);
      setResumen(data);
    } catch (error) {
      console.error("Error al cargar KPI:", error);
      setResumen(null);
    }
  };

  useEffect(() => {
    cargarDatos(usuarioId, desde, hasta);
  }, []);

  const handleFiltrar = (nuevoUsuarioId: number, nuevoDesde: string, nuevoHasta: string) => {
    setUsuarioId(nuevoUsuarioId);
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    cargarDatos(nuevoUsuarioId, nuevoDesde, nuevoHasta);
  };

  return (
    <div className="p-6 text-white space-y-6">
      <h1 className="text-2xl font-bold">Indicadores de Productividad</h1>

      <FiltroKPI onFiltrar={handleFiltrar} />

      {!resumen ? (
        <div className="text-white p-4">Cargando datos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <TasaAbandonoGauge porcentaje={resumen.tasa_abandono} />
          <PromediosBarras tmo={resumen.tmo_promedio} sla={resumen.sla_promedio} />
          <ProcesosAgrupadosBarras agrupados={resumen.procesos_agrupados} />
        </div>
      )}
    </div>
  );
}
