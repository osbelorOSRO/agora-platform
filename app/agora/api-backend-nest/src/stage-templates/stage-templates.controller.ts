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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SuperadminJwtGuard } from '../auth/superadmin-jwt.guard';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto';
import { StageTemplatesService } from './stage-templates.service';

@Controller('stage-templates')
@UseGuards(SuperadminJwtGuard)
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStageTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
