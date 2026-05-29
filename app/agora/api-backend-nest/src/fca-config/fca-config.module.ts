import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheConfigModule } from '../cache/cache.module';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { FcaConfigController } from './fca-config.controller';
import { FcaConfigService } from './fca-config.service';

@Module({
  imports: [AuthModule, CacheConfigModule],
  controllers: [FcaConfigController],
  providers: [FcaConfigService, RequirePermissionGuard],
  exports: [FcaConfigService],
})
export class FcaConfigModule {}
