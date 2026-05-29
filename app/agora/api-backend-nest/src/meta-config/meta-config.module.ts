import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheConfigModule } from '../cache/cache.module';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { MetaConfigController } from './meta-config.controller';
import { MetaConfigService } from './meta-config.service';

@Module({
  imports: [AuthModule, CacheConfigModule],
  controllers: [MetaConfigController],
  providers: [MetaConfigService, RequirePermissionGuard],
  exports: [MetaConfigService],
})
export class MetaConfigModule {}
