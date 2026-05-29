import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [AuthModule],
  controllers: [OffersController],
  providers: [OffersService, PrismaService, RequirePermissionGuard],
})
export class OffersModule {}
