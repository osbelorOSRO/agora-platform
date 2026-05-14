import { getAuthHeaders } from "@/utils/getAuthHeaders";

const API_URL = `${import.meta.env.VITE_API_URL_ACCESOS}/api/reportes`;

export type ReportCatalogItem = {
  id: string;
  nombre: string;
  formatos: string[];
  filtros: string[];
};

export type ThreadWeeklyActivityRow = {
  semana_inicio: string;
  semana_fin: string;
  total_eventos: number;
  threads_creados: number;
  mensajes_entrantes: number;
  mensajes_salientes: number;
  threads_distintos: number;
};

type JsonReportResponse<T> = {
  report: string;
  total: number;
  rows: T[];
};

export const listarReportes = async (): Promise<ReportCatalogItem[]> => {
  const res = await fetch(API_URL, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("No se pudo obtener el catálogo de reportes");
  }

  return res.json();
};

export const obtenerActividadSemanalThreads = async (
  desde: string,
  hasta: string
): Promise<ThreadWeeklyActivityRow[]> => {
  const params = new URLSearchParams({ desde, hasta });

  const res = await fetch(`${API_URL}/procesos-semanales?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("No se pudo obtener la actividad semanal de threads");
  }

  const data = (await res.json()) as JsonReportResponse<ThreadWeeklyActivityRow>;
  return data.rows || [];
};

export const descargarReporteCsv = async (
  reportId: string,
  filtros: Record<string, string>
): Promise<void> => {
  const params = new URLSearchParams({
    ...filtros,
    format: "csv",
  });

  const res = await fetch(`${API_URL}/${reportId}?${params.toString()}`, {
    headers: {
      Authorization: getAuthHeaders().Authorization,
    },
  });

  if (!res.ok) {
    throw new Error("No se pudo descargar el CSV");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
