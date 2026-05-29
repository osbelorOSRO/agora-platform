import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { SettingsService } from './settings.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { RequirePermission } from '../accesos/decorators/permission.decorator';
import { UpdateTransitionThresholdDto } from './dto/update-transition-threshold.dto';
import { UpdateSignalDeltaDto } from './dto/update-signal-delta.dto';

@ApiTags('Configuración General')
@ApiBearerAuth('panel-jwt')
@Controller('settings')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@UseInterceptors(TransformInterceptor)
@RequirePermission('editar_configuracion')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('transition-rules')
  listTransitionRules() {
    return this.settings.listTransitionRules();
  }

  @Patch('transition-rules/:id')
  updateTransitionThreshold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransitionThresholdDto,
  ) {
    return this.settings.updateTransitionThreshold(id, body.score_threshold);
  }

  @Get('signal-scoring-rules')
  listSignalScoringRules() {
    return this.settings.listSignalScoringRules();
  }

  @Patch('signal-scoring-rules/:id')
  updateSignalDelta(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSignalDeltaDto,
  ) {
    return this.settings.updateSignalDelta(id, body.delta);
  }
}
