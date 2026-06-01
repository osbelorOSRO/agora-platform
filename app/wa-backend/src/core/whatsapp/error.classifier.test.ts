import { describe, it, expect } from 'vitest';
import {
  classifyConnectionError,
  ConnectionErrorType,
} from './error.classifier.js';

describe('classifyConnectionError', () => {
  it('retorna DESCONOCIDO si code es undefined', () => {
    const result = classifyConnectionError(undefined);
    expect(result.tipo).toBe(ConnectionErrorType.DESCONOCIDO);
    expect(result.codigo).toBeUndefined();
  });

  it('retorna DESCONOCIDO si code es null', () => {
    const result = classifyConnectionError(null as any);
    expect(result.tipo).toBe(ConnectionErrorType.DESCONOCIDO);
  });

  it('retorna RED_TEMPORAL para código 428', () => {
    const result = classifyConnectionError(428);
    expect(result.tipo).toBe(ConnectionErrorType.RED_TEMPORAL);
    expect(result.codigo).toBe(428);
  });

  it('retorna RED_TEMPORAL para código 408', () => {
    expect(classifyConnectionError(408).tipo).toBe(ConnectionErrorType.RED_TEMPORAL);
  });

  it('retorna RED_TEMPORAL para código 500', () => {
    expect(classifyConnectionError(500).tipo).toBe(ConnectionErrorType.RED_TEMPORAL);
  });

  it('retorna RED_TEMPORAL para código 503', () => {
    expect(classifyConnectionError(503).tipo).toBe(ConnectionErrorType.RED_TEMPORAL);
  });

  it('retorna SESION_INVALIDA para código 401', () => {
    const result = classifyConnectionError(401);
    expect(result.tipo).toBe(ConnectionErrorType.SESION_INVALIDA);
    expect(result.codigo).toBe(401);
  });

  it('retorna SESION_INVALIDA para código 440', () => {
    expect(classifyConnectionError(440).tipo).toBe(ConnectionErrorType.SESION_INVALIDA);
  });

  it('retorna SESION_INVALIDA para código 515', () => {
    expect(classifyConnectionError(515).tipo).toBe(ConnectionErrorType.SESION_INVALIDA);
  });

  it('retorna CUENTA_BLOQUEADA para código 403', () => {
    const result = classifyConnectionError(403);
    expect(result.tipo).toBe(ConnectionErrorType.CUENTA_BLOQUEADA);
    expect(result.codigo).toBe(403);
  });

  it('retorna ERROR_TECNICO para código 405', () => {
    const result = classifyConnectionError(405);
    expect(result.tipo).toBe(ConnectionErrorType.ERROR_TECNICO);
    expect(result.codigo).toBe(405);
  });

  it('retorna DESCONOCIDO para códigos no mapeados', () => {
    const result = classifyConnectionError(999);
    expect(result.tipo).toBe(ConnectionErrorType.DESCONOCIDO);
    expect(result.codigo).toBe(999);
  });
});
