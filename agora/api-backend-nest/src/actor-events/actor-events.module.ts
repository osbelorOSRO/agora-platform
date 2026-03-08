import { Module } from '@nestjs/common';
import { ActorEventsService } from './actor-events.service';
import { PrismaService } from '../database/prisma/prisma.service';

@Module({
  imports: [],
  providers: [
    ActorEventsService,
    PrismaService,
  ],
  exports: [ActorEventsService],

})
export class ActorEventsModule {}
