import { Module } from '@nestjs/common';
import { MetaInboxController } from './meta-inbox.controller';
import { MetaInboxService } from './meta-inbox.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';

@Module({
  imports: [WebsocketNotifierModule],
  controllers: [MetaInboxController],
  providers: [MetaInboxService, PrismaService],
  exports: [MetaInboxService],
})
export class MetaInboxModule {}
