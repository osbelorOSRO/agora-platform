import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server as IOServer } from 'socket.io';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { env } from './config/env.js';
import { createRoutes } from './interfaces/http/routes/routes.js';
import { WhatsAppGateway } from './application/whatsapp.gateway.js';
import { runtimeState } from './shared/runtime-state.js';
import { registerDashboardGateway } from './interfaces/websocket/dashboard.gateway.js';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming.usecase.js';
import { conectarSocketBot } from './infrastructure/socket/socket.client.js';

type HourBucketStats = {
  close428: number;
  close503: number;
  reconnectCount: number;
  reconnectMsTotal: number;
  reconnectMsMax: number;
};

const RECONNECT_ALERT_WINDOW_MS = 15 * 60_000;
const RECONNECT_ALERT_THRESHOLD = 8;
const RECONNECT_COOLDOWN_MS = 2 * 60_000;
const APP_STATE_SYNC_RESET_COOLDOWN_MS = 30 * 60_000;
const APP_STATE_SYNC_GRACE_MS = 90_000;
const APP_STATE_SYNC_WINDOW_MS = 45_000;
const APP_STATE_SYNC_THRESHOLD = 3;
const HOURLY_STATS_RETENTION = 72;

function sanitizeSensitiveSignalLogs(): void {
  const globalPatchFlag = globalThis as { __waSignalLogPatched?: boolean };
  if (globalPatchFlag.__waSignalLogPatched) return;

  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);

  console.info = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';

    if (
      first === 'Closing session:' ||
      first === 'Opening session:' ||
      first === 'Removing old closed session:'
    ) {
      const entry = args[1] as any;
      const baseKeyType = entry?.indexInfo?.baseKeyType ?? 'N/A';
      const isClosed = entry?.indexInfo?.closed !== -1;
      console.log(`[WA-SIGNAL] ${first.replace(':', '')} baseKeyType=${baseKeyType} closed=${isClosed}`);
      return;
    }

    originalInfo(...args as Parameters<typeof console.info>);
  };

  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (
      (first === 'Session already closed' || first === 'Session already open') &&
      args.length > 1
    ) {
      originalWarn(`[WA-SIGNAL] ${first}`);
      return;
    }

    originalWarn(...args as Parameters<typeof console.warn>);
  };

  globalPatchFlag.__waSignalLogPatched = true;
}

function hourBucketKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 13);
}

function createEmptyHourBucket(): HourBucketStats {
  return {
    close428: 0,
    close503: 0,
    reconnectCount: 0,
    reconnectMsTotal: 0,
    reconnectMsMax: 0,
  };
}

function backoffExp(attempt: number, baseMs: number, maxMs: number): number {
  const effectiveAttempt = Math.max(1, attempt);
  const raw = baseMs * Math.pow(2, effectiveAttempt - 1);
  return Math.min(maxMs, raw);
}

function withJitter(delayMs: number): number {
  const factor = 0.85 + Math.random() * 0.30; // 0.85x - 1.15x
  return Math.max(1000, Math.round(delayMs * factor));
}

