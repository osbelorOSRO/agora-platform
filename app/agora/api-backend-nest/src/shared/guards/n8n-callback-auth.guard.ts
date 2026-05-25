import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRuntimeSecret } from '../runtime-secrets';

/** Validates N8N_CALLBACK_SECRET_TOKEN, falling back to N8N_SECRET_TOKEN. */
@Injectable()
export class N8nCallbackAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided = request.headers['authorization']?.replace('Bearer ', '');

    const token =
      this.config.get<string>('N8N_CALLBACK_SECRET_TOKEN') ||
      this.config.get<string>('N8N_SECRET_TOKEN') ||
      (await getRuntimeSecret('N8N_CALLBACK_SECRET_TOKEN').catch(async () =>
        getRuntimeSecret('N8N_SECRET_TOKEN').catch(() => undefined),
      ));

    if (!token || !provided || provided !== token) {
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }
}
