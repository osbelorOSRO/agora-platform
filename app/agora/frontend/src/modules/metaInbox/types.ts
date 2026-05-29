import type { MetaInboxMessage, MetaInboxThread } from "@/types/metaInbox";

export type InboxRealtimePayload = Partial<MetaInboxThread> &
  Partial<MetaInboxMessage> & {
    sessionId?: string;
  };
