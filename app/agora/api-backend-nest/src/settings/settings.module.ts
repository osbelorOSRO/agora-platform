import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService, RequirePermissionGuard],
})
export class SettingsModule {}
