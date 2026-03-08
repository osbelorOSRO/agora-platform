import axios from "axios";
import type { Usuario } from "../types/usuario";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const obtenerUsuarios = async (): Promise<Usuario[]> => {
  const response = await axios.get(`${API_URL}/api/auth/usuarios`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const actualizarUsuario = async (
  id: number,
  datos: Partial<Usuario>
): Promise<Usuario> => {
  const response = await axios.patch(`${API_URL}/api/auth/usuarios/${id}`, datos, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
