import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { RequirePermission } from '../accesos/decorators/permission.decorator';
import { UpdateTransitionThresholdDto } from './dto/update-transition-threshold.dto';
import { UpdateSignalDeltaDto } from './dto/update-signal-delta.dto';

@Controller('settings')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('editar_configuracion')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('transition-rules')
  listTransitionRules() {
    return this.settings.listTransitionRules();
  }

  @Patch('transition-rules/:id')
  updateTransitionThreshold(
    @Param('id') id: string,
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
    @Param('id') id: string,
    @Body() body: UpdateSignalDeltaDto,
  ) {
    return this.settings.updateSignalDelta(id, body.delta);
  }
}
