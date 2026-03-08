import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ActorBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asegura existencia del actor y un estado mínimo NEW.
   * NO encola transición.
   *
   * Regla: bootstrap ocurre DESPUÉS de actor-events (event_history)
   * y ANTES de cualquier procesamiento del pipeline.
   */
  async ensureActorExists(tx: PrismaService, actorExternalId: string) {
    // ¿ya existe lifecycle?
    const exists = await tx.actor_lifecycle.findFirst({
      where: { actor_external_id: actorExternalId },
      select: { id: true },
    });

    if (exists) return { created: false };

    // Estado base
    await tx.actor_lifecycle.create({
      data: {
        actor_external_id: actorExternalId,
        state: 'NEW',
      },
    });

    // Snapshot score base (idempotente por PK)
    await tx.actor_score.upsert({
      where: { actor_external_id: actorExternalId },
      create: { actor_external_id: actorExternalId, score: '0' },
      update: {},
    });

    // Señal fantasma delta=0 (idempotente por unique external_event_id)
    await tx.actor_history_score
      .create({
        data: {
          actor_external_id: actorExternalId,
          external_event_id: `bootstrap:${actorExternalId}`,
          score_delta: '0',
          signal_type: 'bootstrap',
          metadata: { reason: 'actor_birth' },
        },
      })
      .catch(() => {
        // unique ya existe → ok
      });

    return { created: true };
  }
}
