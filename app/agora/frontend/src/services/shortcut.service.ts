import { Shortcut } from '../types/shortcut';
import { getAuthHeaders } from '../utils/getAuthHeaders';

import { env } from "@/lib/env";
const API_URL = `${env.apiUrl}/shortcut`;

export async function fetchShortcuts(): Promise<Shortcut[]> {
  const response = await fetch(API_URL, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Error al obtener atajos');
  return (await response.json()).data;
}

export async function fetchShortcut(uuid: string): Promise<Shortcut> {
  const response = await fetch(`${API_URL}/${uuid}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Atajo no encontrado');
  return (await response.json()).data;
}

export async function createShortcut(data: Omit<Shortcut, 'uuid'>): Promise<Shortcut> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear atajo');
  return (await response.json()).data;
}

export async function updateShortcut(uuid: string, data: Partial<Omit<Shortcut, 'uuid'>>): Promise<Shortcut> {
  const response = await fetch(`${API_URL}/${uuid}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar atajo');
  return (await response.json()).data;
}

export async function deleteShortcut(uuid: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/${uuid}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al eliminar atajo');
  return (await response.json()).data;
}