async function bootstrap() {
  sanitizeSensitiveSignalLogs();

  const app = express();

  app.use(express.json({ limit: '50mb', strict: false }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  app.set('trust proxy', env.trustProxy);
  app.use(express.static(path.join(process.cwd(), 'public')));

  app.get('/ui', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const { state, saveCreds } = await useMultiFileAuthState(env.authFolder);
  const gateway = new WhatsAppGateway();
  await gateway.initialize(state, saveCreds, env.authFolder);
  await conectarSocketBot();

  // ==========================
  // Incoming messages hook
  // ==========================
  const handleIncoming = new HandleIncomingMessageUseCase(gateway);
  gateway.onMessage(async (msg) => {
    try {
      runtimeState.markIncoming();
      await handleIncoming.execute(msg);
    } catch (err) {
      console.error('❌ Error processing incoming message:', err);
    }
  });

  app.use(createRoutes(gateway));

  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: '*' } });

  registerDashboardGateway(io, gateway);

  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isReconnecting = false;
  let pairingAttempts = 0;
  let connectedRetries = 0;
  let reconnectStartedAt: number | null = null;
  let reconnectCooldownUntil = 0;
  let appStateResets = 0;
  let lastAppStateResetAt = 0;
  let lastConnectionOpenAt = 0;
  const reconnectEvents: number[] = [];
  const appStateMismatchEvents: number[] = [];
  const hourlyStats = new Map<string, HourBucketStats>();

  function ensureHourBucket(ts = Date.now()): HourBucketStats {
    const key = hourBucketKey(ts);
    let bucket = hourlyStats.get(key);

    if (!bucket) {
      bucket = createEmptyHourBucket();
      hourlyStats.set(key, bucket);

      while (hourlyStats.size > HOURLY_STATS_RETENTION) {
        const oldestKey = hourlyStats.keys().next().value as string | undefined;
        if (!oldestKey) break;
        hourlyStats.delete(oldestKey);
      }
    }

    return bucket;
  }

  function pruneReconnectEvents(now = Date.now()): void {
    while (reconnectEvents.length > 0 && now - reconnectEvents[0] > RECONNECT_ALERT_WINDOW_MS) {
      reconnectEvents.shift();
    }
  }

  function registerCloseMetric(code?: number): void {
    const bucket = ensureHourBucket();
    if (code === 428) bucket.close428 += 1;
    if (code === 503) bucket.close503 += 1;
  }

  function registerReconnectDuration(durationMs: number): void {
    const bucket = ensureHourBucket();
    bucket.reconnectCount += 1;
    bucket.reconnectMsTotal += durationMs;
    bucket.reconnectMsMax = Math.max(bucket.reconnectMsMax, durationMs);
  }

  function pruneAppStateMismatchEvents(now = Date.now()): void {
    while (
      appStateMismatchEvents.length > 0 &&
      now - appStateMismatchEvents[0] > APP_STATE_SYNC_WINDOW_MS
    ) {
      appStateMismatchEvents.shift();
    }
  }

  function clearReconnectTimer(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function scheduleRestart(
    delayMs: number,
    reason: string,
    options?: { refreshAuthState?: boolean; resetAuth?: boolean; resetAppStateSync?: boolean }
  ): void {
    clearReconnectTimer();
    const now = Date.now();

    pruneReconnectEvents(now);

    if (reconnectEvents.length > RECONNECT_ALERT_THRESHOLD) {
      reconnectCooldownUntil = Math.max(reconnectCooldownUntil, now + RECONNECT_COOLDOWN_MS);
      console.warn(
        `⚠️ Reconexiones altas (${reconnectEvents.length}/${RECONNECT_ALERT_WINDOW_MS / 60000}m). Cooldown ${RECONNECT_COOLDOWN_MS / 1000}s`
      );
    }

    const cooldownWait = reconnectCooldownUntil > now ? reconnectCooldownUntil - now : 0;
    const effectiveDelay = withJitter(Math.max(delayMs, cooldownWait));

    console.log(`⏳ Restart programado (${reason}) en ${Math.round(effectiveDelay / 1000)}s`);

    reconnectTimeout = setTimeout(async () => {
      if (isReconnecting) return;
      isReconnecting = true;
      try {
        console.log(`🔄 Restart (${reason})`);
        await gateway.restart(options);
      } catch (err) {
        console.error('❌ Error en restart:', err);
      } finally {
        isReconnecting = false;
      }
    }, effectiveDelay);
  }

  gateway.onAppStateSyncIssue(() => {
    const now = Date.now();

    if (lastConnectionOpenAt > 0 && now - lastConnectionOpenAt < APP_STATE_SYNC_GRACE_MS) {
      console.warn('⚠️ App-state mismatch detectado durante ventana de gracia post-login; se observa sin reset');
      return;
    }

    appStateMismatchEvents.push(now);
    pruneAppStateMismatchEvents(now);

    if (appStateMismatchEvents.length < APP_STATE_SYNC_THRESHOLD) {
      console.warn(
        `⚠️ App-state mismatch detectado (${appStateMismatchEvents.length}/${APP_STATE_SYNC_THRESHOLD}); esperando confirmación antes de reset`
      );
      return;
    }

    if (now - lastAppStateResetAt < APP_STATE_SYNC_RESET_COOLDOWN_MS) {
      console.warn('⚠️ App-state mismatch detectado, pero en cooldown de reset');
      return;
    }

    lastAppStateResetAt = now;
    appStateResets += 1;
    appStateMismatchEvents.length = 0;

    console.warn('⚠️ App-state mismatch detectado. Se agenda reset controlado de sync keys');
    scheduleRestart(2500, 'APP_STATE_SYNC_MISMATCH', {
      refreshAuthState: true,
      resetAppStateSync: true,
    });
  });

  app.get('/health/wa', (_req, res) => {
    pruneReconnectEvents();
    const bucket = hourlyStats.get(hourBucketKey()) || createEmptyHourBucket();
    const reconnectAvgMs =
      bucket.reconnectCount > 0
        ? Math.round(bucket.reconnectMsTotal / bucket.reconnectCount)
        : 0;

    res.status(200).json({
      ok: true,
      reconnectWindow: {
        windowMs: RECONNECT_ALERT_WINDOW_MS,
        count: reconnectEvents.length,
        threshold: RECONNECT_ALERT_THRESHOLD,
      },
      cooldownUntil:
        reconnectCooldownUntil > Date.now()
          ? new Date(reconnectCooldownUntil).toISOString()
          : null,
      currentHour: {
        close428: bucket.close428,
        close503: bucket.close503,
        reconnectCount: bucket.reconnectCount,
        reconnectAvgMs,
        reconnectMaxMs: bucket.reconnectMsMax,
      },
      appStateSyncResets: appStateResets,
    });
  });

  gateway.onConnectionUpdate((update) => {
    const connection = update.connection;
    const code = (update.lastDisconnect as any)?.error?.output?.statusCode;
    const phase = gateway.getPhase();

    if (connection === 'open') {
      gateway.setPhase('CONNECTED');
      pairingAttempts = 0;
      connectedRetries = 0;
      clearReconnectTimer();
      lastConnectionOpenAt = Date.now();
      appStateMismatchEvents.length = 0;

      if (reconnectStartedAt !== null) {
        registerReconnectDuration(Date.now() - reconnectStartedAt);
        reconnectStartedAt = null;
      }

      runtimeState.setConnection('open');
      runtimeState.setNumero(gateway.getSocket().user?.id?.split(':')[0] ?? null);
      runtimeState.markConexionOpen();

      console.log('✅ WhatsApp conectado');
      return;
    }

    if (connection !== 'close') return;

    if (reconnectStartedAt === null) reconnectStartedAt = Date.now();
    reconnectEvents.push(Date.now());
    pruneReconnectEvents();
    registerCloseMetric(code);

    console.log(`🚨 CLOSE: ${code ?? 'sin-codigo'} | phase=${phase}`);

    // PAIRING: reintento con backoff exponencial + jitter
    if (phase === 'PAIRING') {
      pairingAttempts++;
      const delay = backoffExp(pairingAttempts, 2000, 60000);
      console.log(`🔁 PAIRING retry ${pairingAttempts} en ${delay / 1000}s`);
      scheduleRestart(delay, `PAIRING code=${code ?? 'N/A'}`, {
        refreshAuthState: true,
        resetAuth: code === 401,
      });
      return;
    }

    // CONNECTED: reglas por codigo
    if (code === 401) {
      console.warn('⚠️ 401 en CONNECTED -> volver a PAIRING');
      gateway.setPhase('PAIRING');
      pairingAttempts = 0;
      connectedRetries = 0;
      scheduleRestart(1000, 'CONNECTED 401 -> PAIRING', {
        refreshAuthState: true,
        resetAuth: true,
      });
      return;
    }

    if (code === 515) {
      scheduleRestart(1000, 'CONNECTED 515');
      return;
    }

    if ([408, 428, 500, 503].includes(code)) {
      connectedRetries++;
      const delay = backoffExp(connectedRetries, 3000, 120000);
      scheduleRestart(delay, `CONNECTED red ${code}`);
      return;
    }

    connectedRetries++;
    scheduleRestart(backoffExp(connectedRetries, 5000, 90000), `CONNECTED fallback ${code ?? 'N/A'}`);
  });

  server.listen(env.port, '0.0.0.0', () => {
    console.log(`📡 Servidor escuchando en puerto ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Error crítico al iniciar aplicación:', err);
  process.exit(1);
});
