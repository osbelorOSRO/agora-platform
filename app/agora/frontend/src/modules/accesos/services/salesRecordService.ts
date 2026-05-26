import axios from "axios";
import type {
  SaleRecord,
  SaleMonthlyPoints,
  Offer,
  PriceLevel,
  CreateSaleDto,
  ModalidadVenta,
} from "../types/salesRecord";

const API_URL = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

// ─── Ventas ───────────────────────────────────────────────────────────────────

export const obtenerVentas = async (year?: number, month?: number): Promise<SaleRecord[]> => {
  const params = new URLSearchParams();
  if (year !== undefined) params.set("year", String(year));
  if (month !== undefined) params.set("month", String(month));
  const q = params.toString();
  const res = await axios.get(`${API_URL}/sales-record${q ? `?${q}` : ""}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const crearVenta = async (dto: CreateSaleDto): Promise<SaleRecord> => {
  const res = await axios.post(`${API_URL}/sales-record`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const actualizarVenta = async (
  id: number,
  dto: Partial<Pick<SaleRecord, "run" | "full_name" | "phone" | "address" | "city" | "province" | "country" | "contract_number">>,
): Promise<SaleRecord> => {
  const res = await axios.patch(`${API_URL}/sales-record/${id}`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const eliminarVenta = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/sales-record/${id}`, { headers: getAuthHeaders() });
};

// ─── Puntos mensuales ─────────────────────────────────────────────────────────

export const obtenerPuntosMes = async (
  year: number,
  month: number,
): Promise<SaleMonthlyPoints> => {
  const res = await axios.get(`${API_URL}/sales-record/monthly-points/${year}/${month}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

// ─── Catálogo de ofertas ──────────────────────────────────────────────────────

export const obtenerCatalogo = async (): Promise<Offer[]> => {
  const res = await axios.get(`${API_URL}/sales-record/catalog`, {
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
  const res = await axios.post(`${API_URL}/sales-record/catalog`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const actualizarOferta = async (
  id: number,
  dto: { level?: number; points?: number },
): Promise<Offer> => {
  const res = await axios.patch(`${API_URL}/sales-record/catalog/${id}`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const eliminarOferta = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/sales-record/catalog/${id}`, { headers: getAuthHeaders() });
};

// ─── Matriz de precios ────────────────────────────────────────────────────────

export const obtenerMatrizPrecios = async (): Promise<PriceLevel[]> => {
  const res = await axios.get(`${API_URL}/sales-record/price-matrix`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const crearPrecioNivel = async (dto: {
  level: number;
  range: number;
  price: number;
}): Promise<PriceLevel> => {
  const res = await axios.post(`${API_URL}/sales-record/price-matrix`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const actualizarPrecioNivel = async (
  id: number,
  dto: { price?: number },
): Promise<PriceLevel> => {
  const res = await axios.patch(`${API_URL}/sales-record/price-matrix/${id}`, dto, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const eliminarPrecioNivel = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/sales-record/price-matrix/${id}`, {
    headers: getAuthHeaders(),
  });
};
