import { ClienteLite } from '@/types/Cliente';
import { getAuthHeaders } from '@/utils/getAuthHeaders';

const API_URL = import.meta.env.VITE_API_URL;

export type ClientesLiteListResponse = {
  items: ClienteLite[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
};

/**
 * Lista paginada de clientes lite (avatar, nombre, cliente_id)
 */
export async function getClientesLite(
  { search = '', page = 1, limit = 30 } = {}
): Promise<ClientesLiteListResponse> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) q.set('search', search);

  const res = await fetch(`${API_URL}/clientes-lite/lite?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error cargando clientes lite');

  return res.json() as Promise<ClientesLiteListResponse>;
}

/**
 * Obtiene un cliente lite por ID
 */
export async function getClienteLiteById(cliente_id: string): Promise<ClienteLite | null> {
  const res = await fetch(`${API_URL}/clientes-lite/lite/${cliente_id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error obteniendo cliente lite');
  return res.json();
}
