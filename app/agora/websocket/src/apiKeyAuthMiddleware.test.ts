import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock VaultService before importing the middleware
vi.mock('./vaultService.js', () => {
  const MockVaultService = vi.fn();
  MockVaultService.prototype.getSecretKey = vi.fn();
  return { VaultService: MockVaultService };
});

import { apiKeyAuthMiddleware } from './apiKeyAuthMiddleware.js';

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers: { ...headers } } as any;
}

function makeRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('apiKeyAuthMiddleware', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('permite acceso con API_KEY_WS correcta desde env', async () => {
    process.env.API_KEY_WS = 'secret-key-123';
    const req = makeReq({ 'x-api-key': 'secret-key-123' });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await apiKeyAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si la API key no coincide', async () => {
    process.env.API_KEY_WS = 'secret-key-123';
    const req = makeReq({ 'x-api-key': 'wrong-key' });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await apiKeyAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si no se envía API key', async () => {
    process.env.API_KEY_WS = 'secret-key-123';
    const req = makeReq({});
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await apiKeyAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
