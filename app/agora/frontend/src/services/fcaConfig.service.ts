import { getAuthHeaders } from "@/utils/getAuthHeaders";

const API_URL = import.meta.env.VITE_API_URL as string;

export type FcaConfig = {
  enabled?: string | null;
  display_name?: string | null;
  fb_backend_url?: string | null;
  fb_user_id?: string | null;
  fb_user_name?: string | null;
  app_state?: string | null;
};

export const getFcaConfig = async (): Promise<FcaConfig> => {
  const res = await fetch(`${API_URL}/fca-config`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar la configuración FCA");
  return res.json();
};

export const revealFcaField = async (field: string): Promise<string | null> => {
  const res = await fetch(`${API_URL}/fca-config/reveal/${field}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudo revelar el campo");
  const data = await res.json();
  return data.value ?? null;
};

export const updateFcaConfig = async (payload: Partial<FcaConfig>): Promise<FcaConfig> => {
  const res = await fetch(`${API_URL}/fca-config`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string })?.message ?? "Error al guardar configuración FCA");
  }
  return res.json();
};
