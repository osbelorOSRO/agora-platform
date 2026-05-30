import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MinioModule } from '../minio/minio.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { BaileysInternalTokenGuard } from '../shared/guards/baileys-internal-token.guard';

@Module({
  imports: [MinioModule, AuthModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    PrismaService,
    RequirePermissionGuard,
    N8nAuthGuard,
    BaileysInternalTokenGuard,
  ],
})
export class MediaModule {}
