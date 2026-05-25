import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VaultService } from './vault.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PanelJwtAuthGuard } from './panel-jwt-auth.guard';
import { SuperadminJwtGuard } from './superadmin-jwt.guard';
import { VAULT_GATEWAY } from './interfaces/vault-gateway.interface';
import { CacheConfigModule } from '../cache/cache.module';

@Module({
  imports: [CacheConfigModule],
  controllers: [],
  providers: [
    AuthService,
    VaultService,
    { provide: VAULT_GATEWAY, useExisting: VaultService },
    JwtAuthGuard,
    PanelJwtAuthGuard,
    SuperadminJwtGuard,
  ],
  exports: [AuthService, VaultService, VAULT_GATEWAY, PanelJwtAuthGuard, SuperadminJwtGuard],
})
export class AuthModule {}
