import type { ProcesoProductividad, ProductividadResumen, ProcesoPorAgente } from "../types/productividad";

const API_URL = `${import.meta.env.VITE_API_URL_ACCESOS}/api/productividad`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const obtenerTodosLosProcesos = async (): Promise<ProcesoProductividad[]> => {
  const res = await fetch(`${API_URL}/procesos`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al obtener todos los procesos");
  }

  return await res.json();
};

export const obtenerProductividadAgente = async (
  agenteId: number,
  desde: string,
  hasta: string
): Promise<ProductividadResumen> => {
  const res = await fetch(`${API_URL}/agente/${agenteId}?desde=${desde}&hasta=${hasta}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al obtener productividad del agente");
  }

  return await res.json();
};

export const obtenerProcesosDelAgente = async (
  agenteId: number,
  desde: string,
  hasta: string
): Promise<ProcesoProductividad[]> => {
  const todosProcesos = await obtenerTodosLosProcesos();
  const desdeFecha = new Date(desde);
  const hastaFecha = new Date(hasta);

  return todosProcesos.filter(p =>
    p.iniciado_por === agenteId.toString() &&
    new Date(p.fecha_inicio) >= desdeFecha &&
    new Date(p.fecha_inicio) <= hastaFecha
  );
};

export const obtenerResumenProcesosPorUsuarioPeriodo = async (
  desde: string,
  hasta: string
): Promise<ProcesoPorAgente[]> => {
  const res = await fetch(`${API_URL}/resumen?desde=${desde}&hasta=${hasta}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al obtener resumen de procesos por usuario");
  }

  return await res.json();
};
