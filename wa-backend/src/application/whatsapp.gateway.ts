import { AuthenticationState, WASocket } from '@whiskeysockets/baileys';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import {
  BaileysService,
  ConnectionManager,
  MessageHandler,
  MessageSender,
  CoreIncomingMessage,
  CoreConnectionUpdate,
} from '../core/whatsapp/index.js';

export type IncomingMessageCallback = (msg: CoreIncomingMessage) => void;
export type ConnectionUpdateCallback = (update: CoreConnectionUpdate) => void;
export type GatewayPhase = 'PAIRING' | 'CONNECTED';
export type RestartOptions = {
  refreshAuthState?: boolean;
  resetAuth?: boolean;
  resetAppStateSync?: boolean;
};

export class WhatsAppGateway {
  private baileysService: BaileysService;
  private connectionManager?: ConnectionManager;
  private messageHandler?: MessageHandler;
  private messageSender?: MessageSender;

  private onIncomingMessageCbs: IncomingMessageCallback[] = [];
  private onConnectionUpdateCbs: ConnectionUpdateCallback[] = [];
  private onAppStateSyncIssueCbs: Array<() => void> = [];
  private authState?: AuthenticationState;
  private saveCreds?: () => Promise<void> | void;
  private authFolder = 'auth';
  private phase: GatewayPhase = 'PAIRING';

  constructor() {
    this.baileysService = new BaileysService();
  }

  async initialize(
    authState: AuthenticationState,
    saveCreds?: () => Promise<void> | void,
    authFolder = 'auth'
  ): Promise<void> {
    this.authState = authState;
    this.saveCreds = saveCreds;
    this.authFolder = authFolder;

    const socket = await this.baileysService.create(
      authState,
      saveCreds,
      () => this.notifyAppStateSyncIssue()
    );

    this.connectionManager = new ConnectionManager(socket);
    this.messageHandler = new MessageHandler(socket);
    this.messageSender = new MessageSender(socket);

    this.registerInternalListeners();
  }

  public onMessage(callback: IncomingMessageCallback): void {
    this.onIncomingMessageCbs.push(callback);
  }

  public onConnectionUpdate(callback: ConnectionUpdateCallback): void {
    this.onConnectionUpdateCbs.push(callback);
  }

  public onAppStateSyncIssue(callback: () => void): void {
    this.onAppStateSyncIssueCbs.push(callback);
  }

  public async sendMessage(to: string, content: any): Promise<void> {
    if (!this.messageSender) throw new Error('WhatsAppGateway not initialized');
    await this.messageSender.send(to, content);
  }

  public getSocket(): WASocket {
    return this.baileysService.getSocket();
  }

  public async restart(options: RestartOptions = {}): Promise<void> {
    if (!this.authState) throw new Error('WhatsAppGateway not initialized');
    await this.baileysService.dispose();
    await new Promise((r) => setTimeout(r, 800));

    if (options.resetAuth) {
      const { readdir, rm, mkdir } = await import('node:fs/promises');
      await mkdir(this.authFolder, { recursive: true });
      const entries = await readdir(this.authFolder);
      await Promise.all(
        entries.map((entry) =>
          rm(`${this.authFolder}/${entry}`, { recursive: true, force: true })
        )
      );
    }
    else if (options.resetAppStateSync) {
      const { readdir, rm, mkdir } = await import('node:fs/promises');
      await mkdir(this.authFolder, { recursive: true });
      const entries = await readdir(this.authFolder);
      const syncEntries = entries.filter((entry) =>
        entry.startsWith('app-state-sync-key-') ||
        entry.startsWith('app-state-sync-version-')
      );

      await Promise.all(
        syncEntries.map((entry) =>
          rm(`${this.authFolder}/${entry}`, { recursive: true, force: true })
        )
      );
    }

    if (options.refreshAuthState || options.resetAuth) {
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
      this.authState = state;
      this.saveCreds = saveCreds;
    }

    await this.initialize(this.authState, this.saveCreds, this.authFolder);
  }

  public async logout(): Promise<void> {
    await this.baileysService.getSocket().logout();
  }

  public getPhase(): GatewayPhase {
    return this.phase;
  }

  public setPhase(phase: GatewayPhase): void {
    this.phase = phase;
  }

  private registerInternalListeners(): void {
    if (!this.connectionManager || !this.messageHandler) return;

    this.connectionManager.onConnectionUpdate((update) => {
      if (update.connection === 'open') this.phase = 'CONNECTED';
      if (update.connection === 'close' && this.phase !== 'PAIRING') {
        // se mantiene hasta que main decida cambiar a PAIRING
      }
      for (const cb of this.onConnectionUpdateCbs) cb(update);
    });

    this.messageHandler.onMessage((msg) => {
      for (const cb of this.onIncomingMessageCbs) cb(msg);
    });
  }

  private notifyAppStateSyncIssue(): void {
    for (const cb of this.onAppStateSyncIssueCbs) cb();
  }
}
