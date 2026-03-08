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


async function bootstrap() {
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

  function clearReconnectTimer(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function scheduleRestart(
    delayMs: number,
    reason: string,
    options?: { refreshAuthState?: boolean; resetAuth?: boolean }
  ): void {
    clearReconnectTimer();
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
    }, delayMs);
  }

  gateway.onConnectionUpdate((update) => {
    const connection = update.connection;
    const code = (update.lastDisconnect as any)?.error?.output?.statusCode;
    const phase = gateway.getPhase();

    if (connection === 'open') {
      gateway.setPhase('CONNECTED');
      pairingAttempts = 0;
      connectedRetries = 0;
      clearReconnectTimer();

      runtimeState.setConnection('open');
      runtimeState.setNumero(gateway.getSocket().user?.id?.split(':')[0] ?? null);
      runtimeState.markConexionOpen();

      console.log('✅ WhatsApp conectado');
      return;
    }

    if (connection !== 'close') return;

    console.log(`🚨 CLOSE: ${code ?? 'sin-codigo'} | phase=${phase}`);

    // PAIRING: reintento ciego (como pediste)
    if (phase === 'PAIRING') {
      pairingAttempts++;
      const delay = Math.min(20000, 2000 * pairingAttempts);
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
      // Reinicia en modo pairing para forzar nuevo QR.
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
      const delay = Math.min(30000, 3000 * connectedRetries);
      scheduleRestart(delay, `CONNECTED red ${code}`);
      return;
    }

    connectedRetries++;
    scheduleRestart(5000, `CONNECTED fallback ${code ?? 'N/A'}`);
  });

  server.listen(env.port, '0.0.0.0', () => {
    console.log(`📡 Servidor escuchando en puerto ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Error crítico al iniciar aplicación:', err);
  process.exit(1);
});
