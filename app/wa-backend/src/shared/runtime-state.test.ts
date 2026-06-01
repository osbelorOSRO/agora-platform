import { describe, it, expect, beforeEach } from 'vitest';

// Import after clearing module state
import { runtimeState } from './runtime-state.js';

describe('RuntimeState', () => {
  beforeEach(() => {
    // Reset to initial state - set connection to open and mark
    // connection to reset
    runtimeState.setConnection(undefined);
    runtimeState.setNumero(null);
  });

  describe('setConnection / snapshotEstado', () => {
    it('conexión arranca como undefined', () => {
      const estado = runtimeState.snapshotEstado();
      expect(estado.conexion).toBeUndefined();
    });

    it('setConnection("open") cambia el estado', () => {
      runtimeState.setConnection('open');
      const estado = runtimeState.snapshotEstado();
      expect(estado.conexion).toBe('open');
    });

    it('setConnection a otro valor distinto de open resetea connectedSince', () => {
      runtimeState.setConnection('open');
      runtimeState.markConexionOpen();
      runtimeState.setConnection('close');
      const estado = runtimeState.snapshotEstado();
      expect(estado.connectedSince).toBeNull();
    });
  });

  describe('setNumero', () => {
    it('setNumero guarda y snapshot lo refleja', () => {
      runtimeState.setNumero('56912345678');
      const estado = runtimeState.snapshotEstado();
      expect(estado.numero).toBe('56912345678');
    });
  });

  describe('markIncoming / markOutgoing', () => {
    it('markIncoming incrementa contador', () => {
      const stats1 = runtimeState.snapshotStats();
      runtimeState.markIncoming();
      const stats2 = runtimeState.snapshotStats();
      expect(stats2.mensajesRecibidos).toBe(stats1.mensajesRecibidos + 1);
    });

    it('markOutgoing incrementa contador', () => {
      runtimeState.markOutgoing();
      const stats = runtimeState.snapshotStats();
      expect(stats.mensajesEnviados).toBeGreaterThanOrEqual(1);
    });
  });

  describe('uptime', () => {
    it('uptime es un número positivo', () => {
      const stats = runtimeState.snapshotStats();
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });
});
