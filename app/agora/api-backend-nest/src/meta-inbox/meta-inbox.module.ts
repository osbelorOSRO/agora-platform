import { Module } from '@nestjs/common';
import { MetaInboxController } from './meta-inbox.controller';
import { MetaInboxService } from './meta-inbox.service';
import { MetaInboxSchemaService } from './services/meta-inbox-schema.service';
import { ThreadService } from './services/thread.service';
import { ContactService } from './services/contact.service';
import { MessageSendService } from './services/message-send.service';
import { MediaSendService } from './services/media-send.service';
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
import { CacheConfigModule } from '../cache/cache.module';
import { FcaModule } from '../fca/fca.module';
import { META_GRAPH_GATEWAY } from './interfaces/meta-graph-api-gateway.interface';
import { THREAD_GATEWAY } from './interfaces/thread-gateway.interface';
import { META_INBOX_GATEWAY } from './interfaces/meta-inbox-gateway.interface';

@Module({
  imports: [
    WebsocketNotifierModule,
    BaileysModule,
    AuthModule,
    MinioModule,
    CacheConfigModule,
    FcaModule,
  ],
  controllers: [MetaInboxController],
  providers: [
    PrismaService,
    N8nAuthGuard,
    MetaGraphApiService,
    { provide: META_GRAPH_GATEWAY, useExisting: MetaGraphApiService },
    AudioConversionService,
    MetaInboxSchemaService,
    ThreadEventService,
    WhatsappIdentityService,
    OfferContextService,
    ThreadService,
    { provide: THREAD_GATEWAY, useExisting: ThreadService },
    ContactService,
    MediaSendService,
    MessageSendService,
    MetaInboxService,
    { provide: META_INBOX_GATEWAY, useExisting: MetaInboxService },
  ],
  exports: [MetaInboxService, META_INBOX_GATEWAY, ThreadEventService],
})
export class MetaInboxModule {}
