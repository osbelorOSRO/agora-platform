import { RespuestaRapida } from '../types/respuestas-rapidas';
import { getAuthHeaders } from '../utils/getAuthHeaders';

const API_URL = `${import.meta.env.VITE_API_URL}/respuestas-rapidas`;  // ✅ CORRECTO

export async function fetchRespuestas(): Promise<RespuestaRapida[]> {
  const response = await fetch(API_URL, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Error al obtener respuestas rápidas');
  }
  return response.json();
}

export async function fetchRespuesta(uuid: string): Promise<RespuestaRapida> {
  const response = await fetch(`${API_URL}/${uuid}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Respuesta rápida no encontrada');
  }
  return response.json();
}

export async function createRespuesta(data: Omit<RespuestaRapida, 'uuid'>): Promise<RespuestaRapida> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Error al crear respuesta rápida');
  }
  return response.json();
}

export async function updateRespuesta(uuid: string, data: Partial<Omit<RespuestaRapida, 'uuid'>>): Promise<RespuestaRapida> {
  const response = await fetch(`${API_URL}/${uuid}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Error al actualizar respuesta rápida');
  }
  return response.json();
}

export async function deleteRespuesta(uuid: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/${uuid}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Error al eliminar respuesta rápida');
  }
  return response.json();
}
