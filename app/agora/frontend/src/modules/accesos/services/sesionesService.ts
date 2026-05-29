import apiClient from "../../../lib/apiClient";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

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
