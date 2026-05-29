import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { RequirePermission } from '../accesos/decorators/permission.decorator';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto';
import { StageTemplatesService } from './stage-templates.service';

@ApiTags('Etapas')
@ApiBearerAuth('panel-jwt')
@Controller('stage-templates')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('gestion_integraciones')
@UseInterceptors(TransformInterceptor)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class StageTemplatesController {
  constructor(private readonly service: StageTemplatesService) {}

  @Get()
  findAll(@Query('stageActual') stageActual?: string) {
    return this.service.findAll(stageActual);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStageTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStageTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
