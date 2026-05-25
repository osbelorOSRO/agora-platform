import { Module } from '@nestjs/common';
import { BaileysSenderService } from './baileys-sender.service';
import { BaileysIngressController } from './baileys-ingress.controller';
import { BaileysIngressService } from './baileys-ingress.service';
import { QueuesModule } from '../queues/queues.module';
import { BaileysInternalTokenGuard } from '../shared/guards/baileys-internal-token.guard';
import { MESSAGE_GATEWAY } from './interfaces/message-gateway.interface';

@Module({
  imports: [QueuesModule],
  controllers: [BaileysIngressController],
  providers: [
    BaileysIngressService,
    BaileysSenderService,
    BaileysInternalTokenGuard,
    { provide: MESSAGE_GATEWAY, useExisting: BaileysSenderService },
  ],
  exports: [BaileysSenderService, BaileysIngressService, MESSAGE_GATEWAY],
})
export class BaileysModule {}
