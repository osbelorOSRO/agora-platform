import apiClient from "../../../lib/apiClient";
import type { Rol } from "../types/rol";
import { env } from "@/lib/env";
import { getAuthHeaders } from "@/utils/getAuthHeaders";

const API_URL = `${env.apiUrl}/api/roles`;

export const obtenerRoles = async (): Promise<Rol[]> => {
  const res = await apiClient.get(API_URL, { headers: getAuthHeaders() });
  return res.data;
};

export const obtenerRolPorId = async (id: number): Promise<Rol> => {
  const res = await apiClient.get(`${API_URL}/${id}`, { headers: getAuthHeaders() });
  return res.data;
};

export const crearRol = async (
  datos: { nombre: string; permisos: number[] }
): Promise<Rol> => {
  const res = await apiClient.post(API_URL, datos, { headers: getAuthHeaders() });
  return res.data;
};

export const actualizarRol = async (
  id: number,
  datos: { nombre: string; permisos: number[] }
): Promise<Rol> => {
  const res = await apiClient.put(`${API_URL}/${id}`, datos, { headers: getAuthHeaders() });
  return res.data;
};
