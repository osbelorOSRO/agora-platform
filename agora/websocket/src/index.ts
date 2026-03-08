import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import * as dotenv from 'dotenv';
import { handleSocketConnection, getEstadoBot } from './socketManager.js';
import { setIOInstance } from './ws.js';
import { apiKeyAuthMiddleware } from './apiKeyAuthMiddleware.js';

dotenv.config();
const PORT = process.env.PORT || 5050;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://agorast.zaldio.qzz.io,http://apist.zaldio.qzz.io')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin?.includes('100.')) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  }),
);

app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin?.includes('100.')) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
});

setIOInstance(io);

io.on('connection', (socket: Socket) => {
  handleSocketConnection(socket, io);
});

app.get('/estado-bot', (req, res) => {
  res.json({ conectado: getEstadoBot() });
});

app.post('/notify/cambio-estado', apiKeyAuthMiddleware, (req, res) => {
  const { clienteId, estadoActual, etiquetaActual, timestamp } = req.body;

  if (!clienteId || estadoActual === undefined || !etiquetaActual) {
    res.status(400).json({ error: 'clienteId, estadoActual y etiquetaActual son requeridos' });
    return;
  }

  io.to(clienteId).emit('estadoActualizado', {
    clienteId,
    estadoActual,
    etiquetaActual,
    timestamp,
  });

  res.status(200).json({ success: true, message: 'Estado actualizado' });
});

app.post('/notify/cliente-creado', apiKeyAuthMiddleware, (req, res) => {
  const { clienteId, tipoId, nombre, fotoPerfil, timestamp } = req.body;

  if (!clienteId || !tipoId || !nombre) {
    res.status(400).json({ error: 'clienteId, tipoId y nombre son requeridos' });
    return;
  }

  io.emit('clienteCreado', {
    clienteId,
    tipoId,
    nombre,
    fotoPerfil,
    timestamp,
  });

  res.status(200).json({ success: true, message: 'Cliente creado notificado' });
});

app.post('/notify/proceso-creado', apiKeyAuthMiddleware, (req, res) => {
  const { clienteId, procesoId, timestamp } = req.body;

  if (!clienteId || !procesoId) {
    res.status(400).json({ error: 'clienteId y procesoId son requeridos' });
    return;
  }

  io.to(clienteId).emit('procesoCreado', {
    clienteId,
    procesoId,
    timestamp,
  });

  res.status(200).json({ success: true, message: 'Proceso creado notificado' });
});

app.post('/notify/cambio-intervencion', apiKeyAuthMiddleware, (req, res) => {
  const { clienteId, intervenida, timestamp } = req.body;

  if (!clienteId || intervenida === undefined) {
    res.status(400).json({ error: 'clienteId e intervenida son requeridos' });
    return;
  }

  io.to(clienteId).emit('intervencionCambiada', {
    clienteId,
    intervenida,
    timestamp,
  });

  res.status(200).json({ success: true, message: 'Intervención actualizada' });
});

app.post('/notify/proceso-cerrado', apiKeyAuthMiddleware, (req, res) => {
  const { clienteId, procesoId, timestamp } = req.body;

  if (!clienteId || !procesoId) {
    res.status(400).json({ error: 'clienteId y procesoId son requeridos' });
    return;
  }

  io.to(clienteId).emit('procesoCerrado', {
    clienteId,
    procesoId,
    timestamp,
  });

  res.status(200).json({ success: true, message: 'Proceso cerrado notificado' });
});

app.post('/notify/meta-inbox/message-new', apiKeyAuthMiddleware, (req, res) => {
  io.emit('metaInboxMessageNew', req.body || {});
  res.status(200).json({ success: true });
});

app.post('/notify/meta-inbox/thread-upsert', apiKeyAuthMiddleware, (req, res) => {
  io.emit('metaInboxThreadUpsert', req.body || {});
  res.status(200).json({ success: true });
});

app.post('/notify/refrescar-clientes', apiKeyAuthMiddleware, (req, res) => {
  const { clienteId } = req.body;
  if (!clienteId) {
    res.status(400).json({ error: 'clienteId es requerido' });
    return;
  }
  io.to(clienteId).emit('refrescarClientes');
  res.status(200).json({ success: true });
});

httpServer.listen(PORT, () => {
  console.log(`✅ WebSocket escuchando en puerto ${PORT}`);
});
