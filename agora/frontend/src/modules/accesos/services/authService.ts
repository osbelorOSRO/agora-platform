import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS + "/api/auth";

export const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const preregistrarUsuario = async (username: string, rolId: number): Promise<{ invitationToken: string; expiresAt: string }> => {
  const res = await axios.post(`${API_URL}/preregistrar-usuario`, { username, rolId }, { headers: getAuthHeaders() });
  return res.data;
};
