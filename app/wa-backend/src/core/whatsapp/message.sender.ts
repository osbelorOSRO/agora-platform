// src/core/whatsapp/message.sender.ts

import { WASocket, AnyMessageContent } from '@whiskeysockets/baileys';

export class MessageSender {
  constructor(private readonly socket: WASocket) {}

  async send(to: string, content: AnyMessageContent): Promise<void> {
    await this.socket.sendMessage(to, content);
  }
}
