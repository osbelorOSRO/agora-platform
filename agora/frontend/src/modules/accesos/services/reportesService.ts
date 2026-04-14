import { getAuthHeaders } from "@/utils/getAuthHeaders";

const API_URL = `${import.meta.env.VITE_API_URL_ACCESOS}/api/reportes`;

export type ReportCatalogItem = {
  id: string;
  nombre: string;
  formatos: string[];
  filtros: string[];
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
