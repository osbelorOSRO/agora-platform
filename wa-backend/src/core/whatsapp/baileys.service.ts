import makeWASocket, {
  WASocket,
  fetchLatestWaWebVersion,
  AuthenticationState,
} from '@whiskeysockets/baileys';

export class BaileysService {
  private socket: WASocket | null = null;

  async create(
    authState: AuthenticationState,
    onCredsUpdate?: () => Promise<void> | void
  ): Promise<WASocket> {
    const { version } = await fetchLatestWaWebVersion();

    this.socket = makeWASocket({
      version,
      auth: authState,
      browser: ['Chrome', 'Chrome', '122'],
      connectTimeoutMs: 60000,
      getMessage: async () => undefined,
    });

    if (onCredsUpdate) {
      this.socket.ev.on('creds.update', onCredsUpdate);
    }

    return this.socket;
  }

  getSocket(): WASocket {
    if (!this.socket) throw new Error('WhatsApp socket not initialized');
    return this.socket;
  }

  async dispose(): Promise<void> {
    if (!this.socket) return;
    try {
      this.socket.ev.removeAllListeners('messages.upsert');
      this.socket.ev.removeAllListeners('connection.update');
      this.socket.ev.removeAllListeners('creds.update');
      this.socket.ws?.close();
    } catch {
      // noop
    } finally {
      this.socket = null;
    }
  }
}
