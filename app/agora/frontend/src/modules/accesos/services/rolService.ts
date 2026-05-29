import apiClient from "../../../lib/apiClient";
import type { Rol } from "../types/rol";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS + "/api/roles";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

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
