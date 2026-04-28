import { getAuthHeaders } from "@/utils/getAuthHeaders";
import type {
  CreateWhatsappContactInput,
  MetaInboxDirectoryContact,
  MetaInboxDirectoryContactsResponse,
  MetaInboxContactUpdate,
  MetaInboxMessage,
  MetaInboxThread,
  MetaInboxThreadControlUpdate,
} from "@/types/metaInbox";

const API_URL = import.meta.env.VITE_API_URL as string;

export const listMetaInboxThreads = async (
  limit = 100,
  offset = 0,
  includeClosed = false,
): Promise<MetaInboxThread[]> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    includeClosed: String(includeClosed),
  });
  const res = await fetch(`${API_URL}/meta-inbox/threads?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("No se pudieron cargar las conversaciones");
  return res.json();
};

export const listMetaInboxContacts = async (input: {
  search?: string;
  objectType?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<MetaInboxDirectoryContactsResponse> => {
  const params = new URLSearchParams({
    limit: String(input.limit ?? 50),
    offset: String(input.offset ?? 0),
  });
  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.objectType && input.objectType !== "ALL") params.set("objectType", input.objectType);

  const res = await fetch(`${API_URL}/meta-inbox/contacts?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("No se pudo cargar la agenda");
  return res.json();
};

export const createWhatsappContact = async (
  payload: CreateWhatsappContactInput,
): Promise<MetaInboxDirectoryContact> => {
  const res = await fetch(`${API_URL}/meta-inbox/contacts/whatsapp`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo crear el contacto WhatsApp");
  return res.json();
};

export const ensureWhatsappThread = async (actorExternalId: string): Promise<MetaInboxThread> => {
  const res = await fetch(`${API_URL}/meta-inbox/contacts/whatsapp/thread`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ actorExternalId }),
  });
  if (!res.ok) throw new Error("No se pudo preparar el thread WhatsApp");
  return res.json();
};

export const listMetaInboxMessages = async (
  sessionId: string,
  includeSystem = false,
): Promise<MetaInboxMessage[]> => {
  const res = await fetch(
    `${API_URL}/meta-inbox/threads/${encodeURIComponent(sessionId)}/messages?includeSystem=${includeSystem}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error("No se pudieron cargar los mensajes");
  return res.json();
};

export const sendMetaInboxText = async (sessionId: string, text: string) => {
  const res = await fetch(`${API_URL}/meta-inbox/threads/${encodeURIComponent(sessionId)}/send-text`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("No se pudo enviar el mensaje");
  return res.json();
};

export const updateMetaInboxContact = async (sessionId: string, payload: MetaInboxContactUpdate) => {
  const res = await fetch(`${API_URL}/meta-inbox/threads/${encodeURIComponent(sessionId)}/contact`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el contacto");
  return res.json();
};

export const updateMetaInboxThreadControl = async (sessionId: string, payload: MetaInboxThreadControlUpdate) => {
  const res = await fetch(`${API_URL}/meta-inbox/threads/${encodeURIComponent(sessionId)}/control`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el thread");
  return res.json();
};

export const reopenMetaInboxThread = async (sessionId: string): Promise<MetaInboxThread> => {
  const res = await fetch(`${API_URL}/meta-inbox/threads/${encodeURIComponent(sessionId)}/reopen`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("No se pudo abrir una nueva atencion");
  return res.json();
};

export const sendMetaInboxMedia = async (sessionId: string, file: File, caption?: string) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  if (caption?.trim()) formData.append("caption", caption.trim());

  const res = await fetch(`${API_URL}/meta-inbox/threads/${encodeURIComponent(sessionId)}/send-media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error("No se pudo enviar el archivo");
  return res.json();
};
