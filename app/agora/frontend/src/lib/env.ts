const require = (key: string): string => {
  const val = (import.meta.env as Record<string, string>)[key];
  if (!val) throw new Error(`[env] Variable de entorno requerida no definida: ${key}`);
  return val.replace(/\/+$/, "");
};

const optional = (key: string): string | undefined =>
  (import.meta.env as Record<string, string>)[key]?.replace(/\/+$/, "") || undefined;

export const env = {
  apiUrl:      require("VITE_API_URL"),
  wsUrl:       require("VITE_WEBSOCKET_URL"),
  mediaUrl:    optional("VITE_MEDIA_BASE_URL"),
  waPublicUrl: optional("VITE_WA_PUBLIC_URL"),
} as const;
