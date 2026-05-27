import express from 'express';
import { env } from './config/env';
import { FacebookGateway } from './application/facebook.gateway';

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const gateway = new FacebookGateway();

  app.get('/health', (_req, res) => {
    res.json({ ok: true, connected: gateway.isConnected() });
  });

  app.post('/enviar-mensaje', async (req, res) => {
    const token = req.headers['x-internal-token'];
    if (!token || token !== env.fcaInternalToken) {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }

    if (!gateway.isConnected()) {
      res.status(503).json({ error: 'FCA no conectado' });
      return;
    }

    const { threadID, text } = req.body as { threadID?: string; text?: string };
    if (!threadID || !text) {
      res.status(400).json({ error: 'threadID y text son requeridos' });
      return;
    }

    try {
      const result = await gateway.sendMessage(threadID, text);
      res.json({ ok: true, result });
    } catch (err) {
      console.error('[FB-BACKEND] Error enviando mensaje:', err);
      res.status(500).json({ error: 'No se pudo enviar el mensaje' });
    }
  });

  app.post('/enviar-adjunto', async (req, res) => {
    const token = req.headers['x-internal-token'];
    if (!token || token !== env.fcaInternalToken) {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }

    if (!gateway.isConnected()) {
      res.status(503).json({ error: 'FCA no conectado' });
      return;
    }

    const { threadID, mediaUrl, caption } = req.body as {
      threadID?: string;
      mediaUrl?: string;
      caption?: string;
    };
    if (!threadID || !mediaUrl) {
      res.status(400).json({ error: 'threadID y mediaUrl son requeridos' });
      return;
    }

    try {
      const result = await gateway.sendAttachment(threadID, mediaUrl, caption);
      res.json({ ok: true, result });
    } catch (err) {
      console.error('[FB-BACKEND] Error enviando adjunto:', err);
      res.status(500).json({ error: 'No se pudo enviar el adjunto' });
    }
  });

  app.get('/thread-info/:threadID', async (req, res) => {
    const token = req.headers['x-internal-token'];
    if (!token || token !== env.fcaInternalToken) {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }
    if (!gateway.isConnected()) {
      res.status(503).json({ error: 'FCA no conectado' });
      return;
    }
    try {
      const info = await gateway.getThreadInfo(req.params.threadID);
      res.json(info);
    } catch (err) {
      console.error('[FB-BACKEND] Error obteniendo thread info:', err);
      res.status(500).json({ error: 'No se pudo obtener thread info' });
    }
  });

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`[FB-BACKEND] Servidor en puerto ${env.port}`);
  });

  // Connect to Facebook after server is up (non-blocking)
  gateway.connect().catch((err) => {
    console.error('[FB-BACKEND] Error al conectar Facebook:', err);
  });
}

bootstrap().catch((err) => {
  console.error('[FB-BACKEND] Error crítico:', err);
  process.exit(1);
});
