// src/core/whatsapp/types.ts

export interface CoreIncomingMessage {
  raw: unknown; // evento completo de Baileys
}

export interface CoreConnectionUpdate {
  connection?: string;
  lastDisconnect?: unknown;
  qr?: string;
}

export type CoreConnectionStatus =
  | 'connecting'
  | 'open'
  | 'close'
  | undefined;
