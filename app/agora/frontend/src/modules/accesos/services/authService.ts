import apiClient from "../../../lib/apiClient";
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { env } from "@/lib/env";

const API_URL = `${env.apiUrl}/api/auth`;

export const preregistrarUsuario = async (username: string, rolId: number): Promise<{ invitationToken: string; expiresAt: string }> => {
  const res = await apiClient.post(`${API_URL}/preregistrar-usuario`, { username, rolId }, { headers: getAuthHeaders() });
  return res.data;
};
