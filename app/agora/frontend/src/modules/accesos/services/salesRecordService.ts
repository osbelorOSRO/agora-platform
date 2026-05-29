import apiClient from "../../../lib/apiClient";
import type {
  SaleRecord,
  SaleMonthlyPoints,
  Offer,
  PriceLevel,
  CreateSaleDto,
  ModalidadVenta,
} from "../types/salesRecord";
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { env } from "@/lib/env";

const API_URL = env.apiUrl;

// ─── Ventas ───────────────────────────────────────────────────────────────────

export const obtenerVentas = async (year?: number, month?: number): Promise<SaleRecord[]> => {
  const params = new URLSearchParams();
  if (year !== undefined) params.set("year", String(year));
  if (month !== undefined) params.set("month", String(month));
  const q = params.toString();
  const res = await apiClient.get(`${API_URL}/sales-record${q ? `?${q}` : ""}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export interface BulkImportResult {
  total: number;
  inserted: number;
  errors: Array<{ index: number; error: string }>;
}

export const importarVentasCSV = async (
  file: File,
): Promise<BulkImportResult> => {
  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("El archivo no tiene datos");

  const MODALITY_MAP: Record<string, ModalidadVenta> = {
    "POST A POST": "POST_A_POST",
    POST_A_POST: "POST_A_POST",
    "PRE A POST": "PRE_A_POST",
    PRE_A_POST: "PRE_A_POST",
    ALTA: "ALTA",
    SALTA: "SALTA",
  };

  const parseFecha = (raw: string): string => {
    // acepta DD-MM-YY o DD-MM-YYYY o DD/MM/YY o DD/MM/YYYY
    const parts = raw.split(/[-/]/);
    if (parts.length !== 3) throw new Error(`Fecha inválida: ${raw}`);
    const [dd, mm, yy] = parts;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  // normalizar cabecera para tolerar mayúsculas y typos (ej. "adress")
  const header = lines[0].split(",").map((h) =>
    h.trim().toLowerCase().replace(/^adress$/, "address"),
  );

  const records: CreateSaleDto[] = lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const get = (field: string) => cols[header.indexOf(field)] ?? "";

    const rawModality = get("modality").toUpperCase();
    const modality = MODALITY_MAP[rawModality];
    if (!modality)
      throw new Error(
        `Fila ${i + 2}: modalidad desconocida "${get("modality")}"`,
      );

    return {
      fecha: parseFecha(get("fecha")),
      run: get("run"),
      full_name: get("full_name"),
      phone: get("phone"),
      address: get("address"),
      city: get("city"),
      province: get("province"),
      country: get("country"),
      contract_number: get("contract_number"),
      modality,
      offers_code: get("offers_code"),
    };
  });

  const res = await apiClient.post(
    `${API_URL}/sales-record/bulk`,
    { records },
    { headers: getAuthHeaders() },
  );
  return res.data;
};

export const crearVenta = async (dto: CreateSaleDto): Promise<SaleRecord> => {
  const res = await apiClient.post(`${API_URL}/sales-record`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const actualizarVenta = async (
  id: number,
  dto: Partial<Pick<SaleRecord, "run" | "full_name" | "phone" | "address" | "city" | "province" | "country" | "contract_number">>,
): Promise<SaleRecord> => {
  const res = await apiClient.patch(`${API_URL}/sales-record/${id}`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const eliminarVenta = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/sales-record/${id}`, { headers: getAuthHeaders() });
};

// ─── Puntos mensuales ─────────────────────────────────────────────────────────

export const obtenerPuntosMes = async (
  year: number,
  month: number,
): Promise<SaleMonthlyPoints> => {
  const res = await apiClient.get(`${API_URL}/sales-record/monthly-points/${year}/${month}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

// ─── Catálogo de ofertas ──────────────────────────────────────────────────────

export const obtenerCatalogo = async (): Promise<Offer[]> => {
  const res = await apiClient.get(`${API_URL}/sales-record/catalog`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const crearOferta = async (dto: {
  code: string;
  modality: ModalidadVenta;
  level: number;
  points: number;
}): Promise<Offer> => {
  const res = await apiClient.post(`${API_URL}/sales-record/catalog`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const actualizarOferta = async (
  id: number,
  dto: { level?: number; points?: number },
): Promise<Offer> => {
  const res = await apiClient.patch(`${API_URL}/sales-record/catalog/${id}`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const eliminarOferta = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/sales-record/catalog/${id}`, { headers: getAuthHeaders() });
};

// ─── Matriz de precios ────────────────────────────────────────────────────────

export const obtenerMatrizPrecios = async (): Promise<PriceLevel[]> => {
  const res = await apiClient.get(`${API_URL}/sales-record/price-matrix`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const crearPrecioNivel = async (dto: {
  level: number;
  range: number;
  price: number;
}): Promise<PriceLevel> => {
  const res = await apiClient.post(`${API_URL}/sales-record/price-matrix`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const actualizarPrecioNivel = async (
  id: number,
  dto: { price?: number },
): Promise<PriceLevel> => {
  const res = await apiClient.patch(`${API_URL}/sales-record/price-matrix/${id}`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const eliminarPrecioNivel = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/sales-record/price-matrix/${id}`, {
    headers: getAuthHeaders(),
  });
};
