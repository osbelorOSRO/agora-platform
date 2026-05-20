import { Body, Controller, Get, Param, Patch, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SuperadminJwtGuard } from '../auth/superadmin-jwt.guard';
import { UpdateMetaConfigDto } from './dto/update-meta-config.dto';
import { MetaConfigService } from './meta-config.service';

@Controller('meta-config')
@UseGuards(SuperadminJwtGuard)
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
