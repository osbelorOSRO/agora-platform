import { jwtDecode } from "jwt-decode";
import { storage } from "@/lib/storage";

export interface UserFeatures {
  conversations:   boolean;
  reports:         boolean;
  settings:        boolean;
  botView:         boolean;
  botControl:      boolean;
  scheduleControl: boolean;
  salesManagement: boolean;
  superadmin:      boolean;
}

interface TokenPayload {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  permisos: string[];
  features: UserFeatures;
  exp: number;
}

export const getTokenData = (): TokenPayload | null => {
  const token = storage.getToken();
  if (!token) return null;

  try {
    const decoded: TokenPayload = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      storage.removeToken();
      return null;
    }
    return decoded;
  } catch (error) {
    console.error("Error al decodificar token:", error);
    storage.removeToken();
    return null;
  }
};

export const guardarToken = (token: string): void => {
  storage.setToken(token);
};
