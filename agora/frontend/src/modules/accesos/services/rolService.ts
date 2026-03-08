import axios from "axios";
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
  const { data } = await axios.get<Rol[]>(API_URL, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const obtenerRolPorId = async (id: number): Promise<Rol> => {
  const { data } = await axios.get<Rol>(`${API_URL}/${id}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const crearRol = async (
  datos: { nombre: string; permisos: number[] }
): Promise<Rol> => {
  const { data } = await axios.post<Rol>(API_URL, datos, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const actualizarRol = async (
  id: number,
  datos: { nombre: string; permisos: number[] }
): Promise<Rol> => {
  const { data } = await axios.put<Rol>(`${API_URL}/${id}`, datos, {
    headers: getAuthHeaders(),
  });
  return data;
};
