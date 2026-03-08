import { getAuthHeaders } from '@/utils/getAuthHeaders';
import type { ClienteLite } from '@/types/Cliente';

const API_URL = import.meta.env.VITE_API_URL;

// Avatares por defecto (mismos que usas en crearClienteManual)
const AVATARES = [
  `${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`,
  `${API_URL}/uploads/avatares/foto_perfil_hombre_default_03.png`,
  `${API_URL}/uploads/avatares/foto_perfil_hombre_default_05.png`,
  `${API_URL}/uploads/avatares/foto_perfil_mujer_default_01.png`,
  `${API_URL}/uploads/avatares/foto_perfil_mujer_default_04.png`,
  `${API_URL}/uploads/avatares/foto_perfil_mujer_default_06.png`,
];

function pickAvatar(): string {
  return AVATARES[Math.floor(Math.random() * AVATARES.length)];
}

export type AbrirOContinuarResponse = {
  ok: boolean;
  cliente_id: string;
  proceso_id: string; // viene como string en la API propuesta
  reanudado: boolean;
  // opcional: podemos anexar foto_perfil para que FloatingChat tenga algo siempre
  foto_perfil?: string | null;
};

/**
 * Abre o reanuda un proceso de chat para un cliente existente.
 * NO crea clientes; solo valida/crea el PROCESO (PG + Mongo en el backend).
 *
 * @param cliente_id - id del cliente (fono)
 * @param iniciado_por_id - id de usuario (desde tu JWT)
 * @param clienteLiteOpcional - (opcional) si ya tienes el cliente lite seleccionado, pásalo para usar su foto o fallback
 */
export async function abrirOContinuarChat(
  cliente_id: string,
  iniciado_por_id: number,
  clienteLiteOpcional?: ClienteLite | null
): Promise<AbrirOContinuarResponse> {
  const res = await fetch(`${API_URL}/clientes-lite/abrir-o-continuar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cliente_id, iniciado_por_id }),
  });

  if (!res.ok) throw new Error('No se pudo abrir/continuar el chat');

  const data = (await res.json()) as AbrirOContinuarResponse;

  // Si el backend no manda foto_perfil, y el caller nos pasó el cliente lite seleccionado,
  // rellenamos con su foto o con un avatar por defecto.
  if (!data.foto_perfil && clienteLiteOpcional) {
    data.foto_perfil = clienteLiteOpcional.foto_perfil ?? pickAvatar();
  }

  return data;
}
export async function obtenerProcesoActivoPorCliente(
  cliente_id: string
): Promise<{ id: string; cliente_id: string; fecha_inicio: string }> {
  const res = await fetch(`${API_URL}/procesos-pg/cliente/${encodeURIComponent(cliente_id)}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener proceso activo para cliente ${cliente_id}`);
  }

  return await res.json();
}
