import React, { useEffect, useState } from "react";
import { estilos } from "../theme/estilos";
import { Etiqueta } from "../types/Etiqueta";
import {
  getTodasEtiquetas,
  actualizarYObtenerEtiqueta,
  crearEtiqueta,
} from "../services/clientes.service";
import { CirclePlus } from "lucide-react";

interface Props {
  clienteId: string;
  estadoActual: number;
  onActualizado: (nuevoId: number) => void;
  bgClass?: string;
  procesoId?: string;
}

const EstadoDropdown: React.FC<Props> = ({
  clienteId,
  estadoActual,
  onActualizado,
  bgClass,
  procesoId,
}) => {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);

  useEffect(() => {
    cargarEtiquetas();
  }, []);

  const cargarEtiquetas = async () => {
    setLoading(true);
    try {
      const etiquetasData = await getTodasEtiquetas();
      setEtiquetas(etiquetasData);
    } catch (error) {
      console.error("❌ Error al cargar etiquetas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccion = async (etiqueta_id: number) => {
    if (!procesoId) {
      console.warn("⚠️ No hay procesoId activo; no se puede cambiar etiqueta.");
      return;
    }
    try {
      await actualizarYObtenerEtiqueta({
        cliente_id: clienteId,
        etiqueta_id,
        fuente: "panel",
        proceso_id: procesoId,
      });
      onActualizado(etiqueta_id);
    } catch (error) {
      console.error("❌ Falló la asignación de etiqueta:", error);
    }
  };

  const handleCrear = async () => {
    if (!nuevaEtiqueta.trim()) return;
    try {
      await crearEtiqueta(nuevaEtiqueta.trim());
      await cargarEtiquetas();
      setNuevaEtiqueta("");
      setMostrandoFormulario(false);
    } catch (error) {
      console.error("❌ Error al crear etiqueta:", error);
    }
  };

  if (loading) {
    return <p className={estilos.estadoDropdown.cargando}>Cargando etiquetas...</p>;
  }

  return (
    <div className={`${estilos.estadoDropdown.contenedor} bg-white ${bgClass ?? ""}`}>
      <div className="flex items-center justify-between mb-2 px-2 bg-white">
        <span className="text-sm text-textoTag">Seleccionar Etiqueta</span>
      </div>

<div className={estilos.estadoDropdown.lista}>
  {etiquetas.map((etiqueta) => {
    const seleccionada = etiqueta.etiqueta_id === estadoActual;

    return (
      <button
        key={etiqueta.etiqueta_id}
        onClick={() => handleSeleccion(etiqueta.etiqueta_id)}
        style={{ backgroundColor: "#ffffff" }}
        className={`${estilos.estadoDropdown.botonEtiqueta} ${
          etiqueta.text_class ?? "text-textoTag"
        } ${seleccionada ? "ring-2 ring-azulPrimario font-semibold" : ""}`}
      >
        {etiqueta.nombre_etiqueta}
      </button>
    );
  })}
</div>

      <button
        onClick={() => setMostrandoFormulario(!mostrandoFormulario)}
        className="text-textoTag hover:text-azulPrimario transition inline-flex items-center gap-2 whitespace-nowrap"
      >
        <CirclePlus className="text-textoTag" /> Etiqueta
      </button>

      {mostrandoFormulario && (
        <div className="space-y-2 mt-2">
          <input
            type="text"
            value={nuevaEtiqueta}
            onChange={(e) => setNuevaEtiqueta(e.target.value)}
            placeholder="Nombre de la nueva etiqueta"
            className={estilos.estadoDropdown.inputNuevo}
          />
          <button className={estilos.estadoDropdown.botonCrear} onClick={handleCrear}>
            Aceptar
          </button>
        </div>
      )}
    </div>
  );
};

export default EstadoDropdown;
