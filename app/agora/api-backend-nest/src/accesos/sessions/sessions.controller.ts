import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TransformInterceptor } from '../../core/interceptors/transform.interceptor';
import { SessionsService } from './sessions.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Autenticación')
@ApiBearerAuth('panel-jwt')
@Controller('api/auth')
@UseGuards(PanelJwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Get('me')
  me(@Req() req: Request) {
    return this.service.me(req.userPayload!.id);
  }

  @Post('registrar-sesion')
  @HttpCode(200)
  registrarSesion(@Req() req: Request) {
    const ip = req.ip ?? '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? 'desconocido';
    return this.service.registrarSesion(req.userPayload!.id, ip, userAgent);
  }

  @Get('sesiones-activas')
  sesionesActivas(@Req() req: Request) {
    return this.service.sesionesActivas(req.userPayload!.id);
  }

  @Delete('logout')
  @HttpCode(200)
  logout(@Req() req: Request) {
    return this.service.logout(req.userPayload!.id);
  }

  @Get('sesiones-activas-admin')
  @UseGuards(RequirePermissionGuard)
  @RequirePermission('gestion_conexiones')
  listarTodasSesionesActivas() {
    return this.service.listarTodasSesionesActivas();
  }

  @Delete('sesiones/:id')
  @HttpCode(200)
  @UseGuards(RequirePermissionGuard)
  @RequirePermission('gestion_conexiones')
  cerrarSesionAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.service.cerrarSesionAdmin(id);
  }
}
