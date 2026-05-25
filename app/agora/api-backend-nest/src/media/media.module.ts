import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MinioModule } from '../minio/minio.module';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { BaileysInternalTokenGuard } from '../shared/guards/baileys-internal-token.guard';

@Module({
  imports: [MinioModule],
  controllers: [MediaController],
  providers: [MediaService, N8nAuthGuard, BaileysInternalTokenGuard],
})
export class MediaModule {}
