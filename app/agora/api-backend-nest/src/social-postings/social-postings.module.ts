import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MetaConfigModule } from '../meta-config/meta-config.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { SocialPostingsController } from './social-postings.controller';
import { SocialPostingsN8nController } from './social-postings-n8n.controller';
import { SocialPostingsService } from './social-postings.service';

@Module({
  imports: [AuthModule, MetaConfigModule],
  controllers: [SocialPostingsController, SocialPostingsN8nController],
  providers: [
    SocialPostingsService,
    PrismaService,
    RequirePermissionGuard,
    N8nAuthGuard,
  ],
})
export class SocialPostingsModule {}
