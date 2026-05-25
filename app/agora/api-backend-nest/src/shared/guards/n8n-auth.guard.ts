import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRuntimeSecret } from '../runtime-secrets';

@Injectable()
export class N8nAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const provided = request.headers['authorization']?.replace('Bearer ', '');

    const token =
      this.config.get<string>('N8N_SECRET_TOKEN') ||
      (await getRuntimeSecret('N8N_SECRET_TOKEN').catch(() => undefined));

    if (!provided || provided !== token) {
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }
}
