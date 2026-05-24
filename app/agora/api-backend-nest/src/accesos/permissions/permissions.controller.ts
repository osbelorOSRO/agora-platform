import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';

@Controller('api/permisos')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('editar_configuracion')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  obtenerPermisos() {
    return this.service.obtenerPermisos();
  }
}
