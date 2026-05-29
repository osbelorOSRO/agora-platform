import { unwrapEnvelope } from "@/lib/apiClient";
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
  return (await res.json()).data;
};

export const revealFcaField = async (field: string): Promise<string | null> => {
  const res = await fetch(`${API_URL}/fca-config/reveal/${field}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudo revelar el campo");
  const json = await res.json();
  return json.data?.value ?? null;
};

export type FcaMqttStatus = {
  mqtt_connected: boolean | null;
  event?: 'connected' | 'disconnected' | 'cycling';
  fb_user_id?: string | null;
  fb_user_name?: string | null;
  updated_at?: string;
};

export const getFcaMqttStatus = async (): Promise<FcaMqttStatus> => {
  const res = await fetch(`${API_URL}/fca-config/mqtt-status`, { headers: getAuthHeaders() });
  if (!res.ok) return { mqtt_connected: null };
  return (await res.json()).data;
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
  return (await res.json()).data;
};
