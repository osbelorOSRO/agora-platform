import { io, Socket } from 'socket.io-client';
import { jwtService } from '../auth/jwt.service.js';
import { logger } from '../../shared/logger.js';
import { env } from '../../config/env.js';

let socketBot: Socket | null = null;
let salaHumano: string | null = null;
let connectingPromise: Promise<void> | null = null;

let refreshTimer: NodeJS.Timeout | null = null;
let isRefreshing = false;
let currentToken: string | null = null;
let currentSocketSecret: string | null = null;

const decodeExpMs = (token: string): number => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  return Number(payload?.exp || 0) * 1000;
};

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

const programarRenovacion = (token: string) => {
  clearRefreshTimer();
  const expMs = decodeExpMs(token);
  const renewAt = Math.max(Date.now() + 10_000, expMs - 5 * 60_000); // 5 min antes
  const delay = renewAt - Date.now();

  refreshTimer = setTimeout(async () => {
    try {
      await renovarTokenYReconectar('timer');
    } catch (err) {
      logger.error('Error renovando token por timer', err);
    }
  }, delay);
};

const renovarTokenYReconectar = async (motivo: string) => {
  if (!socketBot || isRefreshing) return;
  isRefreshing = true;
  try {
    const nuevoToken = await jwtService.signBotToken();
    currentToken = nuevoToken;

    socketBot.auth = {
      token: currentToken,
      secret: currentSocketSecret,
    };

    logger.warn(`Renovando token socket bot (${motivo})`);
    socketBot.disconnect();
    socketBot.connect();

    programarRenovacion(nuevoToken);
  } finally {
    isRefreshing = false;
  }
};

export const conectarSocketBot = async (): Promise<void> => {
  if (socketBot && socketBot.connected) return;
  if (connectingPromise) return connectingPromise;

  connectingPromise = new Promise(async (resolve, reject) => {
    try {
      currentToken = await jwtService.signBotToken();
      currentSocketSecret = await jwtService.getSocketSecret();

      socketBot = io(env.wsPanelUrl, {
        auth: {
          token: currentToken,
          secret: currentSocketSecret,
        },
        transports: ['websocket'],
        reconnection: true,
      });

      socketBot.once('connect', () => {
        logger.info('Bot conectado al WebSocket externo');
        connectingPromise = null;
        if (currentToken) programarRenovacion(currentToken);
        resolve();
      });

      socketBot.on('conexion_autorizada', (payload: any) => {
        if (payload?.usuario_id) {
          salaHumano = `usuario_${payload.usuario_id}`;
          socketBot?.emit('joinRoom', salaHumano);
          logger.info(`Bot unido a sala humano: ${salaHumano}`);
        }
      });

      socketBot.on('disconnect', (reason) => {
        logger.warn(`WebSocket externo desconectado: ${reason}`);
      });

      socketBot.on('connect_error', async (err: any) => {
        const msg = String(err?.message || '').toLowerCase();
        logger.error('Error conexión WebSocket externo', err);

        if (msg.includes('jwt') || msg.includes('token') || msg.includes('expired')) {
          await renovarTokenYReconectar('connect_error');
        }
      });

    } catch (error) {
      connectingPromise = null;
      reject(error);
    }
  });

  return connectingPromise;
};

export const getSocketBot = (): Socket => {
  if (!socketBot) throw new Error('Socket externo no inicializado');
  return socketBot;
};

export const getSalaHumano = (): string | null => salaHumano;
