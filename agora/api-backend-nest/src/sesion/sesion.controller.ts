// sesion.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SesionService } from './sesion.service';

@Controller('sesion')
export class SesionController {
  constructor(private readonly sesionService: SesionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async registrarEstado(@Body('activo') activo: boolean) {
    return this.sesionService.registrarEstadoBot(activo);
  }
}
