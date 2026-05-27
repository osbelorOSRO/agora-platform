import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SuperadminJwtGuard } from '../auth/superadmin-jwt.guard';
import { UpdateFcaConfigDto } from './dto/update-fca-config.dto';
import { FcaConfigService } from './fca-config.service';

@Controller('fca-config')
@UseGuards(SuperadminJwtGuard)
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
