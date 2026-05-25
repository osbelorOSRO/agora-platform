import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RequireRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const payload = context.switchToHttp().getRequest().userPayload;
    if (!payload) throw new ForbiddenException('No autorizado');

    const userRol = (payload.rol ?? '').trim().toLowerCase();
    const allowed = new Set(roles.map((r) => r.trim().toLowerCase()));

    if (!allowed.has(userRol)) throw new ForbiddenException('Acceso denegado');
    return true;
  }
}
