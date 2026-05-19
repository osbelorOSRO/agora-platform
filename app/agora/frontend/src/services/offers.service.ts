import { getAuthHeaders } from "@/utils/getAuthHeaders";
import type { CreateOfferInput, Offer, UpdateOfferInput } from "@/types/offers";

const API_URL = import.meta.env.VITE_API_URL as string;

export const listOffers = async (): Promise<Offer[]> => {
  const res = await fetch(`${API_URL}/offers`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar las ofertas");
  return res.json();
};

export const getOffer = async (codigo: string): Promise<Offer> => {
  const res = await fetch(`${API_URL}/offers/${encodeURIComponent(codigo)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Oferta no encontrada");
  return res.json();
};

export const createOffer = async (payload: CreateOfferInput): Promise<Offer> => {
  const res = await fetch(`${API_URL}/offers`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al crear oferta");
  }
  return res.json();
};

export const updateOffer = async (codigo: string, payload: UpdateOfferInput): Promise<Offer> => {
  const res = await fetch(`${API_URL}/offers/${encodeURIComponent(codigo)}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al actualizar oferta");
  }
  return res.json();
};

export const deleteOffer = async (codigo: string): Promise<void> => {
  const res = await fetch(`${API_URL}/offers/${encodeURIComponent(codigo)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar oferta");
};
