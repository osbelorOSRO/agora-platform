import { storage } from "@/lib/storage";
import { env } from "@/lib/env";

const BASE_URL = `${env.apiUrl}/api/auth`;
const API_URL = env.apiUrl;

function authHeader(): Record<string, string> {
  const token = storage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface MeProfile {
  id: number;
  username: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  rol: string | null;
}

export async function getMe(): Promise<MeProfile> {
  const res = await fetch(`${BASE_URL}/me`, { headers: authHeader() });
  if (!res.ok) throw new Error("No se pudo cargar el perfil");
  const json = await res.json();
  return json?.data ?? json;
}

export async function updateMe(
  id: number,
  data: { nombre?: string; apellido?: string; email?: string; telefono?: string; run?: string },
): Promise<MeProfile> {
  const res = await fetch(`${BASE_URL}/usuarios/${id}`, {
    method: "PATCH",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "No se pudo actualizar el perfil");
  return json?.data ?? json;
}

export async function getPhotoUrl(): Promise<string | null> {
  const res = await fetch(`${API_URL}/user-profile/photo`, { headers: authHeader() });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.photoUrl ?? null;
}

export async function uploadPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("photo", file);
  const res = await fetch(`${API_URL}/user-profile/photo`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || "Error al subir la foto");
  return json.data?.photoUrl;
}

export async function removePhoto(): Promise<void> {
  await fetch(`${API_URL}/user-profile/photo`, {
    method: "DELETE",
    headers: authHeader(),
  });
}

export async function logoutSession(): Promise<void> {
  await fetch(`${BASE_URL}/logout`, {
    method: "DELETE",
    headers: authHeader(),
  }).catch(() => {});
  storage.removeToken();
}
