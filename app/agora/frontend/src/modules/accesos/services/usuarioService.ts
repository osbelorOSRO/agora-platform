import axios from "axios";
import type { Usuario } from "../types/usuario";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export const obtenerUsuarios = async (): Promise<Usuario[]> => {
  const response = await axios.get(`${API_URL}/api/auth/usuarios`, { headers: getAuthHeaders() });
  return response.data;
};

export const actualizarUsuario = async (id: number, datos: Partial<Usuario>): Promise<Usuario> => {
  const response = await axios.patch(`${API_URL}/api/auth/usuarios/${id}`, datos, { headers: getAuthHeaders() });
  return response.data;
};

export const adminResetPassword = async (id: number): Promise<{ resetToken: string; expiresAt: string }> => {
  const response = await axios.post(`${API_URL}/api/auth/usuarios/${id}/reset-password`, {}, { headers: getAuthHeaders() });
  return response.data;
};

export const adminReset2FA = async (id: number): Promise<{ bypassToken: string; expiresAt: string }> => {
  const response = await axios.post(`${API_URL}/api/auth/usuarios/${id}/reset-2fa`, {}, { headers: getAuthHeaders() });
  return response.data;
};

export const desbloquearUsuario = async (id: number): Promise<void> => {
  await axios.post(`${API_URL}/api/auth/usuarios/${id}/desbloquear`, {}, { headers: getAuthHeaders() });
};

export const regenerarInvitacion = async (id: number): Promise<{ invitationToken: string; expiresAt: string }> => {
  const response = await axios.post(`${API_URL}/api/auth/usuarios/${id}/regenerar-invitacion`, {}, { headers: getAuthHeaders() });
  return response.data;
};

export const cancelarPreregistro = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/auth/usuarios/${id}/preregistro`, { headers: getAuthHeaders() });
};
