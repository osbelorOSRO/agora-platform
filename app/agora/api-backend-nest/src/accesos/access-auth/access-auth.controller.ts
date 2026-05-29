import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request as Req } from '@nestjs/common';
import type { Request } from 'express';
import { AccessAuthService } from './access-auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Setup2FAInitDto } from './dto/setup-2fa-init.dto';
import { Setup2FAConfirmDto } from './dto/setup-2fa-confirm.dto';

@ApiTags('Autenticación')
@Controller('api/auth')
export class AccessAuthController {
  constructor(private readonly service: AccessAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto, @Req() req: Request) {
    const ip = req.ip ?? '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? 'desconocido';
    return this.service.login(
      body.username,
      body.password,
      body.token_2fa,
      ip,
      userAgent,
    );
  }

  @Post('registrar-usuario')
  @HttpCode(201)
  registrarUsuario(@Body() body: RegisterUserDto) {
    return this.service.registrarUsuario(
      body.username,
      body.invitationToken,
      body.password,
      body.confirmarPassword,
    );
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.service.resetPassword(
      body.username,
      body.resetToken,
      body.newPassword,
      body.confirmarPassword,
    );
  }

  @Post('setup-2fa/init')
  @HttpCode(200)
  setup2FAInit(@Body() body: Setup2FAInitDto) {
    return this.service.setup2FAInit(
      body.username,
      body.password,
      body.bypassToken,
    );
  }

  @Post('setup-2fa/confirmar')
  @HttpCode(200)
  setup2FAConfirmar(@Body() body: Setup2FAConfirmDto) {
    return this.service.setup2FAConfirmar(
      body.username,
      body.bypassToken,
      body.totpCode,
    );
  }
}
