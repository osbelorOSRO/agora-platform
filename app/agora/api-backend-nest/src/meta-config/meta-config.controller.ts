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
import { UpdateMetaConfigDto } from './dto/update-meta-config.dto';
import { MetaConfigService } from './meta-config.service';

@ApiTags('Configuración Meta')
@ApiBearerAuth('panel-jwt')
@Controller('meta-config')
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
export class MetaConfigController {
  constructor(private readonly service: MetaConfigService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Get('reveal/:field')
  async reveal(@Param('field') field: string) {
    const value = await this.service.reveal(field);
    return { value };
  }

  @Patch()
  update(@Body() dto: UpdateMetaConfigDto) {
    return this.service.upsert(dto);
  }
}
