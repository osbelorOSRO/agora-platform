import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SuperadminJwtGuard } from '../auth/superadmin-jwt.guard';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OffersService } from './offers.service';

@Controller('offers')
@UseGuards(SuperadminJwtGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class OffersController {
  constructor(private readonly service: OffersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':codigo')
  findOne(@Param('codigo') codigo: string) {
    return this.service.findOne(codigo);
  }

  @Post()
  create(@Body() dto: CreateOfferDto) {
    return this.service.create(dto);
  }

  @Patch(':codigo')
  update(@Param('codigo') codigo: string, @Body() dto: UpdateOfferDto) {
    return this.service.update(codigo, dto);
  }

  @Delete(':codigo')
  remove(@Param('codigo') codigo: string) {
    return this.service.remove(codigo);
  }
}
