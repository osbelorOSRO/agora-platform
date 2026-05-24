import { Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private socket: Socket;

  constructor() {
    const wsServer = process.env.WS_SERVER;
    if (!wsServer) {
      throw new Error('Missing required env WS_SERVER');
    }

    this.socket = io(wsServer, {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      this.logger.log('Conectado al WebSocket del panel');
    });

    this.socket.on('connect_error', (err) => {
      this.logger.error(`Error de conexión al WebSocket: ${err.message}`);
    });
  }

  getSocket(): Socket {
    return this.socket;
  }
}

export const socketService = new SocketService();
