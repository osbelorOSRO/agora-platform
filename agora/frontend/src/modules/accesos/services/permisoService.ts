import axios from "axios";
import type { Permiso } from "../types/permiso";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS + "/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const obtenerPermisos = async (): Promise<Permiso[]> => {
  const { data } = await axios.get<Permiso[]>(`${API_URL}/permisos`, {
    headers: getAuthHeaders(),
  });
  return data;
};
