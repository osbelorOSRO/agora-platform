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
import { CreatePosteoDto } from './dto/create-posteo.dto';
import { UpdatePosteoDto } from './dto/update-posteo.dto';
import { SocialPostingsService } from './social-postings.service';

@ApiTags('Social Postings')
@ApiBearerAuth('panel-jwt')
@Controller('social-postings')
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
export class SocialPostingsController {
  constructor(private readonly service: SocialPostingsService) {}

  @Get('calendario')
  getCalendario(@Query('mes') mes: string) {
    const mesParam = mes ?? new Date().toISOString().slice(0, 7);
    return this.service.getCalendario(mesParam);
  }

  @Post()
  create(@Body() dto: CreatePosteoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePosteoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
