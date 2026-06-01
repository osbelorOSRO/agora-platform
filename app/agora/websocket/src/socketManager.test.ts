import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Server, Socket } from 'socket.io';

// Mock tokenVerifier before importing socketManager
vi.mock('./tokenVerifier.js', () => ({
  verifyTokenBot: vi.fn(),
  verifyTokenHuman: vi.fn(),
}));

import {
  getEstadoBot,
  setEstadoBot,
  handleSocketConnection,
} from './socketManager.js';

function makeMockSocket(): Partial<Socket> {
  return {
    handshake: { auth: {} },
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
    disconnect: vi.fn(),
    id: 'test-socket-1',
  };
}

function makeMockIO(): Partial<Server> {
  return {
    to: vi.fn(() => ({ emit: vi.fn() })) as any,
    emit: vi.fn(),
  };
}

describe('socketManager', () => {
  describe('getEstadoBot / setEstadoBot', () => {
    it('getEstadoBot retorna false por defecto', () => {
      expect(getEstadoBot()).toBe(false);
    });

    it('setEstadoBot(true) cambia el estado', () => {
      setEstadoBot(true);
      expect(getEstadoBot()).toBe(true);
    });

    it('setEstadoBot(false) vuelve a false', () => {
      setEstadoBot(true);
      setEstadoBot(false);
      expect(getEstadoBot()).toBe(false);
    });
  });

  describe('handleSocketConnection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('desconecta socket si no hay token', async () => {
      const socket = makeMockSocket();
      const io = makeMockIO();

      await handleSocketConnection(socket as any as Socket, io as any as Server);

      expect(socket.emit).toHaveBeenCalledWith('error', 'Token no enviado');
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('desconecta socket si el token tiene payload inválido', async () => {
      const socket = makeMockSocket();
      socket.handshake.auth.token = 'invalid-token';
      const io = makeMockIO();

      await handleSocketConnection(socket as any as Socket, io as any as Server);

      expect(socket.emit).toHaveBeenCalledWith('error', 'Token inválido');
      expect(socket.disconnect).toHaveBeenCalled();
    });
  });
});
