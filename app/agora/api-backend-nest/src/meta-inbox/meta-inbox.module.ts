import { Module } from '@nestjs/common';
import { MetaInboxController } from './meta-inbox.controller';
import { MetaInboxService } from './meta-inbox.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { BaileysModule } from '../baileys/baileys.module';
import { AuthModule } from '../auth/auth.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [WebsocketNotifierModule, BaileysModule, AuthModule, MinioModule],
  controllers: [MetaInboxController],
  providers: [MetaInboxService, PrismaService],
  exports: [MetaInboxService],
})
export class MetaInboxModule {}
