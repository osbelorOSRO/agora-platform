import { Module } from '@nestjs/common';
import { CacheConfigModule } from '../cache/cache.module';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { MetaInboxSchemaService } from './services/meta-inbox-schema.service';
import { ThreadEventService } from './services/thread-event.service';
import { ThreadService } from './services/thread.service';
import { THREAD_GATEWAY } from './interfaces/thread-gateway.interface';

@Module({
  imports: [CacheConfigModule, WebsocketNotifierModule],
  providers: [
    MetaInboxSchemaService,
    ThreadEventService,
    ThreadService,
    { provide: THREAD_GATEWAY, useExisting: ThreadService },
  ],
  exports: [
    MetaInboxSchemaService,
    ThreadEventService,
    ThreadService,
    THREAD_GATEWAY,
  ],
})
export class MetaInboxThreadModule {}
