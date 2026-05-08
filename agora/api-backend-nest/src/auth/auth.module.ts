import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VaultService } from './vault.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PanelJwtAuthGuard } from './panel-jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService,VaultService,JwtAuthGuard,PanelJwtAuthGuard],
  exports: [AuthService, PanelJwtAuthGuard],
})
export class AuthModule {}
