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
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  region: string | null;
  whatsappBlockStatus?: string | null;
  whatsappBlockUpdatedAt?: string | null;
  whatsappBlockJidUsed?: string | null;
  actorScore?: string | null;
  actorLifecycleState?: string | null;
  actorLifecycleUpdatedAt?: string | null;
  lastMessageText: string | null;
  lastDirection: string;
  lastMessageAt: string;
  metadata?: Record<string, unknown> | null;
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
  firstName?: string;
  lastName?: string;
  phone?: string;
  rut?: string;
  address?: string;
  email?: string;
  notes?: string;
  city?: string;
  region?: string;
};

export type MetaInboxThreadControlUpdate = {
  threadStatus?: string;
  attentionMode?: string;
  threadStage?: string;
};

export type MetaInboxDirectoryContact = {
  actorExternalId: string;
  objectType: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  region: string | null;
  metadata?: Record<string, unknown> | null;
  actorScore?: string | null;
  actorLifecycleState?: string | null;
  actorLifecycleUpdatedAt?: string | null;
  lastThreadSessionId?: string | null;
  lastThreadStatus?: string | null;
  lastThreadStage?: string | null;
  lastAttentionMode?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
};

export type MetaInboxDirectoryContactsResponse = {
  items: MetaInboxDirectoryContact[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
};

export type CreateWhatsappContactInput = {
  phone: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  rut?: string;
  address?: string;
  email?: string;
  notes?: string;
  city?: string;
  region?: string;
};

export type WhatsappAdLeadStatsItem = {
  sourceId: string;
  uniqueSessions: number;
  seenCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  title: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  originalImageUrl: string | null;
};

export type WhatsappAdLeadRow = {
  sourceId: string;
  sessionId: string;
  actorExternalId: string | null;
  pnJid: string | null;
  lidJid: string | null;
  firstMessageText: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  seenCount: number;
};

export type WhatsappAdLeadStatsResponse = {
  items: WhatsappAdLeadStatsItem[];
  leads: WhatsappAdLeadRow[];
  total: number;
};

export type FcaMarketplaceLeadStatsItem = {
  sourceId: string;
  uniqueSessions: number;
  seenCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  title: string | null;
  description: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
};

export type FcaMarketplaceLeadRow = {
  sourceId: string;
  sessionId: string;
  actorExternalId: string | null;
  firstMessageText: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  seenCount: number;
};

export type FcaMarketplaceLeadStatsResponse = {
  items: FcaMarketplaceLeadStatsItem[];
  leads: FcaMarketplaceLeadRow[];
  total: number;
};

export type SalesAnalysis = {
  id: string;
  sessionId: string;
  leadType: string;
  ageRange: string;
  sex: string;
  customerType: string;
  purchaseIntent: string;
  result: string;
  planContracted: string | null;
  saleType: string | null;
  lossReason: string | null;
  verbalizationTags: string[];
  verbalizationText: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SalesAnalysisUpdate = Partial<Omit<SalesAnalysis, "id" | "sessionId" | "createdAt" | "updatedAt">>;
