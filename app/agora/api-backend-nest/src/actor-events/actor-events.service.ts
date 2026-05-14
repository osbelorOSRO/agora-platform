import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class ActorEventsService {
  private readonly logger = new Logger(ActorEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerEvent(jobData: any) {
    try {
      await this.prisma.event_history.create({
        data: {
          external_event_id: jobData.externalEventId,
          actor_external_id: jobData.actorExternalId,
          provider: jobData.provider,
          object_type: jobData.objectType,
          pipeline: jobData.pipeline,
          event_type: jobData.eventType,
          payload: jobData.payload,
          occurred_at: new Date(jobData.occurredAt),
        },
      });

      this.logger.log(
        `Evento registrado: ${jobData.externalEventId}`,
      );
    } catch (error: any) {
      /**
       * idempotencia DB
       * si ya existe → ignorar
       */
      if (error.code === 'P2002') {
        this.logger.warn('Evento duplicado ignorado');
        return;
      }

      throw error;
    }
  }
}
