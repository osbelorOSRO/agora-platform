import axios from "axios";
import { getAuthHeaders } from "@/utils/getAuthHeaders";

const BASE_URL = import.meta.env.VITE_SCRAPER_BASE_URL;

export interface ScraperPayload {
  id: number | string;
  tipo: string;
  modo: string;
  rut: string;
  lineas?: string[];
}

export interface ScraperResponse {
  proceso_id: number;
  status: string;
  resultado?: any;
  mensaje?: string;
}

export const TarjetaScrapingService = {
  async evaluarScrapingSync(payload: ScraperPayload): Promise<ScraperResponse> {
    const { data } = await axios.post(`${BASE_URL}/scrapear`, payload, {
      headers: getAuthHeaders(),
    });
    return data;
  },
};
