import { Archive, CheckCircle2, Inbox } from "lucide-react";
import type { MetaInboxContentJson, MetaInboxThread } from "@/types/metaInbox";
import { normalizeMediaUrl } from "@/utils/mediaUrl";
import { RENDERABLE_MEDIA } from "./constants";
import type { StatusView } from "./constants";
import type { InboxRealtimePayload } from "./types";

export const formatRelativeTs = (value?: string | null) => {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const deltaSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (deltaSec < 60) return "hace 1 min";
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `hace ${deltaMin} min`;
  const deltaH = Math.floor(deltaMin / 60);
  if (deltaH < 24) return `hace ${deltaH} h`;
  const deltaD = Math.floor(deltaH / 24);
  return `hace ${deltaD} d`;
};

export const sortThreads = (items: MetaInboxThread[]) =>
  [...items].sort((a, b) => +new Date(b.lastMessageAt || 0) - +new Date(a.lastMessageAt || 0));

export const extractMedia = (contentJson: MetaInboxContentJson | null | undefined) => {
  const mediaType = String(contentJson?.mediaType || "").toLowerCase();
  const mediaUrl = normalizeMediaUrl(contentJson?.mediaUrl ? String(contentJson.mediaUrl) : "");
  if (mediaUrl && RENDERABLE_MEDIA.has(mediaType)) {
    return { mediaType, mediaUrl } as const;
  }
  const fallbackAttachments = Array.isArray((contentJson as any)?.message?.attachments)
    ? ((contentJson as any).message.attachments as Array<any>)
    : [];
  const first = fallbackAttachments[0];
  const fallbackType = String(first?.type || "").toLowerCase();
  const fallbackUrl = normalizeMediaUrl(
    first?.payload?.url
      ? String(first.payload.url)
      : Array.isArray((contentJson as any)?.message?.attachmentUrls) &&
          (contentJson as any).message.attachmentUrls[0]
        ? String((contentJson as any).message.attachmentUrls[0])
        : "",
  );
  if (fallbackUrl && RENDERABLE_MEDIA.has(fallbackType)) {
    return { mediaType: fallbackType, mediaUrl: fallbackUrl } as const;
  }
  return null;
};

export const compactActorId = (thread: MetaInboxThread) => {
  const phone = thread.phone?.trim();
  if (phone) return phone;
  const actor = thread.actorExternalId || "";
  const phoneFromJid = actor.match(/^(\d{8,15})@/)?.[1];
  if (phoneFromJid) return phoneFromJid;
  if (actor.length > 24) return `${actor.slice(0, 10)}...${actor.slice(-8)}`;
  return actor;
};

