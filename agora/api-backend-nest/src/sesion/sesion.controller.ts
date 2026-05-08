// sesion.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SesionService } from './sesion.service';
import { SesionEstadoDto } from './dto/sesion-estado.dto';

@Controller('sesion')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class SesionController {
  constructor(private readonly sesionService: SesionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async registrarEstado(@Body() body: SesionEstadoDto) {
    return this.sesionService.registrarEstadoBot(body.activo);
  }
}
