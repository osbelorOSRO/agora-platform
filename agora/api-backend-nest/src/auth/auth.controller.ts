import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

@Controller()
export class AuthController {
  @UseGuards(JwtAuthGuard)
  @Get('protegida')
  rutaProtegida(@Req() req: Request) {
    return {
      mensaje: 'Acceso autorizado ✅',
      usuario: req.user,
    };
  }
}
