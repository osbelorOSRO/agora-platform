export type TipoId = 'jid' | 'lid';
export type OutgoingMediaType = 'image' | 'audio' | 'video' | 'document';
export type OutgoingType = 'text' | OutgoingMediaType;

export type BaileysOutgoingCommand = {
  to: string;
  phoneNumber: string;
  actorExternalId: string;
  phone: boolean;
  tipoId: TipoId;
  tipo: OutgoingType;
  text: string;
  url_archivo?: string;
  fileName?: string;
  mimeType?: string;
};

type OutgoingPayload = {
  destino?: unknown;
  actorExternalId?: unknown;
  recipientId?: unknown;
  tipoId?: unknown;
  tipo?: unknown;
  contenido?: unknown;
  url_archivo?: unknown;
  payload?: unknown;
  message?: unknown;
  media?: unknown;
};

const PHONE_SUFFIXES = ['@s.whatsapp.net', '@whatsapp.net'];

export function toBaileysOutgoingCommand(input: OutgoingPayload): BaileysOutgoingCommand {
  const actorExternalId = resolveActorExternalId(input);
  const tipoId = resolveTipoId(input, actorExternalId);
  const to = buildBaileysTarget(actorExternalId, tipoId);
  const phoneNumber = extractPhoneNumber(to);
  const tipo = resolveOutgoingTipo(input);
  const text = resolveText(input);
  const url_archivo = resolveMediaUrl(input);
  const fileName = resolveFileName(input, url_archivo);
  const mimeType = resolveMimeType(input);

  if (tipo === 'text' && !text) {
    throw new Error('Mensaje vacío: no hay texto para enviar');
  }

  if (tipo !== 'text' && !url_archivo) {
    throw new Error('Falta o es inválido el campo url_archivo');
  }

  return {
    to,
    phoneNumber,
    actorExternalId: to,
    phone: isPhoneJid(to),
    tipoId,
    tipo,
    text,
    ...(url_archivo ? { url_archivo } : {}),
    ...(fileName ? { fileName } : {}),
    ...(mimeType ? { mimeType } : {}),
  };
}

function resolveActorExternalId(input: OutgoingPayload): string {
  const payload = asRecord(input.payload);
  const message = asRecord(input.message) || asRecord(payload?.message);
  const candidates = [
    input.actorExternalId,
    payload?.actorExternalId,
    input.destino,
    payload?.recipientId,
    message?.recipientId,
    input.recipientId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  throw new Error('Falta destino: actorExternalId, destino o recipientId');
}

function resolveTipoId(input: OutgoingPayload, actorExternalId: string): TipoId {
  if (input.tipoId === 'jid' || input.tipoId === 'lid') return input.tipoId;
  const payload = asRecord(input.payload);
  const wa = asRecord(payload?.wa);
  if (wa?.tipoId === 'jid' || wa?.tipoId === 'lid') return wa.tipoId;

  const normalized = actorExternalId.toLowerCase();
  if (normalized.endsWith('@lid') || normalized.endsWith('@lid.c.us')) return 'lid';
  return 'jid';
}

function buildBaileysTarget(actorExternalId: string, tipoId: TipoId): string {
  const normalized = actorExternalId.trim();
  const lower = normalized.toLowerCase();

  if (lower.endsWith('@s.whatsapp.net') || lower.endsWith('@lid')) return normalized;
  if (lower.endsWith('@whatsapp.net')) {
    return `${normalized.slice(0, -'@whatsapp.net'.length)}@s.whatsapp.net`;
  }
  if (lower.endsWith('@lid.c.us')) {
    return `${normalized.slice(0, -'@lid.c.us'.length)}@lid`;
  }

  return `${normalized.split('@')[0]}@${tipoId === 'jid' ? 's.whatsapp.net' : 'lid'}`;
}

function extractPhoneNumber(to: string): string {
  return to.split('@')[0] || to;
}

function isPhoneJid(to: string): boolean {
  const normalized = to.toLowerCase();
  return PHONE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function resolveOutgoingTipo(input: OutgoingPayload): OutgoingType {
  const rawTipo = input.tipo || asRecord(input.payload)?.tipo || asRecord(input.media)?.mediaType;
  const normalized = typeof rawTipo === 'string' ? rawTipo.toLowerCase() : '';

  if (normalized === 'text' || normalized === 'texto') return 'text';
  if (normalized === 'image' || normalized === 'imagen') return 'image';
  if (normalized === 'audio') return 'audio';
  if (normalized === 'video') return 'video';
  if (normalized === 'document' || normalized === 'documento') return 'document';
  return resolveMediaUrl(input) ? 'image' : 'text';
}

function resolveText(input: OutgoingPayload): string {
  const contenido = input.contenido;
  const payload = asRecord(input.payload);
  const message = asRecord(input.message) || asRecord(payload?.message);
  const candidates = [
    contenido,
    asRecord(contenido)?.text,
    asRecord(contenido)?.caption,
    asRecord(contenido)?.body,
    message?.text,
    message?.caption,
    payload?.text,
    payload?.caption,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

function resolveMediaUrl(input: OutgoingPayload): string | undefined {
  const contenido = asRecord(input.contenido);
  const payload = asRecord(input.payload);
  const message = asRecord(input.message) || asRecord(payload?.message);
  const media = asRecord(input.media) || asRecord(payload?.media);
  const attachmentUrls = Array.isArray(message?.attachmentUrls) ? message?.attachmentUrls : [];
  const candidates = [
    input.url_archivo,
    contenido?.url_archivo,
    asRecord(contenido?.audio)?.url,
    asRecord(contenido?.image)?.url,
    asRecord(contenido?.video)?.url,
    asRecord(contenido?.document)?.url,
    media?.mediaUrl,
    media?.url,
    attachmentUrls[0],
    payload?.url_archivo,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function resolveFileName(input: OutgoingPayload, mediaUrl?: string): string | undefined {
  const contenido = asRecord(input.contenido);
  const payload = asRecord(input.payload);
  const message = asRecord(input.message) || asRecord(payload?.message);
  const media = asRecord(input.media) || asRecord(payload?.media);
  const document = asRecord(contenido?.document);
  const candidates = [
    document?.fileName,
    media?.fileName,
    payload?.fileName,
    message?.fileName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (mediaUrl) {
    try {
      const parsed = new URL(mediaUrl);
      const last = parsed.pathname.split('/').filter(Boolean).pop();
      if (last) return decodeURIComponent(last);
    } catch {
      const last = mediaUrl.split('/').filter(Boolean).pop();
      if (last) return last;
    }
  }

  return undefined;
}

function resolveMimeType(input: OutgoingPayload): string | undefined {
  const contenido = asRecord(input.contenido);
  const payload = asRecord(input.payload);
  const message = asRecord(input.message) || asRecord(payload?.message);
  const media = asRecord(input.media) || asRecord(payload?.media);
  const candidates = [
    contenido?.mimetype,
    contenido?.mimeType,
    media?.mimeType,
    media?.mimetype,
    payload?.mimeType,
    payload?.mimetype,
    message?.mimeType,
    message?.mimetype,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
