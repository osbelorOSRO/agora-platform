import { unwrapEnvelope } from "@/lib/apiClient";
import { getAuthHeaders } from "@/utils/getAuthHeaders";

import { env } from "@/lib/env";
const API_URL = env.apiUrl;

export type MetaConfig = {
  app_id?: string | null;
  app_secret?: string | null;
  display_name?: string | null;
  namespace?: string | null;
  app_domains?: string | null;
  contact_email?: string | null;
  privacy_policy_url?: string | null;
  terms_of_service_url?: string | null;
  meta_verify_token?: string | null;
  meta_page_access_token?: string | null;
  meta_ig_verify_token?: string | null;
  meta_ig_access_token?: string | null;
  admin_access_token?: string | null;
  fanpage_id?: string | null;
};

export const getMetaConfig = async (): Promise<MetaConfig> => {
  const res = await fetch(`${API_URL}/meta-config`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar la configuración Meta");
  return (await res.json()).data;
};

export const revealMetaField = async (field: string): Promise<string | null> => {
  const res = await fetch(`${API_URL}/meta-config/reveal/${field}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudo revelar el campo");
  const json = await res.json();
  return json.data?.value ?? null;
};

export const updateMetaConfig = async (payload: Partial<MetaConfig>): Promise<MetaConfig> => {
  const res = await fetch(`${API_URL}/meta-config`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al guardar configuración Meta");
  }
  return (await res.json()).data;
};
