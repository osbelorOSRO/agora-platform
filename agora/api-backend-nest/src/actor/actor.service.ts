import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class ActorService {
  private readonly logger = new Logger(ActorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureActor(actorExternalId: string) {
    const existing = await this.prisma.actor_score.findUnique({
      where: { actor_external_id: actorExternalId },
    });

    if (existing) {
      return false;
    }

    this.logger.log(`Bootstrap actor ${actorExternalId}`);

    /**
     * estado base del sistema
     */
    await this.prisma.$transaction([
      this.prisma.actor_score.create({
        data: {
          actor_external_id: actorExternalId,
          score: 0,
        },
      }),

      this.prisma.actor_lifecycle.create({
        data: {
          actor_external_id: actorExternalId,
          state: 'NEW',
        },
      }),

      /**
       * señal fantasma (flujo nunca muere)
       */
      this.prisma.actor_history_score.create({
        data: {
          actor_external_id: actorExternalId,
          external_event_id: `bootstrap:${actorExternalId}`,
          score_delta: 0,
          signal_type: 'BOOTSTRAP',
        },
      }),
    ]);

    return true;
  }
}
