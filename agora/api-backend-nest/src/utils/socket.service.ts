import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(process.env.WS_SERVER || 'http://panel_websocket:5050', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('[WS] ✅ Conectado al WebSocket del panel');
    });

    this.socket.on('connect_error', (err) => {
      console.error('[WS] ❌ Error de conexión al WebSocket:', err.message);
    });
  }

  getSocket(): Socket {
    return this.socket;
  }
}

export const socketService = new SocketService();
