import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';

@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const payload = context.switchToHttp().getRequest().userPayload;
    if (!payload) throw new ForbiddenException('No autorizado');

    const permisos: string[] = Array.isArray(payload.permisos)
      ? payload.permisos.map((p: string) => p.trim().toLowerCase())
      : [];

    if (!permisos.includes(permission.trim().toLowerCase()))
      throw new ForbiddenException('Permiso insuficiente');

    return true;
  }
}
