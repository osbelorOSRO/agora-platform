import { Module } from '@nestjs/common';
import { MetaInboxController } from './meta-inbox.controller';
import { MetaInboxService } from './meta-inbox.service';
import { MetaInboxSchemaService } from './services/meta-inbox-schema.service';
import { ThreadService } from './services/thread.service';
import { ContactService } from './services/contact.service';
import { MessageSendService } from './services/message-send.service';
import { OfferContextService } from './services/offer-context.service';
import { WhatsappIdentityService } from './services/whatsapp-identity.service';
import { ThreadEventService } from './services/thread-event.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { BaileysModule } from '../baileys/baileys.module';
import { AuthModule } from '../auth/auth.module';
import { MinioModule } from '../minio/minio.module';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { MetaGraphApiService } from './services/meta-graph-api.service';
import { AudioConversionService } from './services/audio-conversion.service';

@Module({
  imports: [WebsocketNotifierModule, BaileysModule, AuthModule, MinioModule],
  controllers: [MetaInboxController],
  providers: [
    PrismaService,
    N8nAuthGuard,
    MetaGraphApiService,
    AudioConversionService,
    MetaInboxSchemaService,
    ThreadEventService,
    WhatsappIdentityService,
    OfferContextService,
    ThreadService,
    ContactService,
    MessageSendService,
    MetaInboxService,
  ],
  exports: [MetaInboxService, ThreadEventService],
})
export class MetaInboxModule {}
