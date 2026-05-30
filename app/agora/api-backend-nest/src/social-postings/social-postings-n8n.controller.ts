import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { N8nResultadoDto } from './dto/n8n-resultado.dto';
import { SocialPostingsService } from './social-postings.service';

@ApiTags('Social Postings N8N')
@Controller('social-postings/n8n')
@UseGuards(N8nAuthGuard)
@UseInterceptors(TransformInterceptor)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class SocialPostingsN8nController {
  constructor(private readonly service: SocialPostingsService) {}

  @Get('pendientes-hoy')
  getPendientesHoy() {
    return this.service.getPendientesHoy();
  }

  @Patch(':id/resultado')
  registrarResultado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: N8nResultadoDto,
  ) {
    return this.service.registrarResultado(id, dto);
  }
}
