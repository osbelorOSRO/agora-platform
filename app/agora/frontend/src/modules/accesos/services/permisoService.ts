import apiClient from "../../../lib/apiClient";
import type { Permiso } from "../types/permiso";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS + "/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const obtenerPermisos = async (): Promise<Permiso[]> => {
  const res = await apiClient.get(`${API_URL}/permisos`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};
