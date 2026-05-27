import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Validates the x-internal-token header against FCA_INTERNAL_TOKEN. */
@Injectable()
export class FcaInternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const provided = request.headers['x-internal-token'];

    const expected =
      this.config.get<string>('FCA_INTERNAL_TOKEN') ||
      process.env.FCA_INTERNAL_TOKEN;

    if (!expected?.trim()) {
      throw new ForbiddenException('Token interno no configurado');
    }
    if (!provided || provided !== expected) {
      throw new ForbiddenException('Token interno inválido');
    }
    return true;
  }
}
