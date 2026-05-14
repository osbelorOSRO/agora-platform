// src/core/whatsapp/message.handler.ts

import { WASocket } from '@whiskeysockets/baileys';
import { CoreIncomingMessage } from './types.js';

export class MessageHandler {
  constructor(private readonly socket: WASocket) {}

  onMessage(callback: (msg: CoreIncomingMessage) => void): void {
    this.socket.ev.on('messages.upsert', (event) => {
      callback({ raw: event });
    });
  }
}
