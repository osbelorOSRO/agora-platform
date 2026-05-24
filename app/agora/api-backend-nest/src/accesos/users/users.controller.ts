import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';

@Controller('api/auth')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('editar_configuracion')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post('preregistrar-usuario')
  @HttpCode(201)
  preregistrarUsuario(@Body() body: any, @Req() req: Request) {
    return this.service.preregistrarUsuario(body.username, body.rolId, (req as any).userPayload?.id ?? null);
  }

  @Get('usuarios')
  obtenerUsuarios() {
    return this.service.obtenerUsuarios();
  }

  @Patch('usuarios/:id')
  actualizarUsuario(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.actualizarUsuario(id, body);
  }

  @Post('usuarios/:id/reset-password')
  @HttpCode(200)
  adminResetPassword(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.adminResetPassword(id, (req as any).userPayload?.id);
  }

  @Post('usuarios/:id/reset-2fa')
  @HttpCode(200)
  reset2FA(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.reset2FA(id, (req as any).userPayload?.id);
  }

  @Post('usuarios/:id/desbloquear')
  @HttpCode(200)
  desbloquear(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.desbloquear(id, (req as any).userPayload?.id);
  }

  @Post('usuarios/:id/regenerar-invitacion')
  @HttpCode(200)
  regenerarInvitacion(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.regenerarInvitacion(id, (req as any).userPayload?.id);
  }

  @Delete('usuarios/:id/preregistro')
  @HttpCode(200)
  cancelarPreregistro(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.cancelarPreregistro(id, (req as any).userPayload?.id);
  }
}
