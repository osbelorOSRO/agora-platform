import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequierePermiso } from '../decorators/permiso.decorator';

@Controller('api/permisos')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequierePermiso('editar_configuracion')
export class PermisosController {
  constructor(private readonly service: PermisosService) {}

  @Get()
  obtenerPermisos() {
    return this.service.obtenerPermisos();
  }
}
