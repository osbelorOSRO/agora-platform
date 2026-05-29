import { createHmac } from 'crypto';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

jest.mock('../../shared/runtime-secrets', () => ({
  getRuntimeSecret: jest.fn(),
}));

import { MetaWebhookHmacGuard } from './meta-webhook-hmac.guard';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

const APP_SECRET = 'test-app-secret';

function makeContext(
  signature: string | undefined,
  rawBody: Buffer | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { 'x-hub-signature-256': signature },
        rawBody,
      }),
    }),
  } as unknown as ExecutionContext;
}

function validSig(body: Buffer): string {
  return (
    'sha256=' + createHmac('sha256', APP_SECRET).update(body).digest('hex')
  );
}

describe('MetaWebhookHmacGuard', () => {
  let guard: MetaWebhookHmacGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    (getRuntimeSecret as jest.Mock).mockResolvedValue(APP_SECRET);
    guard = new MetaWebhookHmacGuard();
  });

  it('retorna true con firma HMAC válida', async () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    await expect(
      guard.canActivate(makeContext(validSig(body), body)),
    ).resolves.toBe(true);
  });

  it('lanza 401 cuando no hay header de firma', async () => {
    const body = Buffer.from('payload');
    await expect(
      guard.canActivate(makeContext(undefined, body)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza 401 cuando rawBody está vacío', async () => {
    await expect(
      guard.canActivate(makeContext('sha256=abc123', undefined)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza 401 cuando la firma no empieza con sha256=', async () => {
    const body = Buffer.from('payload');
    await expect(
      guard.canActivate(makeContext('md5=abcdef1234', body)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza 401 cuando la firma es incorrecta', async () => {
    const body = Buffer.from('payload');
    const wrongSig = 'sha256=' + 'a'.repeat(64);
    await expect(
      guard.canActivate(makeContext(wrongSig, body)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza 401 cuando la firma tiene longitud incorrecta', async () => {
    const body = Buffer.from('payload');
    await expect(
      guard.canActivate(makeContext('sha256=abc', body)),
    ).rejects.toThrow(UnauthorizedException);
  });
});
