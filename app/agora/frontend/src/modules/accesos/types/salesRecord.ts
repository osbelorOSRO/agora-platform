export type ModalidadVenta = "POST_A_POST" | "SALTA" | "PRE_A_POST" | "ALTA";

export const MODALIDAD_LABELS: Record<ModalidadVenta, string> = {
  POST_A_POST: "Post a Post",
  SALTA: "SALTA",
  PRE_A_POST: "Pre a Post",
  ALTA: "ALTA",
};

export const MODALIDADES: ModalidadVenta[] = ["POST_A_POST", "SALTA", "PRE_A_POST", "ALTA"];

export const PUNTOS_VALIDOS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

export const RANGO_LABELS: Record<number, string> = {
  1: "Rango 1 (< 20 pts)",
  2: "Rango 2 (20–34 pts)",
  3: "Rango 3 (≥ 35 pts)",
};

export interface SaleRecord {
  id: number;
  fecha: string;
  run: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  country: string;
  contract_number: string;
  modality: ModalidadVenta;
  offers_code: string;
  offer_id: number;
  level_price: number;
  points: string;
  offers_price: number;
  offer?: Offer;
}

export interface SaleMonthlyPoints {
  year: number;
  month: number;
  total_points: number;
  active_range: number;
}

export interface Offer {
  id: number;
  code: string;
  modality: ModalidadVenta;
  level: number;
  points: string;
}

export interface PriceLevel {
  id: number;
  level: number;
  range: number;
  price: number;
}

export interface CreateSaleDto {
  fecha: string;
  run: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  country: string;
  contract_number: string;
  modality: ModalidadVenta;
  offers_code: string;
}
