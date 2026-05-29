import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { TransformInterceptor } from '../../core/interceptors/transform.interceptor';
import { PermissionsService } from './permissions.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Permisos')
@ApiBearerAuth('panel-jwt')
@Controller('api/permisos')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@UseInterceptors(TransformInterceptor)
@RequirePermission('editar_configuracion')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  obtenerPermisos() {
    return this.service.obtenerPermisos();
  }
}
