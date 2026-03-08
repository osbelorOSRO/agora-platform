// src/modules/accesos/services/authService.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL_ACCESOS + "/api/auth";

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token"); // nombre real del token
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Preregistrar usuario (creado desde el panel por admin)
export const preregistrarUsuario = async (username: string, rolId: number) => {
  const res = await axios.post(
    `${API_URL}/preregistrar-usuario`,
    { username, rolId }, // Solo estos campos
    { headers: getAuthHeaders() }
  );
  return res.data;
};