export const normalizeText = (value?: string | null) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export const stageLabel = (value?: string | null) => {
  const raw = String(value || "sin_etapa");
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const statusLabel = (value: StatusView) => {
  if (value === "OPEN") return "Open";
  if (value === "ARCHIVED") return "Archived";
  return "Closed";
};

export const statusIcon = (value: StatusView) => {
  if (value === "OPEN") return Inbox;
  if (value === "ARCHIVED") return Archive;
  return CheckCircle2;
};

export const threadMatchesStatus = (thread: MetaInboxThread, view: StatusView) => {
  const status = String(thread.threadStatus || "OPEN").toUpperCase();
  if (view === "OPEN") return status === "OPEN" || status === "PAUSED";
  return status === view;
};

// Función pura: fusiona un payload realtime en la lista de threads
export const mergeThreadIntoList = (
  threads: MetaInboxThread[],
  payload: InboxRealtimePayload,
): MetaInboxThread[] => {
  const sid = payload.sessionId ? String(payload.sessionId) : null;
  if (!sid) return threads;

  const str = (v: unknown) => String(v);
  const orNull = (v: unknown) => (v ? str(v) : null);
  const keepOrNull = <T,>(incoming: T | undefined, current: T): T =>
    incoming !== undefined ? ((incoming ? (str(incoming) as unknown as T) : null) as T) : current;

  const idx = threads.findIndex((t) => t.sessionId === sid);
  if (idx === -1) {
    const newItem: MetaInboxThread = {
      threadId: payload.threadId ? str(payload.threadId) : undefined,
      sessionId: sid,
      actorExternalId: str(payload.actorExternalId),
      objectType: str(payload.objectType),
      sourceChannel: payload.sourceChannel ? str(payload.sourceChannel) : null,
      threadStatus: payload.threadStatus ? str(payload.threadStatus) : "OPEN",
      attentionMode: payload.attentionMode ? str(payload.attentionMode) : "N8N",
      threadStage: payload.threadStage ? str(payload.threadStage) : "inicio",
      displayName: payload.displayName ? str(payload.displayName) : "Nuevo",
      phone: payload.phone ? str(payload.phone) : null,
      email: payload.email ? str(payload.email) : null,
      notes: payload.notes ? str(payload.notes) : null,
      city: payload.city ? str(payload.city) : null,
      firstName: null, lastName: null, rut: null, address: null, region: null,
      whatsappBlockStatus: payload.whatsappBlockStatus ? str(payload.whatsappBlockStatus) : null,
      whatsappBlockUpdatedAt: payload.whatsappBlockUpdatedAt ? str(payload.whatsappBlockUpdatedAt) : null,
      whatsappBlockJidUsed: payload.whatsappBlockJidUsed ? str(payload.whatsappBlockJidUsed) : null,
      lastMessageText: payload.lastMessageText ? str(payload.lastMessageText) : payload.contentText ? str(payload.contentText) : null,
      lastDirection: payload.lastDirection ? str(payload.lastDirection) : payload.direction ? str(payload.direction) : "INCOMING",
      lastMessageAt: payload.lastMessageAt ? str(payload.lastMessageAt) : payload.occurredAt ? str(payload.occurredAt) : new Date().toISOString(),
    };
    return sortThreads([newItem, ...threads]);
  }

  const cur = threads[idx];
  const updated: MetaInboxThread = {
    ...cur,
    threadId: payload.threadId ? str(payload.threadId) : cur.threadId,
    actorExternalId: payload.actorExternalId ? str(payload.actorExternalId) : cur.actorExternalId,
    objectType: payload.objectType ? str(payload.objectType) : cur.objectType,
    sourceChannel: keepOrNull(payload.sourceChannel, cur.sourceChannel),
    threadStatus: payload.threadStatus ? str(payload.threadStatus) : cur.threadStatus,
    attentionMode: payload.attentionMode ? str(payload.attentionMode) : cur.attentionMode,
    threadStage: payload.threadStage ? str(payload.threadStage) : cur.threadStage,
    displayName: payload.displayName ? str(payload.displayName) : cur.displayName,
    phone: keepOrNull(payload.phone, cur.phone),
    email: keepOrNull(payload.email, cur.email),
    notes: keepOrNull(payload.notes, cur.notes),
    city: keepOrNull(payload.city, cur.city),
    firstName: keepOrNull(payload.firstName, cur.firstName),
    lastName: keepOrNull(payload.lastName, cur.lastName),
    rut: keepOrNull(payload.rut, cur.rut),
    address: keepOrNull(payload.address, cur.address),
    region: keepOrNull(payload.region, cur.region),
    whatsappBlockStatus: keepOrNull(payload.whatsappBlockStatus, cur.whatsappBlockStatus ?? null),
    whatsappBlockUpdatedAt: keepOrNull(payload.whatsappBlockUpdatedAt, cur.whatsappBlockUpdatedAt ?? null),
    whatsappBlockJidUsed: keepOrNull(payload.whatsappBlockJidUsed, cur.whatsappBlockJidUsed ?? null),
    lastMessageText: payload.lastMessageText !== undefined
      ? orNull(payload.lastMessageText)
      : payload.contentText !== undefined
        ? orNull(payload.contentText)
        : cur.lastMessageText,
    lastDirection: payload.lastDirection !== undefined
      ? str(payload.lastDirection)
      : payload.direction !== undefined
        ? str(payload.direction)
        : cur.lastDirection,
    lastMessageAt: payload.lastMessageAt !== undefined
      ? str(payload.lastMessageAt)
      : payload.occurredAt !== undefined
        ? str(payload.occurredAt)
        : cur.lastMessageAt,
  };
  const copy = [...threads];
  copy[idx] = updated;
  return sortThreads(copy);
};

export const channelTitle = (objectType?: string) => {
  const t = String(objectType || "PAGE").toUpperCase();
  if (t === "FACEBOOK") return "Facebook";
  if (t === "WHATSAPP") return "WhatsApp";
  if (t === "INSTAGRAM") return "Instagram";
  if (t === "PAGE") return "Fan Page";
  return t;
};
