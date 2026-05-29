import apiClient from "../../../lib/apiClient";
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { env } from "@/lib/env";

const API_URL = env.apiUrl;

export interface SesionActiva {
  id: number;
  ip: string;
  userAgent: string;
  horaLogin: string;
  ultimaInteraccion: string;
  usuario: {
    id: number;
    username: string;
    nombre: string;
    apellido: string;
    rol: string | null;
  };
}

export const obtenerSesionesActivas = async (): Promise<SesionActiva[]> => {
  const response = await apiClient.get(`${API_URL}/api/auth/sesiones-activas-admin`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const cerrarSesion = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/api/auth/sesiones/${id}`, {
    headers: getAuthHeaders(),
  });
};
