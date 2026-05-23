import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { RolesService } from './roles.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequierePermiso } from '../decorators/permiso.decorator';

@Controller('api/roles')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequierePermiso('editar_configuracion')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  obtenerRoles() {
    return this.service.obtenerRoles();
  }

  @Get(':id')
  obtenerRolPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerRolPorId(id);
  }

  @Post()
  @HttpCode(201)
  crearRol(@Body() body: any, @Req() req: Request) {
    return this.service.crearRol(body.nombre, body.permisos, (req as any).userPayload?.id);
  }

  @Put(':id')
  actualizarRol(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: Request) {
    return this.service.actualizarRol(id, body.nombre, body.permisos, (req as any).userPayload?.id);
  }
}
