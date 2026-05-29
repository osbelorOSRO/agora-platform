import { Module } from '@nestjs/common';
import { MetaInboxThreadModule } from './meta-inbox-thread.module';
import { BaileysModule } from '../baileys/baileys.module';
import { FcaModule } from '../fca/fca.module';
import { MinioModule } from '../minio/minio.module';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { MetaGraphApiService } from './services/meta-graph-api.service';
import { META_GRAPH_GATEWAY } from './interfaces/meta-graph-api-gateway.interface';
import { AudioConversionService } from './services/audio-conversion.service';
import { MediaSendService } from './services/media-send.service';
import { MessageSendService } from './services/message-send.service';

@Module({
  imports: [
    MetaInboxThreadModule,
    BaileysModule,
    FcaModule,
    MinioModule,
    WebsocketNotifierModule,
  ],
  providers: [
    MetaGraphApiService,
    { provide: META_GRAPH_GATEWAY, useExisting: MetaGraphApiService },
    AudioConversionService,
    MediaSendService,
    MessageSendService,
  ],
  exports: [
    MessageSendService,
    MediaSendService,
    MetaGraphApiService,
    META_GRAPH_GATEWAY,
  ],
})
export class MetaInboxMessagingModule {}
