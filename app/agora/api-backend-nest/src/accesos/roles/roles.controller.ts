import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { RolesService } from './roles.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { CreateRolDto } from './dto/create-rol.dto';

@Controller('api/roles')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('editar_configuracion')
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
  crearRol(@Body() body: CreateRolDto, @Req() req: Request) {
    return this.service.crearRol(
      body.nombre,
      body.permisos,
      req.userPayload?.id,
    );
  }

  @Put(':id')
  actualizarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateRolDto,
    @Req() req: Request,
  ) {
    return this.service.actualizarRol(
      id,
      body.nombre,
      body.permisos,
      req.userPayload?.id,
    );
  }
}
