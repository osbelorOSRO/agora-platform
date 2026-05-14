import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebsocketNotifierService } from './websocket-notifier.service';

@Module({
  imports: [HttpModule],
  providers: [WebsocketNotifierService],
  exports: [WebsocketNotifierService],
})
export class WebsocketNotifierModule {}

