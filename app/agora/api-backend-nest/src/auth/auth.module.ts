import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VaultService } from './vault.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PanelJwtAuthGuard } from './panel-jwt-auth.guard';
import { SuperadminJwtGuard } from './superadmin-jwt.guard';

@Module({
  controllers: [],
  providers: [AuthService, VaultService, JwtAuthGuard, PanelJwtAuthGuard, SuperadminJwtGuard],
  exports: [AuthService, VaultService, PanelJwtAuthGuard, SuperadminJwtGuard],
})
export class AuthModule {}
