// eslint-disable-next-line @typescript-eslint/no-require-imports
const login = require('@dongdev/fca-unofficial');

import { fetchFcaConfig, postFcaStatus } from '../infrastructure/backend-api.client';
import { HandleIncomingUseCase } from './use-cases/handle-incoming.usecase';
import { SendMessageUseCase } from './use-cases/send-message.usecase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FcaApi = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MqttEmitter = any;

const FCA_OPTIONS = {
  listenEvents: false,
  selfListen: false,
  autoReconnect: true,
  emitReady: true,
  logLevel: 'warn' as const,
};

const MQTT_CYCLE_MS = 30 * 60 * 1000; // 30 minutos — por debajo del idle-timeout de ~50 min de Facebook

export class FacebookGateway {
  private api: FcaApi | null = null;
  private mqtt: MqttEmitter | null = null;
  private sendUseCase: SendMessageUseCase | null = null;
  private myUserID: string | null = null;
  private cycleTimer: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    const config = await this.fetchConfigWithRetry();

    if (!config.app_state) {
      console.warn('[FCA] No hay app_state configurado — Facebook no conectado');
      return;
    }

    if (config.enabled !== 'true') {
      console.warn('[FCA] Integración deshabilitada (enabled != true)');
      return;
    }

    let appState: unknown[];
    try {
      appState = JSON.parse(config.app_state);
    } catch {
      console.error('[FCA] app_state inválido — no es JSON válido');
      return;
    }

    await this.loginAndListen(appState);
  }

  private fetchConfigWithRetry(maxAttempts = 8): Promise<{
    app_state: string | null;
    enabled: string;
    fb_backend_url: string | null;
  }> {
    return new Promise((resolve, reject) => {
      let attempt = 0;

      const tryFetch = async () => {
        attempt++;
        try {
          const config = await fetchFcaConfig();
          resolve(config);
        } catch (err) {
          if (attempt >= maxAttempts) {
            reject(err);
            return;
          }
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
          console.warn(`[FCA] Config fetch fallido (intento ${attempt}/${maxAttempts}), retry en ${delay / 1000}s`);
          setTimeout(tryFetch, delay);
        }
      };

      void tryFetch();
    });
  }

  private loginAndListen(appState: unknown[]): Promise<void> {
    return new Promise((resolve, reject) => {
      login(
        { appState },
        FCA_OPTIONS,
        (err: unknown, api: FcaApi) => {
          if (err) {
            console.error('[FCA] Login fallido:', err);
            reject(err);
            return;
          }

          this.api = api;
          this.myUserID = api.getCurrentUserID() as string;
          this.sendUseCase = new SendMessageUseCase(api);

          console.log(`[FCA] Login exitoso uid=${this.myUserID}`);

          this.startMqttListener();
          this.startCycleTimer();
          resolve();
        },
      );
    });
  }

  private startMqttListener(): void {
    if (!this.api) return;

    if (this.mqtt) {
      this.mqtt.removeAllListeners();
    }

    this.mqtt = this.api.listenMqtt() as MqttEmitter;

    this.mqtt.on('ready', () => {
      console.log('[FCA] MQTT conectado (ready event)');
      void this.reportStatus();
    });

    this.mqtt.on('message', async (event: unknown) => {
      if (!this.myUserID) return;
      try {
        const handler = new HandleIncomingUseCase(this.myUserID, this.api);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await handler.execute(event as any);
      } catch (err) {
        console.error('[FCA] Error procesando mensaje:', err);
      }
    });

    this.mqtt.on('error', (err: unknown) => {
      // fca-unofficial emite { type: 'ready', error: null } como 'error' al conectar con emitReady:true
      const e = err as { type?: string; error?: unknown };
      if (e?.type === 'ready' && e?.error === null) {
        console.log('[FCA] MQTT conectado');
        void this.reportStatus();
        return;
      }
      console.error('[FCA] MQTT error:', err);
    });
  }

  private startCycleTimer(): void {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
    }
    this.cycleTimer = setInterval(() => {
      if (!this.api) return;
      console.log('[FCA] Ciclo MQTT preventivo (30 min) — reconectando...');
      const stop = this.api.stopListening as ((cb?: () => void) => void) | undefined;
      if (typeof stop === 'function') {
        stop(() => {
          setTimeout(() => this.startMqttListener(), 2000);
        });
      } else {
        this.startMqttListener();
      }
    }, MQTT_CYCLE_MS);
  }

  private async reportStatus(): Promise<void> {
    if (!this.api || !this.myUserID) return;

    try {
      // Resolve display name
      const userInfoMap = await new Promise<Record<string, { name?: string }>>((resolve, reject) => {
        this.api.getUserInfo([this.myUserID], (err: unknown, info: Record<string, { name?: string }>) => {
          if (err) reject(err);
          else resolve(info);
        });
      });

      const name = userInfoMap[this.myUserID!]?.name || '';
      await postFcaStatus({ fb_user_id: this.myUserID!, fb_user_name: name });
      console.log(`[FCA] Status reportado uid=${this.myUserID} name="${name}"`);
    } catch (err) {
      console.error('[FCA] No se pudo reportar status:', err);
    }
  }

  async sendMessage(threadID: string, text: string): Promise<unknown> {
    if (!this.sendUseCase) {
      throw new Error('FCA no está conectado — sendMessage no disponible');
    }
    return this.sendUseCase.execute(threadID, text);
  }

  async sendAttachment(threadID: string, mediaUrl: string, caption?: string): Promise<unknown> {
    if (!this.sendUseCase) {
      throw new Error('FCA no está conectado — sendAttachment no disponible');
    }
    return this.sendUseCase.executeWithAttachment(threadID, mediaUrl, caption);
  }

  async getThreadInfo(threadID: string): Promise<Record<string, unknown>> {
    if (!this.api) throw new Error('FCA no está conectado');
    return new Promise((resolve, reject) => {
      this.api.getThreadInfo(threadID, (err: unknown, info: unknown) => {
        if (err) reject(err);
        else resolve(info as Record<string, unknown>);
      });
    });
  }

  isConnected(): boolean {
    return this.api !== null;
  }
}
