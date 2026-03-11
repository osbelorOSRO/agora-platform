import makeWASocket, {
  WASocket,
  fetchLatestWaWebVersion,
  AuthenticationState,
} from '@whiskeysockets/baileys';

type AppStateSyncIssueCallback = () => void;

export class BaileysService {
  private socket: WASocket | null = null;
  private lastAppStateSyncIssueAt = 0;

  async create(
    authState: AuthenticationState,
    onCredsUpdate?: () => Promise<void> | void,
    onAppStateSyncIssue?: AppStateSyncIssueCallback
  ): Promise<WASocket> {
    const { version } = await fetchLatestWaWebVersion();
    const baileysLogger = this.createBaileysLogger(onAppStateSyncIssue);

    this.socket = makeWASocket({
      version,
      auth: authState,
      browser: ['Chrome', 'Chrome', '122'],
      connectTimeoutMs: 60000,
      logger: baileysLogger as any,
      getMessage: async () => undefined,
    });

    if (onCredsUpdate) {
      this.socket.ev.on('creds.update', onCredsUpdate);
    }

    return this.socket;
  }

  private createBaileysLogger(onAppStateSyncIssue?: AppStateSyncIssueCallback) {
    const shouldSkipInfo = (message: string): boolean => {
      return [
        'uploading pre-keys',
        'uploaded pre-keys successfully',
        'pre-keys found on server',
        'Current prekey ID:',
        'Uploading PreKeys due to:',
        'handled 0 offline messages/notifications',
        'History sync is enabled, awaiting notification with a 20s timeout.',
        'Connection is now AwaitingInitialSync, buffering events',
      ].some((needle) => message.includes(needle));
    };

    const extractMessage = (args: unknown[]): string => {
      for (let i = args.length - 1; i >= 0; i -= 1) {
        const value = args[i];
        if (typeof value === 'string') return value;
      }
      return '';
    };

    const hasAppStateSyncIssue = (args: unknown[]): boolean => {
      const msg = extractMessage(args).toLowerCase();
      if (
        msg.includes('failed to sync state from version') ||
        msg.includes('failed to find key') ||
        msg.includes('decode mutation')
      ) {
        return true;
      }

      return args.some((arg) => {
        if (typeof arg === 'string') {
          const s = arg.toLowerCase();
          return s.includes('failed to find key') || s.includes('decode mutation');
        }

        if (!arg || typeof arg !== 'object') return false;
        const errorStr = String((arg as any)?.error ?? '').toLowerCase();
        return errorStr.includes('failed to find key') || errorStr.includes('decode mutation');
      });
    };

    const notifyAppStateSyncIssue = (): void => {
      if (!onAppStateSyncIssue) return;
      const now = Date.now();
      if (now - this.lastAppStateSyncIssueAt < 10_000) return;
      this.lastAppStateSyncIssueAt = now;
      onAppStateSyncIssue();
    };

    const print = (level: 'debug' | 'info' | 'warn' | 'error', args: unknown[]): void => {
      const message = extractMessage(args);
      if (level === 'info' && shouldSkipInfo(message)) return;

      if (hasAppStateSyncIssue(args)) {
        notifyAppStateSyncIssue();
      }

      if (!message) return;
      if (level === 'debug') return;
      if (level === 'info') console.log(`[BAILEYS] ${message}`);
      if (level === 'warn') console.warn(`[BAILEYS] ${message}`);
      if (level === 'error') console.error(`[BAILEYS] ${message}`);
    };

    const logger = {
      level: 'info',
      child: () => logger,
      trace: (...args: unknown[]) => print('debug', args),
      debug: (...args: unknown[]) => print('debug', args),
      info: (...args: unknown[]) => print('info', args),
      warn: (...args: unknown[]) => print('warn', args),
      error: (...args: unknown[]) => print('error', args),
      fatal: (...args: unknown[]) => print('error', args),
    };

    return logger;
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
