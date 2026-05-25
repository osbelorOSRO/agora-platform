import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

type TerminalCheck = {
  isTerminal: boolean;
  state: 'NEW' | 'CHURNED' | 'QUALIFIED' | 'BLOCKED' | null;
};

@Injectable()
export class ActorScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getLifecycleState(
    tx: Prisma.TransactionClient,
    actorExternalId: string,
  ): Promise<TerminalCheck> {
    const last = await tx.actor_lifecycle.findFirst({
      where: { actor_external_id: actorExternalId },
      orderBy: { occurred_at: 'desc' },
      select: { state: true },
    });

    const state = last?.state ?? null;
    const isTerminal = state === 'QUALIFIED' || state === 'BLOCKED';

    return { state, isTerminal };
  }

  /**
   * Inserta delta idempotente (por external_event_id).
   * Solo debe llamarse si NO terminal.
   */
  async applyDeltaIfNew(
    tx: Prisma.TransactionClient,
    input: {
      actorExternalId: string;
      externalEventId: string;
      delta: string; // Decimal as string
      signalType: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const inserted = await tx.actor_history_score
      .create({
        data: {
          actor_external_id: input.actorExternalId,
          external_event_id: input.externalEventId,
          score_delta: input.delta,
          signal_type: input.signalType,
          metadata: input.metadata as Prisma.InputJsonObject | undefined,
        },
        select: { id: true },
      })
      .then(() => true)
      .catch((e: Error & { code?: string }) => {
        if (e?.code !== 'P2002') throw e;
        return false; // unique ya existe → delta ya aplicado
      });

    if (!inserted) return { inserted: false };

    // si delta = 0 igual dejamos consistencia del snapshot (increment 0 es ok)
    await tx.actor_score.upsert({
      where: { actor_external_id: input.actorExternalId },
      create: { actor_external_id: input.actorExternalId, score: input.delta },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        score: { increment: input.delta as any }, // Prisma Decimal acepta string en PG pero el tipo no lo refleja
      },
    });

    return { inserted: true };
  }
}
