import { Module } from '@nestjs/common';
import { BaileysSenderService } from './baileys-sender.service';
import { BaileysIngressController } from './baileys-ingress.controller';
import { BaileysIngressService } from './baileys-ingress.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [BaileysIngressController],
  providers: [
    BaileysIngressService,
    BaileysSenderService,
  ],
  exports: [BaileysSenderService, BaileysIngressService],
})
export class BaileysModule {}
