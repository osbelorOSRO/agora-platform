import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  permisos: string[];
  exp: number;
}

export const getTokenData = (): TokenPayload | null => {
  const token = localStorage.getItem("token"); // 🟢 CAMBIO CLAVE
  if (!token) return null;

  try {
    const decoded: TokenPayload = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      localStorage.removeItem("token");
      return null;
    }
    return decoded;
  } catch (error) {
    console.error("Error al decodificar token:", error);
    localStorage.removeItem("token");
    return null;
  }
};

export const guardarToken = (token: string): void => {
  localStorage.setItem("token", token); // 🟢 CAMBIO CLAVE
};
