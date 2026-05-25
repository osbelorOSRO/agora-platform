import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebsocketNotifierService } from './websocket-notifier.service';
import { WEBSOCKET_NOTIFIER_GATEWAY } from './interfaces/websocket-notifier-gateway.interface';

@Module({
  imports: [HttpModule],
  providers: [
    WebsocketNotifierService,
    { provide: WEBSOCKET_NOTIFIER_GATEWAY, useExisting: WebsocketNotifierService },
  ],
  exports: [WebsocketNotifierService, WEBSOCKET_NOTIFIER_GATEWAY],
})
export class WebsocketNotifierModule {}

