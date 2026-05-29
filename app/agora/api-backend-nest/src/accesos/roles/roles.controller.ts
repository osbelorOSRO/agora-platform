import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  UseInterceptors,
} from '@nestjs/common';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { TransformInterceptor } from '../../core/interceptors/transform.interceptor';
import { RolesService } from './roles.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { CreateRolDto } from './dto/create-rol.dto';

@ApiTags('Roles')
@ApiBearerAuth('panel-jwt')
@Controller('api/roles')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@UseInterceptors(TransformInterceptor)
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
