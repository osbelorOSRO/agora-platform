const BASE_URL = import.meta.env.VITE_AUTH_API_URL || "/api/auth";

async function fetchJSON(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error en la solicitud");
  return data;
}

export async function login(username: string, password: string, token_2fa?: string) {
  return fetchJSON(`${BASE_URL}/login`, { username, password, token_2fa });
}

export async function registrarUsuario(username: string, invitationToken: string, password: string, confirmarPassword: string) {
  return fetchJSON(`${BASE_URL}/registrar-usuario`, { username, invitationToken, password, confirmarPassword });
}

export async function resetPassword(username: string, resetToken: string, newPassword: string, confirmarPassword: string) {
  return fetchJSON(`${BASE_URL}/reset-password`, { username, resetToken, newPassword, confirmarPassword });
}

export async function setup2FAInit(username: string, password: string, bypassToken: string): Promise<{ otpauth_url: string }> {
  return fetchJSON(`${BASE_URL}/setup-2fa/init`, { username, password, bypassToken });
}

export async function setup2FAConfirmar(username: string, bypassToken: string, totpCode: string) {
  return fetchJSON(`${BASE_URL}/setup-2fa/confirmar`, { username, bypassToken, totpCode });
}
