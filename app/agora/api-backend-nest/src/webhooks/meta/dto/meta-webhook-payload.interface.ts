export interface MetaAttachment {
  type?: string;
  payload?: { url?: string };
}

export interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    app_id?: number;
    attachments?: MetaAttachment[];
  };
  delivery?: { watermark: number; mids?: string[]; seq?: number };
  read?: { watermark: number; seq?: number };
  postback?: { payload?: string; title?: string };
  reaction?: { mid?: string; action?: string; emoji?: string };
  referral?: Record<string, unknown>;
  optin?: Record<string, unknown>;
  pass_thread_control?: Record<string, unknown>;
  take_thread_control?: Record<string, unknown>;
  request_thread_control?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MetaChangeEvent {
  field: string;
  value: {
    sender_id?: string;
    from?: { id?: string };
    created_time?: number | string;
    [key: string]: unknown;
  };
}

export interface MetaWebhookEntry {
  id: string;
  time?: number;
  messaging?: MetaMessagingEvent[];
  changes?: MetaChangeEvent[];
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}
