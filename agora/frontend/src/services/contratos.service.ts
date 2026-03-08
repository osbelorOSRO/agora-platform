import type { Contrato } from '@/types/contratos';

const API_URL = import.meta.env.VITE_API_URL;

export async function getContratosByClienteId(clienteId: string): Promise<Contrato[]> {
  const resp = await fetch(`${API_URL}/contratos/${clienteId}`);
  if (!resp.ok) {
    throw new Error(`Error al obtener contratos: ${resp.statusText}`);
  }
  return resp.json();
}

export async function getContrato(clienteId: string, contratoId: string): Promise<Contrato> {
  const resp = await fetch(`${API_URL}/contratos/${clienteId}/${contratoId}`);
  if (!resp.ok) {
    throw new Error(`Error al obtener contrato: ${resp.statusText}`);
  }
  return resp.json();
}

export async function crearContrato(clienteId: string, contrato: Partial<Contrato>): Promise<Contrato> {
  const resp = await fetch(`${API_URL}/contratos/${clienteId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contrato),
  });
  if (!resp.ok) {
    throw new Error(`Error al crear contrato: ${resp.statusText}`);
  }
  return resp.json();
}

export async function actualizarContrato(
  clienteId: string,
  contratoId: string,
  contrato: Partial<Contrato>
): Promise<Contrato> {
  const resp = await fetch(`${API_URL}/contratos/${clienteId}/${contratoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contrato),
  });
  if (!resp.ok) {
    throw new Error(`Error al actualizar contrato: ${resp.statusText}`);
  }
  return resp.json();
}
