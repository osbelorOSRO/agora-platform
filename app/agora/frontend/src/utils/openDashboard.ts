import { env } from "@/lib/env";
export const openBotDashboard = (): void => {
  const waPublicUrl = env.waPublicUrl;
  if (!waPublicUrl) return;

  const url = new URL('/ui', waPublicUrl).toString();
  window.open(url, '_blank', 'noopener,noreferrer');
};
