import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock env before importing middleware
// Paths relative to test file, matching what the module imports
vi.mock('../../../config/env.js', () => ({
  env: {
    baileysInternalToken: 'test-internal-token-123',
    logLevel: 'info',
  },
}));

vi.mock('../../../shared/logger.js', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import { authMiddleware } from './auth.middleware.js';

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers: { ...headers } } as any;
}

function makeRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite acceso con token correcto', async () => {
    const req = makeReq({ 'x-internal-token': 'test-internal-token-123' });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await authMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si el token no coincide', async () => {
    const req = makeReq({ 'x-internal-token': 'wrong-token' });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token interno inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si no se envía token', async () => {
    const req = makeReq({});
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
