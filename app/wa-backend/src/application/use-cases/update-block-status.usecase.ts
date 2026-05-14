import { WhatsAppGateway } from '../whatsapp.gateway.js';
import { logger } from '../../shared/logger.js';

export type BlockAction = 'block' | 'unblock';

export type UpdateBlockStatusInput = {
  action: BlockAction;
  phone?: string | null;
  jid?: string | null;
  pnJid?: string | null;
  lidJid?: string | null;
};

export type UpdateBlockStatusResult = {
  action: BlockAction;
  jidUsed: string;
  candidates: string[];
  blocklistCount: number | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(input: unknown): string {
  return String(input || '').replace(/\D/g, '');
}

function normalizeJid(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value || !value.includes('@')) return null;
  return value;
}

function jidToPhone(input: unknown): string | null {
  const jid = normalizeJid(input);
  if (!jid) return null;
  const phone = normalizePhone(jid.split('@')[0]);
  return phone.length >= 8 ? phone : null;
}

async function waitOpen(gateway: WhatsAppGateway, timeoutMs = 15000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      gateway.getSocket();
      return;
    } catch {}

    await sleep(300);
  }

  throw new Error('Socket no disponible');
}

export async function updateBlockStatusNative(
  gateway: WhatsAppGateway,
  input: UpdateBlockStatusInput,
): Promise<UpdateBlockStatusResult> {
  if (input.action !== 'block' && input.action !== 'unblock') {
    throw new Error('Accion invalida. Debe ser block o unblock.');
  }

  const sock = gateway.getSocket();
  const candidates = new Set<string>();

  for (const candidate of [input.lidJid, input.pnJid, input.jid]) {
    const jid = normalizeJid(candidate);
    if (jid) candidates.add(jid);
  }

  const phone =
    normalizePhone(input.phone) ||
    jidToPhone(input.pnJid) ||
    jidToPhone(input.jid) ||
    null;

  if (phone) {
    try {
      const probe = await sock.onWhatsApp(phone);
      logger.info(`onWhatsApp resultado bloqueo: ${JSON.stringify(probe)}`);

      if (Array.isArray(probe)) {
        for (const item of probe) {
          const record: any = item;
          if (record?.lid) candidates.add(String(record.lid));
          if (record?.jid) candidates.add(String(record.jid));
        }
      }
    } catch (error) {
      logger.warn(`Error consultando onWhatsApp para bloqueo: ${JSON.stringify(error)}`);
    }

    candidates.add(`${phone}@s.whatsapp.net`);
  }

  if (candidates.size === 0) {
    throw new Error('No hay JID candidato para bloquear/desbloquear.');
  }

  let blocklistCount: number | null = null;
  try {
    const blocklist = await sock.fetchBlocklist();
    blocklistCount = Array.isArray(blocklist) ? blocklist.length : null;
  } catch (error) {
    logger.warn(`Error obteniendo blocklist: ${JSON.stringify(error)}`);
  }

  let lastError: any;
  const orderedCandidates = [...candidates];

  for (const jid of orderedCandidates) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        logger.info(`Intentando updateBlockStatus jid=${jid} action=${input.action} intento=${attempt}`);
        await waitOpen(gateway);
        await gateway.getSocket().updateBlockStatus(jid, input.action);
        logger.info(`updateBlockStatus exitoso jid=${jid} action=${input.action}`);

        return {
          action: input.action,
          jidUsed: jid,
          candidates: orderedCandidates,
          blocklistCount,
        };
      } catch (error) {
        lastError = error;
        logger.warn(
          `Error updateBlockStatus jid=${jid} action=${input.action} intento=${attempt} error=${JSON.stringify(error)}`,
        );
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError || new Error(`No se pudo ejecutar ${input.action}`);
}
