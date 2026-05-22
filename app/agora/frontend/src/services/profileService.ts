const BASE_URL = import.meta.env.VITE_AUTH_API_URL || "/api/auth";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
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
  return res.json();
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
  return json;
}

export async function getPhotoUrl(): Promise<string | null> {
  const res = await fetch(`${API_URL}/user-profile/photo`, { headers: authHeader() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.photoUrl ?? null;
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
  return json.photoUrl;
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
  localStorage.removeItem("token");
}
