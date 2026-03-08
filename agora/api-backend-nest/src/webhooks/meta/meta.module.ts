import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { QueuesModule } from '../../queues/queues.module';

@Module({
  imports: [
    QueuesModule,
  ],
  controllers: [MetaController],
  providers: [MetaService],
})
export class MetaModule {}
