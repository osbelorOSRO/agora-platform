import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { AccesosAuthService } from './accesos-auth.service';

@Controller('api/auth')
export class AccesosAuthController {
  constructor(private readonly service: AccesosAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: any, @Req() req: Request) {
    const ip = req.ip ?? '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? 'desconocido';
    return this.service.login(body.username, body.password, body.token_2fa, ip, userAgent);
  }

  @Post('registrar-usuario')
  @HttpCode(201)
  registrarUsuario(@Body() body: any) {
    return this.service.registrarUsuario(body.username, body.invitationToken, body.password, body.confirmarPassword);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: any) {
    return this.service.resetPassword(body.username, body.resetToken, body.newPassword, body.confirmarPassword);
  }

  @Post('setup-2fa/init')
  @HttpCode(200)
  setup2FAInit(@Body() body: any) {
    return this.service.setup2FAInit(body.username, body.password, body.bypassToken);
  }

  @Post('setup-2fa/confirmar')
  @HttpCode(200)
  setup2FAConfirmar(@Body() body: any) {
    return this.service.setup2FAConfirmar(body.username, body.bypassToken, body.totpCode);
  }
}
