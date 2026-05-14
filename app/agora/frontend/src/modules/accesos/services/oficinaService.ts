import type { Oficina } from "../types/oficina";

const API_URL = `${import.meta.env.VITE_API_URL_ACCESOS}/api/auth/oficinas`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const obtenerOficinas = async (): Promise<Oficina[]> => {
  const res = await fetch(API_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al obtener oficinas");
  }

  return await res.json();
};

export const crearOficina = async (datos: {
  nombre: string;
  region: string;
}): Promise<Oficina> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(datos),
  });

  if (!res.ok) {
    throw new Error("Error al crear oficina");
  }

  return await res.json();
};

export const actualizarOficina = async (
  id: number,
  datos: { nombre?: string; region?: string; activa?: boolean }
): Promise<Oficina> => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(datos),
  });

  if (!res.ok) {
    throw new Error("Error al actualizar oficina");
  }

  return await res.json();
};
