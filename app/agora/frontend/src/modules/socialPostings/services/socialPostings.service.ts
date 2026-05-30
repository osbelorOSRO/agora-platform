import { env } from "@/lib/env";
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { storage } from "@/lib/storage";
import type {
  Posteo,
  CreatePosteoDto,
  UpdatePosteoDto,
  ImagenGaleria,
} from "../types";

const BASE = `${env.apiUrl}/social-postings`;
const MEDIA = `${env.apiUrl}/media`;

// ── Calendario ────────────────────────────────────────────────────────────

export const getCalendario = async (mes: string): Promise<Posteo[]> => {
  const res = await fetch(`${BASE}/calendario?mes=${mes}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("No se pudo cargar el calendario");
  return (await res.json()).data ?? [];
};

export const crearPosteo = async (dto: CreatePosteoDto): Promise<Posteo> => {
  const res = await fetch(BASE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al crear el posteo");
  }
  return (await res.json()).data;
};

export const actualizarPosteo = async (
  id: number,
  dto: UpdatePosteoDto,
): Promise<Posteo> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al actualizar el posteo");
  }
  return (await res.json()).data;
};

export const eliminarPosteo = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar el posteo");
};

// ── Galería de imágenes ───────────────────────────────────────────────────

export const getGaleria = async (): Promise<ImagenGaleria[]> => {
  const res = await fetch(`${MEDIA}/galeria-ofertas`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("No se pudo cargar la galería");
  return (await res.json()).data ?? [];
};

export const subirImagenes = async (
  files: File[],
): Promise<ImagenGaleria[]> => {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  const res = await fetch(`${MEDIA}/galeria-ofertas`, {
    method: "POST",
    headers: { Authorization: `Bearer ${storage.getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir las imágenes");
  return (await res.json()).data ?? [];
};

export const eliminarImagenGaleria = async (id: number): Promise<void> => {
  const res = await fetch(`${MEDIA}/galeria-ofertas/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar la imagen");
};
