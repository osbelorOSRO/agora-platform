export type MetaInboxContentJson = {
  mediaType?: "audio" | "image" | string;
  mediaUrl?: string;
  [key: string]: unknown;
};

export type MetaInboxThread = {
  threadId?: string;
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
  threadStatus: string;
  attentionMode: string;
  threadStage: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  actorScore?: string | null;
  actorLifecycleState?: string | null;
  actorLifecycleUpdatedAt?: string | null;
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

export type MetaInboxThreadControlUpdate = {
  threadStatus?: string;
  attentionMode?: string;
  threadStage?: string;
};
