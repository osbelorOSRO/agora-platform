// src/services/clientes.service.ts
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { Cliente } from "../types/Cliente";
import { Etiqueta } from "../types/Etiqueta";

const API_URL = import.meta.env.VITE_API_URL as string;

// 🔹 Listar clientes activos
export const listarClientesActivos = async (): Promise<Cliente[]> => {
  const res = await fetch(`${API_URL}/clientes/activos`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error listando activos");
  return await res.json();
};

// 🔹 Listar clientes cerrados
export const listarClientesCerrados = async (): Promise<Cliente[]> => {
  const res = await fetch(`${API_URL}/clientes/cerrados`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error listando cerrados");
  return await res.json();
};

// 🔹 Listar clientes inactivos
export const listarClientesInactivos = async (): Promise<Cliente[]> => {
  const res = await fetch(`${API_URL}/clientes/inactivos`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error listando inactivos");
  return await res.json();
};

const AVATARES = [
  `${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`,
  `${API_URL}/uploads/avatares/foto_perfil_hombre_default_03.png`,
  `${API_URL}/uploads/avatares/foto_perfil_hombre_default_05.png`,
  `${API_URL}/uploads/avatares/foto_perfil_mujer_default_01.png`,
  `${API_URL}/uploads/avatares/foto_perfil_mujer_default_04.png`,
  `${API_URL}/uploads/avatares/foto_perfil_mujer_default_06.png`,
];

// 🔹 Crear cliente manualmente
export const crearClienteManual = async (
  cliente_id: string,
  nombre?: string,
  tipo_id: string
) => {
  const foto_perfil = AVATARES[Math.floor(Math.random() * AVATARES.length)];

  const body = { nombre, foto_perfil, tipo_id };

  const res = await fetch(`${API_URL}/clientes/${encodeURIComponent(cliente_id)}/manual`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Error creando cliente manual");
  return await res.json();
};

// 🔹 Eliminar cliente
export const eliminarCliente = async (cliente_id: string) => {
  const res = await fetch(`${API_URL}/clientes/${encodeURIComponent(cliente_id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const contentType = res.headers.get("content-type");
  if (res.status === 204 || !contentType?.includes("application/json")) {
    return;
  }
  if (!res.ok) throw new Error("Error eliminando cliente");
  return await res.json();
};

// 🔥 OPTIMIZADO: Actualizar y obtener etiqueta del cliente
export const actualizarYObtenerEtiqueta = async ({
  cliente_id,
  etiqueta_id,
  fuente,
  proceso_id,
}: {
  cliente_id: string;
  etiqueta_id: number;
  fuente: "bot" | "humano" | "panel";
  proceso_id: string;
}): Promise<{
  ok: boolean;
  estado_actual: number;
  etiqueta_actual: string;
}> => {
  const res = await fetch(
    `${API_URL}/clientes/${encodeURIComponent(cliente_id)}/etiqueta`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ etiqueta_id, fuente, proceso_id }),
    }
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Error actualizando etiqueta");
  }

  // 🔥 AHORA retorna: { ok, estado_actual, etiqueta_actual }
  return await res.json();
};

// 🔹 Crear nueva etiqueta
export const crearEtiqueta = async (nombre_etiqueta: string) => {
  const res = await fetch(`${API_URL}/clientes/etiquetas`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ nombre_etiqueta }),
  });
  if (!res.ok) throw new Error("Error creando etiqueta");
  return await res.json();
};

// 🔹 Marcar cliente como intervenido
export const cambiarEstadoIntervencion = async (cliente_id: string, intervenida: boolean) => {
  const res = await fetch(`${API_URL}/clientes/${encodeURIComponent(cliente_id)}/intervencion`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ intervenida }),
  });
  if (!res.ok) throw new Error("Error cambiando intervención");
  return await res.json();
};

// 🔹 Obtener cliente por ID (soporta 404 -> null)
export const obtenerClientePorId = async (cliente_id: string) => {
  const res = await fetch(`${API_URL}/clientes/${encodeURIComponent(cliente_id)}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Error al obtener cliente");
  return await res.json();
};

// 🔹 (debug) Obtener todas las etiquetas
export const getTodasEtiquetas = async (): Promise<Etiqueta[]> => {
  const res = await fetch(`${API_URL}/clientes/debug/db`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener etiquetas");
  return await res.json();
};
