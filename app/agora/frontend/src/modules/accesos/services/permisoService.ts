import apiClient from "../../../lib/apiClient";
import type { Permiso } from "../types/permiso";
import { env } from "@/lib/env";
import { getAuthHeaders } from "@/utils/getAuthHeaders";

const API_URL = `${env.apiUrl}/api`;

export const obtenerPermisos = async (): Promise<Permiso[]> => {
  const res = await apiClient.get(`${API_URL}/permisos`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};
