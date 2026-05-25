import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { CreateShortcutDto } from './dto/create-shortcut.dto';
import { UpdateShortcutDto } from './dto/update-shortcut.dto';
import { ShortcutService } from './shortcut.service';

@Controller('shortcut')
@UseGuards(PanelJwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class ShortcutController {
  constructor(private readonly service: ShortcutService) {}

  @Post()
  create(@Body() dto: CreateShortcutDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.service.findOne(uuid);
  }

  @Put(':uuid')
  update(@Param('uuid') uuid: string, @Body() dto: UpdateShortcutDto) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    return this.service.remove(uuid);
  }
}
