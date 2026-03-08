import { WASocket } from '@whiskeysockets/baileys';
import { CoreConnectionUpdate } from './types.js';

export class ConnectionManager {
  constructor(private readonly socket: WASocket) {}

  onConnectionUpdate(callback: (update: CoreConnectionUpdate) => void): void {
    this.socket.ev.on('connection.update', (update) => {
      callback({
        connection: update.connection,
        lastDisconnect: update.lastDisconnect,
        qr: update.qr,
      });
    });
  }
}
