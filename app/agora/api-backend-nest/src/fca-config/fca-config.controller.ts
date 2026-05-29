import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { RequirePermission } from '../accesos/decorators/permission.decorator';
import { UpdateFcaConfigDto } from './dto/update-fca-config.dto';
import { FcaConfigService } from './fca-config.service';

@ApiTags('Configuración FCA')
@ApiBearerAuth('panel-jwt')
@Controller('fca-config')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('gestion_integraciones')
@UseInterceptors(TransformInterceptor)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class FcaConfigController {
  constructor(private readonly service: FcaConfigService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Get('reveal/:field')
  async reveal(@Param('field') field: string) {
    const value = await this.service.reveal(field);
    return { value };
  }

  @Get('mqtt-status')
  getMqttStatus() {
    return this.service.getMqttStatus() ?? { mqtt_connected: null };
  }

  @Patch()
  update(@Body() dto: UpdateFcaConfigDto) {
    return this.service.upsert(dto);
  }
}
