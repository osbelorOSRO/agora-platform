import { describe, it, expect } from 'vitest';
import { Server } from 'socket.io';
import { createServer } from 'http';

import { setIOInstance, getIOInstance } from './ws.js';

describe('ws', () => {
  it('setIOInstance almacena la instancia y getIOInstance la devuelve', () => {
    const httpServer = createServer();
    const io = new Server(httpServer);

    setIOInstance(io);
    const result = getIOInstance();

    expect(result).toBe(io);
    httpServer.close();
  });
});
