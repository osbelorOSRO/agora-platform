export const openBotDashboard = (): void => {
  const waPublicUrl = import.meta.env.VITE_WA_PUBLIC_URL;
  if (!waPublicUrl) return;

  const url = new URL('/ui', waPublicUrl).toString();
  window.open(url, '_blank', 'noopener,noreferrer');
};
