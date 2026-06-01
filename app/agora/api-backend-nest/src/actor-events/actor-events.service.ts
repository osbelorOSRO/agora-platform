import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  provider_type,
  meta_object_type,
  pipeline_type,
} from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

/** Envelope canónico de un evento entrante a registrar en event_history. */
export interface ActorEventInput {
  externalEventId: string;
  actorExternalId: string;
  provider: string;
  objectType: string;
  pipeline: string;
  eventType: string;
  payload: unknown;
  occurredAt: string | Date;
}

@Injectable()
export class ActorEventsService {
  private readonly logger = new Logger(ActorEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerEvent(jobData: ActorEventInput) {
    try {
      await this.prisma.event_history.create({
        data: {
          external_event_id: jobData.externalEventId,
          actor_external_id: jobData.actorExternalId,
          // Casts en el boundary de Prisma: los valores ya vienen validados por
          // @IsIn en los DTOs de envelope; aquí solo se afina el tipo a los enums.
          provider: jobData.provider as provider_type,
          object_type: jobData.objectType as meta_object_type,
          pipeline: jobData.pipeline as pipeline_type,
          event_type: jobData.eventType,
          // El tipo Json de Prisma (InputJsonValue) es demasiado estricto para `unknown`.
          payload: jobData.payload as Prisma.InputJsonValue,
          occurred_at: new Date(jobData.occurredAt),
        },
      });

      this.logger.log(`Evento registrado: ${jobData.externalEventId}`);
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
