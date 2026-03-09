const BASE_URL = import.meta.env.VITE_AUTH_API_URL || "/api/auth";

export async function login(username: string, password: string, token_2fa?: string) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, token_2fa }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al iniciar sesión");
  }
  return res.json();
}

export async function registrarUsuario(username: string, password: string, confirmarPassword: string) {
  const res = await fetch(`${BASE_URL}/registrar-usuario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, confirmarPassword }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al registrar usuario");
  }
  return res.json(); // contiene { message, secret_otpauth_url, secret_base32 }
}
