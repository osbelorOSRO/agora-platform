export type MetaInboxContentJson = {
  mediaType?: "audio" | "image" | string;
  mediaUrl?: string;
  [key: string]: unknown;
};

export type MetaInboxThread = {
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  lastMessageText: string | null;
  lastDirection: string;
  lastMessageAt: string;
};

export type MetaInboxMessage = {
  externalEventId: string;
  messageExternalId: string | null;
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  eventKind: string;
  direction: string;
  contentText: string | null;
  contentJson: MetaInboxContentJson | null;
  status: string;
  occurredAt: string;
};

export type MetaInboxContactUpdate = {
  displayName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  city?: string;
};
