import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaWebhookHmacGuard } from './meta-webhook-hmac.guard';
import { QueuesModule } from '../../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [MetaController],
  providers: [MetaService, MetaWebhookHmacGuard],
})
export class MetaModule {}
