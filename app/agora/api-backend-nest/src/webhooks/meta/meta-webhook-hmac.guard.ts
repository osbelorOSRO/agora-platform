import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

@Injectable()
export class MetaWebhookHmacGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.rawBody;

    if (!signature?.startsWith('sha256=') || !rawBody?.length) {
      throw new UnauthorizedException('Firma Meta requerida');
    }

    const appSecret = await getRuntimeSecret('META_APP_SECRET');
    const expected = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = signature.slice('sha256='.length);

    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException('Firma Meta inválida');
    }

    return true;
  }
}
