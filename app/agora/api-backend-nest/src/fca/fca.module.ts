import { Module } from '@nestjs/common';
import { FcaIngressController } from './fca-ingress.controller';
import { FcaIngressService } from './fca-ingress.service';
import { FcaConfigInternalController } from './fca-config-internal.controller';
import { FcaSenderService } from './fca-sender.service';
import { QueuesModule } from '../queues/queues.module';
import { FcaInternalTokenGuard } from '../shared/guards/fca-internal-token.guard';
import { FcaConfigModule } from '../fca-config/fca-config.module';

@Module({
  imports: [QueuesModule, FcaConfigModule],
  controllers: [FcaIngressController, FcaConfigInternalController],
  providers: [FcaIngressService, FcaSenderService, FcaInternalTokenGuard],
  exports: [FcaSenderService],
})
export class FcaModule {}
